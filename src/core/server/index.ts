import Router from '../../router';
import { HTTPMethod } from '../decorators/http';
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
    public readonly router = new Router();

    public constructor(routes: Record<string, Route<T>>) {
        for (const route of Object.values(routes)) this.router.register(route.path);
    }
}
