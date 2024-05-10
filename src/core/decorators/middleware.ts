/* eslint-disable @typescript-eslint/no-invalid-void-type */
import { Route } from '../server';
import { route } from './http';

function escapeRegex(str: string): string {
    return str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
}

export function wildcardMatchRegExp(str: string, rule: string): boolean {
    return new RegExp(`^${rule.split('*').map(escapeRegex).join('.*')}$`).test(
        str
    );
}

export type Middleware =
  | ((request: Request | Response, params: any) => Request | Response | void)
  | ((request: Request | Response, params: any) => Request | Response | void)[]
  | undefined;

export type MiddlewareRelation = { middleware?: Record<string, Middleware> };

function applyMiddleware(
    request: Request | Response,
    params: any,
    appliedMiddleware: Middleware
): Request | Response {
    if (appliedMiddleware === undefined) return request;
    if (!(appliedMiddleware instanceof Array))
        appliedMiddleware = [appliedMiddleware];
    let tmp = request;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    for (let i = 0; i < appliedMiddleware.length; i++) tmp = appliedMiddleware[i](tmp, params) ?? tmp;
    return tmp;
}

export function runServerMiddleware(
    request: Request | Response,
    params: any,
    serverMiddleware?: MiddlewareRelation['middleware']
): Response | Request | undefined {
    if (serverMiddleware === undefined) return;
    const middlewarePaths = Object.keys(serverMiddleware);
    const path = new URL(request.url).pathname;
    for (let i = 0; i < middlewarePaths.length; i++) {
        if (wildcardMatchRegExp(path, middlewarePaths[i])) {
            return applyMiddleware(
                request,
                params,
                serverMiddleware[middlewarePaths[i]]
            );
        }
    }
}

export function runMiddleware(
    request: Request,
    params: any,
    serverMiddleware?: MiddlewareRelation['middleware'],
    routeMiddleware?: Middleware
): Request | Response {
    let middlewareResponse = runServerMiddleware(request, params, serverMiddleware) ?? request;
    if (routeMiddleware !== undefined) {
        for (let i = 0; i < routeMiddleware.length; i++) {
            middlewareResponse = applyMiddleware(
                middlewareResponse,
                params,
                routeMiddleware
            );
        }
    }

    return middlewareResponse;
}

export function middleware(callback: Middleware) {
    return function <T extends new (...args: any[]) => any>(
        target: T,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
        _context: ClassDecoratorContext<T>
    ) {
        if (!(target instanceof Route)) target = route('')(target); // Used for file router
        if (!(target instanceof Route)) {
            // This should never happen
            throw new Error(
                'If you are seeing this error, please open an issue on the official repo'
            );
        }
        if (target.middleware === undefined) target.middleware = [];
        if (!(target.middleware instanceof Array))
            target.middleware = [target.middleware];
        if (callback === undefined) {
            throw new Error(
                'Middleware cannot be undefined, did you forget to pass a middleware function?'
            );
        }
        if (!(callback instanceof Array)) callback = [callback];
        target.middleware = callback.concat(target.middleware);
        return target;
    };
}
