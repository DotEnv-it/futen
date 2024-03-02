import { Server as BunServer, ServerWebSocket } from 'bun'
import { Middleware, runMiddleware } from './middleware'
import { cleanPath } from './util'

enum WebSocketEvents {
  message = 'message',
  open = 'open',
  close = 'close',
  drain = 'drain',
  error = 'error'
}
type WebSocketEventString = keyof typeof WebSocketEvents
const WebSocketEventKeys = Object.keys(WebSocketEvents)

type WebSocketHandler = (socket: ServerWebSocket, ...args: any[]) => void
type WebSocketMethods = { [event in WebSocketEventString]: WebSocketHandler }

interface WebSocketGenerator extends WebSocketMethods {}
abstract class WebSocketGenerator {}
for (const event in WebSocketEvents) {
  WebSocketGenerator.prototype[event as WebSocketEventString] = function () {}
}

class WebSocket<TClass = Function> extends WebSocketGenerator {
  private parameters: Record<string, string> = {}
  private pathParts: string[]
  constructor(
    public path: string,
    public target: TClass,
    public handlers: WebSocketHandler[],
    public port?: number
  ) {
    super()
    this.path = cleanPath(path)
    this.pathParts = this.path.split('/')
    if (
      this.path !== '/' &&
      new Set(this.pathParts).size !== this.pathParts.length
    ) {
      for (const part in this.pathParts) {
        if (part.startsWith(':')) continue
        throw new Error(`Duplicate path parameter names in ${this.path}`)
      }
    }
    if (handlers.length > 0) {
      for (const method of handlers) {
        this[method.name as WebSocketEventString] = method
      }
    }
    return this
  }

  public parseParams(path: string) {
    const requestParts = cleanPath(path).split('/')
    if (requestParts.length !== this.pathParts.length) return false
    for (let i = 0; i < this.pathParts.length; i++) {
      const part = this.pathParts[i]
      if (!(part.startsWith(':') || part === requestParts[i])) return false
    }
    for (const [i, part] of this.pathParts.entries()) {
      if (part.startsWith(':')) this.parameters[part.slice(1)] = requestParts[i]
    }
    return true
  }

  public get params() {
    return this.parameters
  }
}

export function ws(path: string, port?: number) {
  return <TClass extends new (...args: any[]) => any>(
    target: TClass,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
    _context: ClassDecoratorContext<TClass>
  ) => {
    if (typeof target !== 'function' || !target.prototype) {
      throw new Error('WebSocket decorator can only be used on classes')
    }
    const handlers: WebSocketHandler[] = []
    for (let i = 0; i < WebSocketEventKeys.length; i++) {
      const method = target.prototype[WebSocketEventKeys[i]] as WebSocketHandler
      if (typeof method === 'function') {
        handlers.push(method)
      }
    }
    return new WebSocket(path, target, handlers, port) as WebSocket<TClass> &
      TClass // https://github.com/Microsoft/TypeScript/issues/4881
  }
}

type WSMap = Record<number, Record<string, WebSocket>>

function webSocketHandlerRouter(routes: Record<string, WebSocket>) {
  const router = {} as WebSocketMethods
  for (const event in WebSocketEvents) {
    router[event as WebSocketEventString] = function (
      socket: ServerWebSocket<any>,
      ...args: any[]
    ) {
      const route = routes[socket.data.route]
      if (typeof route === 'undefined') return
      return route[event as WebSocketEventString](
        socket,
        ...args,
        socket.data.params
      )
    }
  }
  return router
}

export class WebSocketServer<
  TWSRoutes extends Record<string, unknown> = Record<string, WebSocket>
> {
  /**
   * The WebSocket instances
   */
  public websockets: Record<keyof TWSRoutes, WebSocket>

  /**
   * The BunServer instances
   */
  public instances: BunServer[] = []

  /**
   * Map of WebSocket port to WebSocket paths
   */
  public wsMap: WSMap = {}
  constructor(websockets: TWSRoutes, options?: Middleware) {
    this.websockets = websockets as Record<keyof TWSRoutes, WebSocket>
    for (const socket of Object.values(this.websockets)) {
      if (!(socket instanceof WebSocket)) {
        throw new Error(
          `Did you forget to apply the decorator?\nInvalid WebSocket class: \n${socket}`
        )
      }
      if (socket.port === undefined) socket.port = 443
      if (!this.wsMap[socket.port]) this.wsMap[socket.port] = {}
      const path = cleanPath(socket.path)
      if (this.wsMap[socket.port][path]) {
        throw new Error(
          `Duplicate WebSocket path: ${path} on port ${socket.port}`
        )
      }
      this.wsMap[socket.port][path] = socket
    }

    for (const [port, routes] of Object.entries(this.wsMap)) {
      const routeArray = Object.values(routes)
      const instance = Bun.serve({
        async fetch(request, server) {
          const url = new URL(request.url)
          let route: WebSocket | undefined
          for (const r of routeArray) {
            if (r.parseParams(url.pathname)) {
              route = r
              break
            }
          }
          if (typeof route === 'undefined') {
            return new Response(`Route not found for ${request.url}`, {
              status: 404
            })
          }
          const middlewareResponse = runMiddleware(
            request,
            options?.middleware,
            options?.middlewarePaths
          )
          if (middlewareResponse instanceof Response) {
            return middlewareResponse
          }
          if (middlewareResponse instanceof Request) {
            request = middlewareResponse
          }
          if (
            !server.upgrade(request, {
              data: { route: route.path, params: route.params }
            })
          ) {
            return new Response('Upgrade failed!', { status: 500 })
          }
          return new Response(null, { status: 101 })
        },
        websocket: webSocketHandlerRouter(routes),
        port: Number(port)
      })
      this.instances.push(instance)
      delete this.wsMap[Number(port)]
      const assignedPort = instance.port
      for (const route of routeArray) route.port = assignedPort
      this.wsMap[assignedPort] = routes
    }
    return this
  }
}
