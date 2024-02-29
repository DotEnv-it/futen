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

export type WebSocketHandler = (socket: ServerWebSocket, ...args: any[]) => void
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
      new Set(this.pathParts).size !== this.pathParts.length &&
      this.pathParts.some((part) => part.startsWith(':'))
    ) {
      throw new Error(`Duplicate path parameter names in ${this.path}`)
    }
    if (handlers.length > 0) {
      handlers.forEach((method) => {
        this[method.name as WebSocketEventString] = method
      })
    }
    return this
  }

  public parseParams(path: string) {
    const requestParts = cleanPath(path).split('/')
    if (
      requestParts.length !== this.pathParts.length ||
      !this.pathParts.every(
        (part, i) => part.startsWith(':') || part === requestParts[i]
      )
    ) {
      return false
    }
    const params = this.pathParts.reduce(
      (acc, part, i) => {
        if (part.startsWith(':')) acc[part.slice(1)] = requestParts[i]
        return acc
      },
      {} as Record<string, string>
    )
    this.parameters = params
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
    const handlers = Object.getOwnPropertyNames(target.prototype)
      .map((name) => target.prototype[name as keyof typeof target.prototype])
      .filter(
        (method) =>
          typeof method === 'function' && method.name in WebSocketEvents
      ) as WebSocketHandler[]
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
      if (!route) return
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
      if (!socket.port) socket.port = 0
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
      const instance = Bun.serve({
        async fetch(request, server) {
          const url = new URL(request.url)
          const route = Object.values(routes).find((route) => {
            if (route.parseParams(url.pathname)) return true
            return false
          })
          if (!route) {
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
      for (const route of Object.values(routes)) route.port = assignedPort
      this.wsMap[assignedPort] = routes
    }
    return this
  }
}
