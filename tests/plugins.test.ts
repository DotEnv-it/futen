import Futen, { route } from '../dist/index.mjs';
import { describe, test, expect } from 'bun:test';

type HTTPMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';
type Concat<T extends string, U extends string> = `${T}, ${U}` | T | U;
type Combine<T extends string, U extends string = T> = T extends string ? Concat<T, Combine<Exclude<U, T>>> : never;
type MethodsList = Combine<HTTPMethods>;

/**
 * https://developer.mozilla.org/en-US/docs/Glossary/CORS#cors_headers
 */
type CORSHeaders = Partial<{
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': 'true';
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': MethodsList | '*';
    'Access-Control-Expose-Headers': string;
    'Access-Control-Max-Age': string;
    'Access-Control-Request-Headers': string;
    'Access-Control-Request-Method': string;
    Origin: string;
    'Timing-Allow-Origin': string;
}>;
function CORS<S extends Futen>(server: S, policies: CORSHeaders): void {
    server.instance.fetch = async function (request: Request): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response('departed', {
                headers: policies
            });
        }
        const response = (await server.fetch()(request, server.instance)) as Response;
        for (const [key, value] of Object.entries(policies)) {
            if (response.headers.has(key)) continue;
            response.headers.set(key, value);
        }
        return response;
    };
}

function Swagger<S extends Futen>(server: S, path = '/swagger.json'): void {
    const SwaggerRoute = route(path)(
        class {
            public get(): Response {
                const routes = Object.entries(server.routes).map(
                    ([routeClass, handler]) => {
                        return {
                            class: routeClass,
                            methods: Object.values(handler).filter((property) => {
                                if (typeof property !== 'function') return false;
                                return ['get', 'head', 'post', 'put', 'delete', 'connect', 'options', 'trace', 'patch'].includes((property as Function).name);
                            }).map((method: Function) => method.name.toLowerCase()),
                            path: handler.path
                        };
                    }
                );
                return Response.json({
                    routes
                });
            }
        }
    );
    const swagger = server.router.register(path);
    swagger[0] = SwaggerRoute as unknown as typeof swagger[0];
}

describe('MULTIPLE PLUGINS', () => {
    @route('/')
    class Home {
        public get(): Response {
            const routes = Object.entries(server.routes).map(
                ([routeClass, handler]) => {
                    return {
                        class: routeClass,
                        path: handler.path
                    };
                }
            );
            return Response.json({
                routes
            }, {
                headers: {
                    'Access-Control-Allow-Origin': 'localhost',
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }
    }

    const Test = route('/test')(
        class {
            public async post(request: Request): Promise<Response> {
                return Response.json({ object: await request.json() });
            }
        }
    )

    const server = new Futen(
        {
            Home,
            Test
        },
        {
            port: 0
        }
    )
        .plug(CORS, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, PATCH',
            'Access-Control-Allow-Headers': '*'
        })
        .plug(Swagger)

    const { port } = server.instance;
    test('should return routes and overriden CORS headers', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/`)
        );
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('localhost');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
        const body = await response.json();
        expect(body).toEqual({
            routes: [
                {
                    class: 'Home',
                    path: '/'
                },
                {
                    class: 'Test',
                    path: '/test'
                }
            ]
        });
    });

    test('should return request body', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/test`, {
                method: 'post',
                body: JSON.stringify({ hello: 'world' })
            })
        );
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS, DELETE, PUT, PATCH');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
        const body = await response.json();
        expect(body).toEqual({ object: { hello: 'world' } });
    });

    test('should return CORS headers from the route', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/`)
        );
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('localhost');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });

    test('should return swagger.json', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/swagger.json`)
        );
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS, DELETE, PUT, PATCH');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
        const body = await response.json();
        expect(body).toEqual({
            routes: [
                {
                    class: 'Home',
                    methods: ['get'],
                    path: '/'
                },
                {
                    class: 'Test',
                    methods: ['post'],
                    path: '/test'
                }
            ]
        });
    });
});

describe('ROUTE PLUGIN', () => {
    @route('/')
    class Home {
        public get(): Response {
            return Response.json({ hello: 'world' });
        }
    }

    const server = new Futen(
        {
            Home
        },
        {
            port: 0
        }
    )
        .plug(Swagger)

    const { port } = server.instance;
    test('should return routes', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/swagger.json`)
        );
        const body = await response.json();
        expect(body).toEqual({ routes: [{ class: 'Home', methods: ['get'], path: '/' }] });
    });
});

describe('FETCH PLUGIN', () => {
    @route('/')
    class Home {
        public get(): Response {
            return Response.json({ hello: 'world' });
        }
    }

    const server = new Futen(
        {
            Home
        },
        {
            port: 0
        }
    )
        .plug(CORS, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT, PATCH',
            'Access-Control-Allow-Headers': '*'
        } as const)

    const { port } = server.instance;
    test('should return routes and overriden CORS headers', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/`)
        );
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS, DELETE, PUT, PATCH');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
        const body = await response.json();
        expect(body).toEqual({ hello: 'world' });
    });
});
