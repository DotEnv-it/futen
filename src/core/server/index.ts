import Router from '../../router';
import { HTTPMethod } from '../decorators/http';
import { WSEvent, webSocketRouteWrapper } from '../decorators/websocket';
import { runMiddleware } from '../decorators/middleware';
import type { Middleware, MiddlewareRelation } from '../decorators/middleware';
import type { Server as BunServer, ServeOptions } from 'bun';
import type {
    FutenWebSocketRouteType,
    WebSocketDataType
} from '../decorators/websocket';

type RouteType = typeof HTTPMethod | typeof WSEvent;

function overrideMethods<T, K>(target: T, methods: RouteType, override: K): T {
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
            value: methods[method as keyof RouteType],
            writable: true,
            enumerable: true,
            configurable: true
        });
    }
    return target;
}

export class Route<T> {
    public middleware?: Middleware;
    public readonly target: T;
    public path: string;
    public constructor(target: T, path: string, typeOfRoute: 'http' | 'ws') {
        if (typeof target !== 'function') {
            throw new Error(
                'Invalid target, expected a class. Make sure to apply the decorator to a class, not to a method or property.'
            );
        }
        this.target = target;
        this.path = path;

        switch (typeOfRoute) {
            case 'http':
                overrideMethods(this, HTTPMethod, target.prototype);
                break;
            case 'ws':
                overrideMethods(this, WSEvent, target.prototype);
                break;
        }
    }
}

export default class Futen<T> {
    public readonly router = new Router<Route<T>>();
    public readonly routes: { [key in keyof T]: Route<T[key]> };
    public readonly instance: BunServer;

    public constructor(
        routes: T,
        options?: Partial<ServeOptions> & MiddlewareRelation
    ) {
        for (const route of Object.values(routes as Record<string, Route<T>>)) {
            const store = this.router.register(route.path);
            store[0] = route;
        }
        this.routes = routes as { [key in keyof T]: Route<T[key]> };
        this.instance = Bun.serve({
            fetch: this.fetch(options),
            websocket: webSocketRouteWrapper(),
            ...options
        });
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
                            route: route.store[0] as FutenWebSocketRouteType<T>,
                            params: route.params
                        } satisfies WebSocketDataType
                    })
                )
                    return new Response('Upgrade failed!', { status: 500 });
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
