import { Server as BunServer, ServeOptions } from 'bun'
import { Middleware, runMiddleware } from './middleware.ts'
import Router from './router.ts'
import { Route } from './core.ts'

function defaultHTTPHandler() { return Response.json({ error: 'Method not implemented' }, { status: 405 }) }
/**
 * Standard HTTP methods which are automatically picked up by the router
 * ---
 * As described in the HTTP/1.1 specification (RFC 9110)
 * @link https://www.rfc-editor.org/rfc/rfc9110.html
 */
export const HTTPRoute = {
  get: defaultHTTPHandler,
  head: defaultHTTPHandler,
  post: defaultHTTPHandler,
  put: defaultHTTPHandler,
  delete: defaultHTTPHandler,
  connect: defaultHTTPHandler,
  options: defaultHTTPHandler,
  trace: defaultHTTPHandler,
  patch: defaultHTTPHandler
} satisfies Record<string, ServeOptions['fetch']>

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
  return function <T extends new (...args: any[]) => any>(target: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
    _context: ClassDecoratorContext<T>
  ) {
    return new Route(target, path, 'http') as Route & typeof HTTPRoute & T
  }
}

type ServerOptions = {
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
export class HTTPServer<T extends Record<string, unknown>> {
  /**
   * The routes that the server is serving
   */
  public routes: Record<keyof T, Route & typeof HTTPRoute>

  /**
   * The Router
   */
  private router = new Router()

  /**
   * The server instance
   */
  public instance: BunServer

  private addRoute<T>(path: string, route: T) {
    const store = this.router.register<Record<number, T>>(path)
    store[0] = route
  }

  /**
   * @param routes An object containing the routes to serve
   * @param options Options to pass to the server
   */
  constructor(
    routes: T,
    public options?: ServerOptions
  ) {
    for (const route of Object.values(routes)) {
      if (!(route instanceof Route)) {
        throw new Error(
          `Did you forget to apply the decorator?\nInvalid route class: \n${route}`
        )
      }
      this.addRoute(route.path, route)
    }
    const routeMap = this.router
    this.routes = routes as Record<keyof T, Route & typeof HTTPRoute>
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
      async fetch(request) {
        const method = request.method.toLowerCase() as keyof typeof HTTPRoute
        if (!HTTPRoute[method]) {
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
