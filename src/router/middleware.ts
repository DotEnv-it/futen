import { wildcardMatchRegExp } from './util.ts'

export type Middleware = {
  /**
   * Middleware allows you to run code before a request is completed.
   * Then, based on the incoming request, you can modify the response by rewriting, redirecting, modifying the request or response headers,
   * or responding directly.
   *
   * Middleware runs before cached content and routes are matched. See Matching Paths for more details.
   *
   * * Returning a `Response` from middleware will prevent the route from being called
   * and will instead return the response from the middleware.
   *
   * * Returning a `Request` from middleware will modify the request and continue to the route.
   *
   * @example
   * ```ts
   * ⁣const server = new Server([
   *  Home,
   *  Convert
   * ], {
   *   middleware: (request) => {
   *   console.log(`Request to ${request.url}`);
   *  }
   * });
   * ```
   */
  middleware?: (
    request: Request
  ) => void | Request | Response | Promise<void | Request | Response>
  /**
   * MiddlewarePaths allows you to specify which paths the middleware should run on.
   *
   * @note Middleware paths are parsed by default, removing trailing slashes and ensuring that the path is not empty. if you want to disable this behavior, set the `DISABLE_CLEAN_PATH` environment variable to `true`.
   * @note If the path is not specified, the middleware will run on all paths.
   * @note Matching is done using a wildcard match.
   * @see wildcardMatchRegExp
   * @default "*" (all paths)
   *
   * @example
   * ```ts
   * const paths = ["/", "/convert"];
   * const paths = "/";
   * const paths = "*";
   * const paths = ["/convert/*"]
   * ...
   * ```
   */
  middlewarePaths?: string | string[]
}

export function runMiddleware(
  request: Request,
  middleware?: Middleware['middleware'],
  middlewarePaths: Middleware['middlewarePaths'] = ['*']
) {
  if (middleware === undefined) return
  if (typeof middlewarePaths === 'string') middlewarePaths = [middlewarePaths]
  const path = new URL(request.url).pathname
  for (let i = 0; i < middlewarePaths.length; i++) {
    if (wildcardMatchRegExp(path, middlewarePaths[i])) {
      return middleware(request)
    }
  }
}
