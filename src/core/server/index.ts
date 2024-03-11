import Router from '../../router';
import { HTTPMethod } from '../decorators/http';
import type { Server as BunServer } from 'bun';
import type { HTTPMethods } from '../decorators/http';

function overrideMethods<T>(
    target: T,
    methods: HTTPMethods,
    override: Record<string, T> = {}
): T {
    for (const method in methods) {
        if (override[method]) {
            Object.defineProperty(target, method, {
                value: override[method],
                writable: true,
                enumerable: true,
                configurable: true
            });
            continue;
        }
        Object.defineProperty(target, method, {
            value: methods[method as keyof HTTPMethods],
            writable: true,
            enumerable: true,
            configurable: true
        });
    }
    return target;
}

export class Route<T> {
    public readonly target: T;
    public readonly path: string;
    public constructor(
        target: T,
        path: string
    ) {
        if (typeof target !== 'function')
            throw new Error('Invalid target, expected a class. Make sure to apply the decorator to a class, not to a method or property.');
        this.target = target;
        this.path = path;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        overrideMethods(this, HTTPMethod, target.prototype);
    }
}

export default class Futen<T> {
    public readonly router = new Router<T>();
    public readonly instance: BunServer;

    private addRoute(path: string, route: Route<T>): void {
        const store = this.router.register(path);
        store[0] = route;
    }

    private fetch() {
        return (request: Request) => {
            const url = new URL(request.url);
            const route = this.router.find(url.pathname);
            if (route === null) {
                return new Response(`Route not found for ${request.url}`, {
                    status: 404
                });
            }
            const routeStore = route.store[0] as T;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return routeStore[request.method.toLowerCase()](
                request,
                route.params
            );
        };
    }

    public constructor(routes: Record<string, T>, options?: any) {
        for (const route of Object.values(routes as Record<string, Route<T>>)) this.addRoute(route.path, route);

        // eslint-disable-next-line @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-argument
        this.instance = Bun.serve({ fetch: this.fetch, ...options });
    }
}

