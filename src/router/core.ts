import Router from './routing.ts'
import {
  HTTPMethod,
  type HTTPMethods,
  type ServerOptions
} from '../servers/http.ts'
import {
  WSEvent,
  type WSEvents,
  webSocketRouteWrapper,
  type WebSocketDataType,
  type WebSocketServerOptions
} from '../servers/websocket.ts'
import { type Middleware, runMiddleware } from './middleware.ts'
import { Server as BunServer } from 'bun'

/**
 * Generic helper function to override methods in a class
 */
function overrideMethods<T>(
  target: T,
  methods: Record<string, Function>,
  override: Record<string, Function> = {}
) {
  for (const method in methods) {
    if (override[method]) {
      Object.defineProperty(target, method, {
        value: override[method],
        writable: true,
        enumerable: true,
        configurable: true
      })
      continue
    }
    Object.defineProperty(target, method, {
      value: methods[method],
      writable: true,
      enumerable: true,
      configurable: true
    })
  }
  return target
}

/**
 * Generic route is used to instantiate both HTTP and WebSocket routes
 *
 * ---
 *
 * It will take the target class and add the methods from it which override the default methods
 */
export class Route {
  public middleware: Middleware['middleware']
  constructor(
    public target: Function,
    public path: string,
    public typeOfRoute: 'http' | 'ws'
  ) {
    if (typeof target !== 'function') {
      throw new Error(
        'Invalid target, expected a class. ' +
          'Make sure to apply the decorator to a class, not to a method or property.'
      )
    }
    switch (typeOfRoute) {
      case 'http':
        overrideMethods(this, HTTPMethod, target.prototype)
        return this
      case 'ws':
        overrideMethods(this, WSEvent, target.prototype)
        return this
    }
  }
}

type GenericRouteType<T extends HTTPMethods | WSEvents = any> = {
  [key in keyof T]: T[key]
}

export class Futen<T extends Record<string, GenericRouteType>> {
  public routes: { [key in keyof T]: Route } & T
  /**
   * The router of a server is not accessible to avoid accidental modification
   *
   * ---
   *
   * Create a new Router instance instead
   * @see Router
   */
  private router = new Router()
  public instance: BunServer

  private addRoute<T>(path: string, route: T) {
    const store = this.router.register<Record<number, T>>(path)
    store[0] = route
  }

  constructor(routes: T, options?: ServerOptions | WebSocketServerOptions) {
    for (const route of Object.values(routes)) {
      if (!(route instanceof Route)) {
        throw new Error(
          `Did you forget to apply the decorator?\nInvalid route class: \n${route}`
        )
      }
      this.addRoute(route.path, route)
    }
    this.routes = routes as { [key in keyof T]: Route } & T
    if (
      options?.fetch !== undefined &&
      process.env['OVERWRITE_FETCH'] !== 'true'
    ) {
      console.warn(
        'You are overwriting the fetch method. This may cause unexpected behavior. ' +
          '\n\tIf you are sure you want to do this, set the OVERWRITE_FETCH environment variable to `true`'
      )
      delete options.fetch
    }
    const routeMap = this.router
    this.instance = Bun.serve({
      fetch: this.fetch(options),
      websocket: webSocketRouteWrapper(routeMap),
      ...options
    })
    return this
  }

  /**
   * Fetch method for the server
   * @param request
   * @param server
   */
  private fetch(options?: ServerOptions | WebSocketServerOptions) {
    return async (request: Request, server: BunServer) => {
      const url = new URL(request.url)
      const route = this.router.find<Record<number, GenericRouteType>>(
        url.pathname
      )
      if (route === null) {
        return new Response(`Route not found for ${request.url}`, {
          status: 404
        })
      }
      const routeStore = route.store[0]
      if (routeStore['middleware'] || options?.middleware) {
        const middlewareResponse = runMiddleware(
          request,
          options,
          routeStore['middleware']
        )
        request = middlewareResponse ?? request
      }
      if (request.headers.get('upgrade') === 'websocket') {
        if (
          !server.upgrade(request, {
            data: {
              route: routeStore['path'],
              params: route.params
            } satisfies WebSocketDataType
          })
        ) {
          return new Response('Upgrade failed!', { status: 500 })
        }
        return new Response(null, { status: 101 })
      }
      return routeStore[request.method.toLowerCase() as keyof HTTPMethods](
        request,
        route.params
      )
    }
  }
}
