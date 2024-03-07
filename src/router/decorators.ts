import { HTTPMethod } from '../servers/http'
import { WSEvent } from '../servers/websocket'
import { Route } from './core'
import { Middleware } from './middleware'

/**
 * The route decorator assigns a path to a class within the server it is applied to.
 *
 * It does this by wrapping the class in a Route class, which is then used to generate the server's routes.
 * However, this does NOT mean that the class is directly converted to a Route class. This means that you cannot use
 * properties or methods of the Route class directly on the class itself.
 *
 * For example, you can do this:
 * ```ts
 * ⁣@route("/")
 * class Home {
 *  get() {
 *   return Response.json({ "message": "Hello, world!" });
 *  }
 * }
 * ```
 *
 * -----
 *
 * but using something like `this.path` will not work.
 * ```ts
 * ⁣@route("/")
 * class Home {
 *  get() {
 *   return Response.json({ "message": `Hello, world! You are at ${this.path}` }); // ⛔️ This will NOT work
 *  }
 * }
 * ```
 *
 * You need to access that property from the server.
 * ```ts
 * ⁣@route("/")
 * class Home {
 *  get() {
 *   return Response.json({ "message": `Hello, world! You are at ${server.routes.Home.path}` }); // ✅ This will work
 *  }
 * }
 * ```
 *
 * @param path The path to assign to the class
 * @returns A class decorator
 */
export function route(path: string) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
    _context: ClassDecoratorContext<T>
  ) {
    return new Route(target, path, 'http') as Route & typeof HTTPMethod & T
  }
}

/**
 * Decorator for WebSocket routes
 *
 * ---
 *
 * This decorator is used to define WebSocket routes
 * @param path - The path of the route
 */
export function ws(path: string) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
    _context: ClassDecoratorContext<T>
  ) {
    return new Route(target, path, 'ws') as Route & typeof WSEvent & T
  }
}

/**
 * Decorator to add middleware to a single route
 *
 * ---
 *
 * Executes arbitrary code before the route is called
 *
 * @param middleware - The middleware to apply to the route
 *
 * @example
 *
 * ```ts
 * function logger(request: Request) {
 *  console.log(`Request to ${request.url}`)
 * }
 *
 * ⁣@middleware(logger)
 * ⁣@route("/")
 * class Home {
 *   get() {
 *     return Response.json({ "message": "Hello, world!" });
 *   }
 * }
 * ```
 *
 * ---
 *
 * You can also apply multiple middleware to a single route by passing an array of middleware
 * and they will be executed in the order they are passed.
 * @example
 *
 * ```ts
 * ⁣@middleware([(request) => {
 * console.log(`Request to ${request.url}`)
 * }, (request) => {
 * console.log(`Request to ${request.url} - The Second`)
 * }])
 * ⁣@route("/")
 * class Home {
 *   get() {
 *     return Response.json({ "message": "Hello, world!" });
 *   }
 * }
 * ```
 */
export function middleware(middleware: Middleware['middleware']) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
    _context: ClassDecoratorContext<T>
  ) {
    if (!(target instanceof Route)) {
      throw new Error(
        'Middleware can only be applied to a class with the route decorator.' +
          '\n\tMake sure to apply the middleware decorator above the route decorator'
      )
    }
    if (target['middleware'] === undefined) {
      target['middleware'] = []
    }
    if (!(target['middleware'] instanceof Array)) {
      // How did we get here? Open an issue tyty
      target['middleware'] = [target['middleware']]
    }
    if (middleware === undefined) {
      throw new Error(
        'Middleware cannot be undefined, did you forget to pass a middleware function?'
      )
    }
    if (!(middleware instanceof Array)) {
      middleware = [middleware]
    }
    target['middleware'] = middleware.concat(target['middleware'])
  }
}
