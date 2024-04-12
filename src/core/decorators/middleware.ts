/* eslint-disable @typescript-eslint/no-invalid-void-type */
import { Route } from '../server';

function escapeRegex(str: string): string {
    return str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
}

export function wildcardMatchRegExp(str: string, rule: string): boolean {
    return new RegExp(`^${rule.split('*').map(escapeRegex).join('.*')}$`).test(
        str
    );
}

export type Middleware = {
    middleware?:
        | ((request: Request, params: any) => Request | void)
        | ((request: Request, params: any) => Request | void)[];
    middlewarePaths?: string | string[];
};

function applyMiddleware(
    request: Request,
    params: any,
    appliedMiddleware: Middleware['middleware']
): Request {
    if (appliedMiddleware === undefined) return request;
    if (!(appliedMiddleware instanceof Array))
        appliedMiddleware = [appliedMiddleware];
    let requestTmp = request;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    for (let i = 0; i < appliedMiddleware.length; i++) requestTmp = appliedMiddleware[i](requestTmp, params) ?? requestTmp;

    return requestTmp;
}

export function runServerMiddleware(
    request: Request,
    params: any,
    serverMidleware?: Middleware['middleware'],
    middlewarePaths: Middleware['middlewarePaths'] = ['*']
): Request | undefined {
    if (serverMidleware === undefined) return;
    if (typeof middlewarePaths === 'string')
        middlewarePaths = [middlewarePaths];
    const path = new URL(request.url).pathname;
    for (let i = 0; i < middlewarePaths.length; i++) {
        if (wildcardMatchRegExp(path, middlewarePaths[i]))
            return applyMiddleware(request, params, serverMidleware);
    }
}

export function runMiddleware(
    request: Request,
    params: any,
    serverMidleware?: Middleware,
    routeMiddleware?: Middleware['middleware']
): Request {
    let middlewareResponse = runServerMiddleware(
        request,
        params,
        serverMidleware?.middleware,
        serverMidleware?.middlewarePaths
    ) ?? request;
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

export function middleware(middlewareCB: Middleware['middleware']) {
    return function <T extends new (...args: any[]) => any>(
        target: T,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
        _context: ClassDecoratorContext<T>
    ) {
        if (!(target instanceof Route)) {
            throw new Error(
                'Middleware can only be applied to a class with the route decorator.\n\tMake sure to apply the middleware decorator above the route decorator'
            );
        }
        if (target.middleware === undefined) target.middleware = [];

        if (!(target.middleware instanceof Array)) {
            // How did we get here? Open an issue tyty
            target.middleware = [target.middleware];
        }
        if (middlewareCB === undefined) {
            throw new Error(
                'Middleware cannot be undefined, did you forget to pass a middleware function?'
            );
        }
        if (!(middlewareCB instanceof Array)) middlewareCB = [middlewareCB];

        target.middleware = middlewareCB.concat(target.middleware);
    };
}
