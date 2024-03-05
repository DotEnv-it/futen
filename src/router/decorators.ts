import { Route } from './core'
import { HTTPRoute } from './http'
import { WSRoute } from './websocket'

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
    return new Route(target, path, 'http') as Route & typeof HTTPRoute & T
  }
}

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
