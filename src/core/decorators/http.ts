import { Route } from '../server';
import type { RouteParams } from '../../router';

export function defaultHTTPHandler<P extends string>(
    /* eslint-disable @typescript-eslint/no-unused-vars */
    _request: Request,
    _params: RouteParams<P>
    /* eslint-enable @typescript-eslint/no-unused-vars */
): Response {
    return Response.json({ error: 'Method not implemented' }, { status: 405 });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention, @typescript-eslint/explicit-function-return-type
export function HTTPMethods<T extends string>(_path?: T) {
    return {
        get: defaultHTTPHandler<T>,
        head: defaultHTTPHandler<T>,
        post: defaultHTTPHandler<T>,
        put: defaultHTTPHandler<T>,
        delete: defaultHTTPHandler<T>,
        connect: defaultHTTPHandler<T>,
        options: defaultHTTPHandler<T>,
        trace: defaultHTTPHandler<T>,
        patch: defaultHTTPHandler<T>
    };
}
export type HTTPMethod<P extends string> = ReturnType<typeof HTTPMethods<P>>;
export interface FutenHTTPRoute<P extends string> extends Partial<HTTPMethod<P>> {}
export type FutenHTTPRouteType<T, P extends string> = Route<T, P> & FutenHTTPRoute<P>;

export function route<P extends string>(path: P) {
    return function <T extends new (...args: any[]) => any>(
        target: T,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
        _context?: ClassDecoratorContext<T>
    ) {
        return new Route(target, path, 'http') as FutenHTTPRouteType<T, P> & T;
    };
}
