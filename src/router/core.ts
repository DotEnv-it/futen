import Router from './routing'
import { ServerOptions, WebSocketServerOptions } from '../servers'
import { HTTPMethod } from '../servers/http'
import { WSEvent } from '../servers/websocket'
import { Middleware, runMiddleware } from './middleware'
import { Server as BunServer } from 'bun'

type RouteType = 'http' | 'ws'

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
  protected middleware: Middleware['middleware']
  constructor(
    public target: Function,
    public path: string,
    public typeOfRoute: RouteType
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

export abstract class Server<T extends Record<string, unknown>, K> {
  public routes: Record<keyof T, Route & K>
  /**
   * The router of a server is not accessible to avoid accidental modification
   *
   * ---
   *
   * Create a new Router instance instead
   * @see Router
   */
  protected router = new Router()

  private addRoute<T>(path: string, route: T) {
    const store = this.router.register<Record<number, T>>(path)
    store[0] = route
  }

  constructor(
    readonly type: RouteType,
    routes: T,
    options?: ServerOptions | WebSocketServerOptions
  ) {
    for (const route of Object.values(routes)) {
      if (!(route instanceof Route)) {
        throw new Error(
          `Did you forget to apply the decorator?\nInvalid route class: \n${route}`
        )
      }
      if (route.typeOfRoute !== type) {
        throw new Error(
          `Invalid route type: ${route.typeOfRoute}. Expected: ${type}`
        )
      }
      this.addRoute(route.path, route)
    }
    this.routes = routes as Record<keyof T, Route & K>
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
    return this
  }

  executeMiddlewareStack(
    request: Request,
    serverMiddleware?: Middleware,
    routeMiddleware?: Middleware['middleware']
  ) {
    let middlewareResponse = runMiddleware(
      request,
      serverMiddleware?.middleware,
      serverMiddleware?.middlewarePaths
    )
    if (routeMiddleware !== undefined) {
      if (!(routeMiddleware instanceof Array)) {
        routeMiddleware = [routeMiddleware]
      }
      let __request = middlewareResponse ?? request
      for (let i = routeMiddleware.length - 1; i >= 0; i--) {
        __request = routeMiddleware[i](__request) ?? __request
      }
      middlewareResponse = __request
    }
    return middlewareResponse
  }

  /**
   * Fetch method for the server
   * @param request
   * @param server
   */
  protected fetch(options?: ServerOptions | WebSocketServerOptions) {
    return async (request: Request, server: BunServer) => {
      const url = new URL(request.url)
      const route = this.router.find(url.pathname)
      if (route === null) {
        return new Response(`Route not found for ${request.url}`, {
          status: 404
        })
      }
      const routeStore = route.store[0]
      if (routeStore.middleware || options?.middleware) {
        const middlewareResponse = this.executeMiddlewareStack(
          request,
          options,
          routeStore.middleware
        )
        request = middlewareResponse ?? request
      }
      if (this.type === 'ws') {
        if (
          !server.upgrade(request, {
            data: { route: routeStore.path, params: route.params }
          })
        ) {
          return new Response('Upgrade failed!', { status: 500 })
        }
        return new Response(null, { status: 101 })
      }
      return routeStore[request.method.toLowerCase()](request, route.params)
    }
  }
}
