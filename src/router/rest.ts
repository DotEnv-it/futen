import { Server as BunServer, ServeOptions } from 'bun'
import { Middleware, runMiddleware } from './middleware'
import { cleanPath } from './util'

/**
 * Cointains possible HTTP methods
 */
export enum HTTPMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}
type HTTPMethodString = keyof typeof HTTPMethods

export type RouteHandler = (
  request: Request,
  params: Record<string, string>
) => Response | Promise<Response>
type RouteMethods = { [method in HTTPMethodString]: RouteHandler }

interface RouteGenerator extends RouteMethods {}
abstract class RouteGenerator {}
for (const method in HTTPMethods) {
  RouteGenerator.prototype[method as HTTPMethodString] = function () {
    return Response.json(
      { error: `Method not implemented: ${method}` },
      { status: 405 }
    )
  }
}

class Route<TClass = Function> extends RouteGenerator {
  private parameters: Record<string, string> = {}
  private pathParts: string[]
  /**
   * Wrapper for the class to which the route decorator has been applied
   *
   * @param path The path assigned to the class
   * @param target The class to which the route decorator has been applied
   * @param handlers The methods of the class that are used as route handlers
   */
  constructor(
    public path: string,
    public target: TClass,
    public handlers: RouteHandler[]
  ) {
    super()
    this.path = cleanPath(path)
    this.pathParts = this.path.split('/')
    if (
      new Set(this.pathParts).size !== this.pathParts.length &&
      this.pathParts.some((part) => part.startsWith(':'))
    ) {
      throw new Error(`Duplicate path parameter names in ${this.path}`)
    }
    if (handlers.length > 0) {
      handlers.forEach((method) => {
        this[method.name as HTTPMethodString] = method
      })
    }
    return this
  }

  public parseParams(path: string) {
    const requestParts = cleanPath(path).split('/')
    if (
      requestParts.length !== this.pathParts.length ||
      !this.pathParts.every(
        (part, i) => part.startsWith(':') || part === requestParts[i]
      )
    ) {
      return false
    }
    const params = this.pathParts.reduce(
      (acc, part, i) => {
        if (part.startsWith(':')) acc[part.slice(1)] = requestParts[i]
        return acc
      },
      {} as Record<string, string>
    )
    this.parameters = params
    return true
  }

  public get params() {
    return this.parameters
  }
}

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
 *  GET() {
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
 *  GET() {
 *   return Response.json({ "message": `Hello, world! You are at ${this.path}` }); // ⛔️ This will NOT work
 *  }
 * }
 * ```
 *
 * You need to access that property from the server.
 * ```ts
 * ⁣@route("/")
 * class Home {
 *  GET() {
 *   return Response.json({ "message": `Hello, world! You are at ${server.routes.Home.path}` }); // ✅ This will work
 *  }
 * }
 * ```
 *
 * @param path The path to assign to the class
 * @returns A class decorator
 */
export function route(path: string) {
  return <TClass extends new (...args: any[]) => any>(
    target: TClass,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
    _context: ClassDecoratorContext<TClass>
  ) => {
    if (typeof target !== 'function' || !target.prototype) {
      throw new Error('Route decorator can only be used on classes')
    }
    const handlers = Object.getOwnPropertyNames(target.prototype)
      .map((name) => target.prototype[name as keyof typeof target.prototype])
      .filter(
        (method) => typeof method === 'function' && method.name in HTTPMethods
      ) as RouteHandler[]
    return new Route(path, target, handlers) as Route<TClass> & TClass // https://github.com/Microsoft/TypeScript/issues/4881
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
export class Server<TRoutes extends Record<string, unknown>> {
  /**
   * The routes that the server is serving
   */
  public routes: Record<keyof TRoutes, Route>

  /**
   * The server instance
   */
  public instance: BunServer

  /**
   * @param routes An object containing the routes to serve
   * @param options Options to pass to the server
   */
  constructor(
    routes: TRoutes,
    public options?: ServerOptions
  ) {
    const routeMap = Object.values(routes)
      .map((route) => {
        if (!(route instanceof Route)) {
          throw new Error(
            `Did you forget to apply the decorator?\nInvalid route class: \n${route}`
          )
        }
        return route
      })
      .reduce(
        (acc, route) => {
          if (acc[route.path]) {
            throw new Error(`Duplicate route path: ${route.path}`)
          }
          acc[route.path] = route
          return acc
        },
        {} as Record<string, Route>
      )
    this.routes = routes as Record<keyof TRoutes, Route>
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
        const url = new URL(request.url)
        const route = Object.values(routeMap).find((route) => {
          if (route.parseParams(url.pathname)) return true
          return false
        })
        if (!route) {
          return Response.json(
            { error: `Route not found for ${request.url}` },
            { status: 404 }
          )
        }
        const method = request.method as HTTPMethodString
        if (!HTTPMethods[method]) {
          return Response.json(
            { error: `Invalid method: ${method}` },
            { status: 405 }
          )
        }
        const middlewareResponse = runMiddleware(
          request,
          options?.middleware,
          options?.middlewarePaths
        )
        if (middlewareResponse instanceof Response) return middlewareResponse
        if (middlewareResponse instanceof Request) request = middlewareResponse
        return route[method](request, route.params)
      },
      ...options
    })
    return this
  }
}
