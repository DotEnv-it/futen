import { Route } from '../server';

function defaultHTTPHandler(
    /* eslint-disable @typescript-eslint/no-unused-vars */
    _request: Request,
    _params: Record<string, string>
    /* eslint-enable @typescript-eslint/no-unused-vars */
): Response {
    return Response.json({ error: 'Method not implemented' }, { status: 405 });
}

export const HTTPMethod = {
    get: defaultHTTPHandler,
    head: defaultHTTPHandler,
    post: defaultHTTPHandler,
    put: defaultHTTPHandler,
    delete: defaultHTTPHandler,
    connect: defaultHTTPHandler,
    options: defaultHTTPHandler,
    trace: defaultHTTPHandler,
    patch: defaultHTTPHandler
};

export type HTTPMethods = typeof HTTPMethod;
type FutenHTTPMethodInterfaceType = {
    [key in keyof typeof HTTPMethod]?: HTTPMethods[key]
};
export interface FutenHTTPRoute extends FutenHTTPMethodInterfaceType { }
export type FutenHTTPRouteType<T> = Route<T> & HTTPMethods;

export function route(path: string) {
    return function <T extends new (...args: any[]) => any>(
        target: T,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
        _context?: ClassDecoratorContext<T>
    ) {
        return new Route(target, path, 'http') as FutenHTTPRouteType<T> & T;
    };
}
