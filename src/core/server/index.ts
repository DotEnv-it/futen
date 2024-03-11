import Router from '../../router';

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
    }
}

export class Futen<T> {
    public readonly routes: any;
    public readonly serverInstance: any;
    public readonly router = new Router();

    public constructor(routes: Record<string, Route<T>>) {
        console.log('Registering routes...');
        for (const route of Object.values(routes)) this.router.register(route.path);
    }
}
