import { Server as BunServer, ServeOptions, WebSocketServeOptions } from 'bun'
import { Server } from '../router/core'
import { Middleware } from '../router/middleware'
import { HTTPMethod } from './http'
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
    super('http', routes, options)
    this.instance = Bun.serve({
      fetch: this.fetch(options),
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
    super('ws', websockets, options)
    const routeMap = this.router
    this.instance = Bun.serve({
      fetch: this.fetch(options),
      websocket: webSocketRouterHandler(routeMap),
      ...options
    })
    return this
  }
}
