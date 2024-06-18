import Router from '../../router';
import { HTTPMethods } from '../decorators/http';
import { WSEvents, webSocketRouteWrapper } from '../decorators/websocket';
import { runMiddleware } from '../decorators/middleware';
import type { HTTPMethod } from '../decorators/http';
import type { Middleware, MiddlewareRelation } from '../decorators/middleware';
import type { Server as BunServer, ServeOptions } from 'bun';
import type {
    FutenWebSocketRouteType,
    WSEvent,
    WebSocketDataType
} from '../decorators/websocket';

type RouteType<S extends string> = HTTPMethod<S> | WSEvent<S>;

function overrideMethods<T, K, P extends string>(target: T, methods: RouteType<P>, override: K): T {
    for (const method in methods) {
        if (override[method as keyof K] !== undefined) {
            Object.defineProperty(target, method, {
                value: override[method as keyof K],
                writable: true,
                enumerable: true,
                configurable: true
            });
            continue;
        }
        Object.defineProperty(target, method, {
            value: methods[method as keyof RouteType<P>],
            writable: true,
            enumerable: true,
            configurable: true
        });
    }
    return target;
}

export class Route<T, P extends string> {
    public middleware?: Middleware;
    public readonly target: T;
    public path: P;
    public data?: Record<string, unknown>;
    public constructor(target: T, path: P, typeOfRoute: 'http' | 'ws') {
        if (typeof target !== 'function') {
            throw new Error(
                'Invalid target, expected a class. Make sure to apply the decorator to a class, not to a method or property.'
            );
        }
        this.target = target;
        this.path = path;

        switch (typeOfRoute) {
            case 'http':
                overrideMethods(this, HTTPMethods(path), target.prototype);
                break;
            case 'ws':
                overrideMethods(this, WSEvents(path), target.prototype);
                break;
        }
    }
}

export default class Futen<P extends string = string, T = Record<P, unknown>> {
    public readonly router = new Router<Route<T, P>>();
    public readonly routes: { [key in keyof T]: Route<T[key], P> };
    public readonly instance: BunServer;

    public constructor(
        routes: T,
        options?: Partial<ServeOptions> & MiddlewareRelation
    ) {
        for (const route of Object.values(routes as Record<string, Route<T, P>>)) {
            const store = this.router.register(route.path);
            store[0] = route;
        }
        this.routes = routes as { [key in keyof T]: Route<T[key], P> };
        this.instance = Bun.serve({
            fetch: this.fetch(options),
            websocket: webSocketRouteWrapper(),
            ...options
        });
        // This may seem like a hack, but it's the only way I found to normalize the fetch function
        // and make it work with the plugin system
        this.instance.fetch = (request: Request) => {
            return this.fetch(options)(request, this.instance);
        };
        this.instance.reload(this.instance);
    }

    public plug<S extends this, B extends unknown[], A extends (server: S, ...args: B) => void>(
        plugin: A,
        ...args: B
    ): this {
        plugin(this as S, ...args);
        this.instance.reload(this.instance);
        return this;
    }

    public fetch(serverMiddleware?: MiddlewareRelation) {
        return (request: Request, server?: BunServer) => {
            const route = this.router.find(
                request.url.substring(request.url.indexOf('/', 8))
            );
            if (route === null) {
                return new Response(`Route not found for ${request.url}`, {
                    status: 404
                });
            }
            const routeStore = route.store[0];
            if (routeStore.middleware ?? serverMiddleware) {
                const mw = runMiddleware(
                    request,
                    route.params,
                    serverMiddleware?.middleware,
                    routeStore.middleware
                );
                if (mw instanceof Response) return mw;
                request = mw;
            }
            if (request.headers.get('upgrade') === 'websocket') {
                if (
                    server !== undefined &&
                    !server.upgrade(request, {
                        data: {
                            route: route.store[0] as unknown as FutenWebSocketRouteType<T>,
                            params: route.params
                        } satisfies WebSocketDataType<string>
                    })
                ) return new Response('Upgrade failed!', { status: 500 });
                return new Response(null, { status: 101 });
            }
            // @ts-expect-error - Element implicitly has an 'any' type because expression of type 'string' can't be used to index type 'Route<T>'. No index signature with a parameter of type 'string' was found on type 'Route<T>'.ts(7053)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return route.store[0][request.method.toLowerCase()](
                request,
                route.params
            );
        };
    }
}
