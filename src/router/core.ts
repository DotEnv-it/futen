import Router from './routing'
import { ServerOptions, WebSocketServerOptions } from '../servers'
import { HTTPMethod } from '../servers/rest'
import { WSEvent } from '../servers/websocket'

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
  constructor(
    public target: Function,
    public path: string,
    public typeOfRoute: 'http' | 'ws'
  ) {
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

  constructor(routes: T, options?: ServerOptions | WebSocketServerOptions) {
    for (const route of Object.values(routes)) {
      if (!(route instanceof Route)) {
        throw new Error(
          `Did you forget to apply the decorator?\nInvalid route class: \n${route}`
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
        "You are overwriting the fetch method. This may cause unexpected behavior. If you are sure you want to do this, set the OVERWRITE_FETCH environment variable to 'true'"
      )
      delete options.fetch
    }
    return this
  }
}
