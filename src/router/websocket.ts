import {
  Server as BunServer,
  ServerWebSocket,
  WebSocketServeOptions
} from 'bun'
import { Middleware, runMiddleware } from './middleware'
import Router from './router'

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
    public handlers: WebSocketHandler[]
  ) {
    super()
    this.path = path
    this.pathParts = this.path.split('/')
    for (const part of this.pathParts) {
      if (part.startsWith(':')) {
        const pathSlice = part.slice(1)
        if (this.parameters[pathSlice] !== undefined) {
          throw new Error(`Duplicate path parameter names in ${this.path}`)
        }
        this.parameters[pathSlice] = ''
      }
    }
    if (handlers.length > 0) {
      for (const method of handlers) {
        this[method.name as WebSocketEventString] = method
      }
    }
    return this
  }

  public get params() {
    return this.parameters
  }
}

export function ws(path: string) {
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
    return new WebSocket(path, target, handlers) as WebSocket<TClass> & TClass // https://github.com/Microsoft/TypeScript/issues/4881
  }
}

function webSocketRouterHandler(routes: Router) {
  const router = {} as WebSocketMethods
  for (const event in WebSocketEvents) {
    router[event as WebSocketEventString] = function (
      socket: ServerWebSocket<any>,
      ...args: any[]
    ) {
      const route = routes.find(socket.data.route)
      if (route === null) return
      return route.store[0][event as WebSocketEventString](
        socket,
        ...args,
        socket.data.params
      )
    }
  }
  return router
}

type WebSocketServerOptions = {
  [key in keyof WebSocketServeOptions]?: WebSocketServeOptions[key]
} & Middleware

export class WebSocketServer<
  TWSRoutes extends Record<string, unknown> = Record<string, WebSocket>
> {
  /**
   * The WebSocket instances
   */
  public websockets: Record<keyof TWSRoutes, WebSocket>

  /**
   * The Router
   */
  private router = new Router()

  /**
   * The BunServer instances
   */
  public instance: BunServer

  private addRoute<T>(path: string, route: T) {
    const store = this.router.register<Record<number, T>>(path)
    store[0] = route
  }

  constructor(websockets: TWSRoutes, options?: WebSocketServerOptions) {
    this.websockets = websockets as Record<keyof TWSRoutes, WebSocket>
    for (const socket of Object.values(this.websockets)) {
      if (!(socket instanceof WebSocket)) {
        throw new Error(
          `Did you forget to apply the decorator?\nInvalid WebSocket class: \n${socket}`
        )
      }
      this.addRoute(socket.path, socket)
    }
    const routeMap = this.router
    if (
      options?.fetch !== undefined &&
      process.env['OVERWRITE_FETCH'] !== 'true'
    ) {
      console.warn(
        "You are overwriting the fetch method. This may cause unexpected behavior. If you are sure you want to do this, set the OVERWRITE_FETCH environment variable to 'true'"
      )
      delete options.fetch
    }
    this.instance = Bun.serve({
      async fetch(request, server) {
        const url = new URL(request.url)
        const wsRoute = routeMap.find(url.pathname)
        if (wsRoute === null) {
          return new Response(`Route not found for ${request.url}`, {
            status: 404
          })
        }
        const middlewareResponse = runMiddleware(
          request,
          options?.middleware,
          options?.middlewarePaths
        )
        if (middlewareResponse instanceof Response) return middlewareResponse
        if (middlewareResponse instanceof Request) request = middlewareResponse
        if (
          !server.upgrade(request, {
            data: { route: wsRoute.store[0].path, params: wsRoute.params }
          })
        ) {
          return new Response('Upgrade failed!', { status: 500 })
        }
        return new Response(null, { status: 101 })
      },
      websocket: webSocketRouterHandler(routeMap),
      ...options
    })
    return this
  }
}
