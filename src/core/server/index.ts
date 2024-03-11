import Router from '../../router';
import { HTTPMethod } from '../decorators/http';
import type { Server as BunServer, ServeOptions } from 'bun';
import type { HTTPMethods } from '../decorators/http';

type MethodType = HTTPMethods;

function overrideMethods<T, K>(
    target: T,
    methods: MethodType,
    override: K
): T {
    for (const method in methods) {
        if (override[method]) {
            Object.defineProperty(target, method, {
                value: override[method as keyof K],
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

        overrideMethods(this, HTTPMethod, target.prototype);
    }
}

export default class Futen<T> {
    public readonly router = new Router<Route<T>>();
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

            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return route.store[0][request.method.toLowerCase()](
                request,
                route.params
            );
        };
    }

    public constructor(routes: Record<string, T>, options?: ServeOptions) {
        for (const route of Object.values(routes as Record<string, Route<T>>)) this.addRoute(route.path, route);

        this.instance = Bun.serve({ fetch: this.fetch(), ...options });
    }
}

