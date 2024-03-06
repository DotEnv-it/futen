import { Server as BunServer, ServeOptions, WebSocketServeOptions } from 'bun'
import { Server } from '../router/core'
import { Middleware, runMiddleware } from '../router/middleware'
import { HTTPMethod } from './rest'
import { WSEvent, webSocketRouterHandler } from './websocket'

/**
 * Optional porting of the ServeOptions type from Bun
 */
export type ServerOptions = {
  [key in keyof ServeOptions]?: ServeOptions[key]
} & Middleware

/**
 * A Wrapper for the BunServer class that allows
 * for the use of decorators to define routes.
 *
 * @param routes An object containing the routes to serve
 *
 * @see BunServer
 */
export class HTTPServer<T extends Record<string, unknown>> extends Server<
  T,
  typeof HTTPMethod
> {
  /**
   * The server instance
   */
  public instance: BunServer

  /**
   * @param routes An object containing the routes to serve
   * @param options Options to pass to the server
   */
  constructor(
    routes: T,
    public options?: ServerOptions
  ) {
    super(routes, options)
    const routeMap = this.router
    this.instance = Bun.serve({
      async fetch(request) {
        const method = request.method.toLowerCase() as keyof typeof HTTPMethod
        if (!HTTPMethod[method]) {
          return Response.json(
            { error: `Invalid method: ${method}` },
            { status: 405 }
          )
        }
        const url = new URL(request.url)
        const route = routeMap.find(url.pathname)
        if (!route) {
          return Response.json(
            { error: `Route not found for ${request.url}` },
            { status: 404 }
          )
        }
        const middlewareResponse = runMiddleware(
          request,
          options?.middleware,
          options?.middlewarePaths
        )
        if (middlewareResponse instanceof Response) return middlewareResponse
        if (middlewareResponse instanceof Request) request = middlewareResponse
        return route.store[0][method](request, route.params)
      },
      ...options
    })
    return this
  }
}

/**
 * Optional porting of the WebSocketServeOptions type from Bun
 */
export type WebSocketServerOptions = {
  [key in keyof WebSocketServeOptions]?: WebSocketServeOptions[key]
} & Middleware

export class WebSocketServer<T extends Record<string, unknown>> extends Server<
  T,
  typeof WSEvent
> {
  public instance: BunServer
  constructor(websockets: T, options?: WebSocketServerOptions) {
    super(websockets, options)
    const routeMap = this.router
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
