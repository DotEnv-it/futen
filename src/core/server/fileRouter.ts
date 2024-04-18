import { Route } from '.';
import { ws } from '../decorators/websocket';
import { route } from '../decorators/http';

type apiResourcesMap = {
    ws: string[];
    http: string[];
};

function decorate(
    pathname: string,
    handler: new () => object,
    apiResourcesMap: apiResourcesMap
): Route<unknown> {
    for (let i = 0; i < apiResourcesMap.ws.length; i++) {
        if (new Bun.Glob(apiResourcesMap.ws[i]).match(pathname))
            return ws(pathname)(handler);
    }

    for (let i = 0; i < apiResourcesMap.http.length; i++) {
        if (new Bun.Glob(apiResourcesMap.http[i]).match(pathname))
            return route(pathname)(handler);
    }
    throw new Error(
        `Route ${pathname} does not match any API resource, please specify the type of resource`
    );
}

/**
 * @param path Relative to the entry point of the application @see Bun.main
 * @param apiResourcesMap A map of glob patterns to match the routes and their types
 *
 * @note Slower on startup, but easier to setup
 */
export function routesFrom(
    path: string,
    apiResourcesMap: apiResourcesMap = {
        ws: ['/ws**'],
        http: ['/**']
    }
): Record<string, unknown> {
    const Routes = {} as Record<string, unknown>;
    const API = new Bun.FileSystemRouter({
        dir: `${Bun.main.substring(0, Bun.main.lastIndexOf('/'))}/${path}`,
        style: 'nextjs'
    });

    for (
        let i = 0, entries = Object.entries(API.routes), len = entries.length;
        i < len;
        i++
    ) {
        let [endpoint, pathname] = entries[i];
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const Handler = import.meta.require(pathname).default as
            | (new () => object)
            | undefined;

        if (Handler === undefined) continue;
        if (endpoint.endsWith('/')) endpoint = endpoint.slice(0, -1);
        if (Handler instanceof Route) {
            if (Handler.path === '') Handler.path = endpoint;
            Routes[endpoint] = Handler;
        } else if (!Handler.toString().includes('class')) continue;
        else Routes[endpoint] = decorate(endpoint, Handler, apiResourcesMap);
    }
    return Routes;
}
