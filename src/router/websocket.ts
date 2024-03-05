import {
  Server as BunServer,
  ServerWebSocket,
  WebSocketServeOptions
} from 'bun'
import { Middleware, runMiddleware } from './middleware.ts'
import Router from './router.ts'
import { Route } from './core.ts'

// type BaseWSHandler<T extends Record<string, unknown> = any> = (ws: BunServerWebSocket, ...args: T[keyof T][]) => void | Promise<void>
/**
 * Standard WebSocket events which are automatically picked up by the router
 * ---
 * Compatible with Bun base WebSocket server
 * @link https://bun.sh/docs/api/websockets#reference
 */
export const WSRoute = {
  message: (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ws: ServerWebSocket,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: string | ArrayBuffer | Uint8Array
  ) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  open: (_ws: ServerWebSocket) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  close: (_ws: ServerWebSocket, _code: number, _reason: string) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drain: (_ws: ServerWebSocket) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ping: (_ws: ServerWebSocket, _data: Buffer) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pong: (_ws: ServerWebSocket, _data: Buffer) => {}
} satisfies WebSocketServeOptions['websocket']

/**
 * Decorator for WebSocket routes
 * ---
 * This decorator is used to define WebSocket routes
 * @param path - The path of the route
 */
export function ws(path: string) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
    _context: ClassDecoratorContext<T>
  ) {
    return new Route(target, path, 'ws') as Route & typeof WSRoute & T
  }
}

function webSocketRouterHandler(routes: Router) {
  const router = {} as typeof WSRoute
  for (const event in WSRoute) {
    router[event as keyof typeof WSRoute] = function (
      ws: ServerWebSocket<any>,
      ...args: any[]
    ) {
      const route = routes.find(ws.data.route)
      if (route === null) return
      return route.store[0][event as keyof typeof WSRoute](
        ws,
        ...args,
        ws.data.params
      )
    }
  }
  return router
}

type WebSocketServerOptions = {
  [key in keyof WebSocketServeOptions]?: WebSocketServeOptions[key]
} & Middleware

export class WebSocketServer<T extends Record<string, unknown>> {
  /**
   * The WebSocket instances
   */
  public websockets: Record<keyof T, Route & typeof WSRoute>

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

  constructor(websockets: T, options?: WebSocketServerOptions) {
    this.websockets = websockets as Record<keyof T, Route & typeof WSRoute>
    for (const socket of Object.values(this.websockets)) {
      if (!(socket instanceof Route)) {
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
