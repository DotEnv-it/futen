import Futen, { route } from '../dist/index.mjs';
import { describe, test, expect } from 'bun:test';

type HTTPMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH';
type Concat<T extends string, U extends string> = `${T},${U}` | `${U},${T}` | `${T}, ${U}` | `${U}, ${T}` | T | U;
type Combine<T extends string, U extends string = T> = T extends any ? Concat<T, Combine<Exclude<U, T>>> : never;
type MethodsList = Combine<HTTPMethods>;

/**
 * https://developer.mozilla.org/en-US/docs/Glossary/CORS#cors_headers
 */
type CORSHeaders = Partial<{
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Allow-Methods': MethodsList | '*';
    'Access-Control-Expose-Headers': string;
    'Access-Control-Max-Age': string;
    'Access-Control-Request-Headers': string;
    'Access-Control-Request-Method': string;
    Origin: string;
    'Timing-Allow-Origin': string;
}>;
export function CORS(server: Futen<Record<string, unknown>>, policies: CORSHeaders): void {
    server.instance.fetch = async function (request: Request): Promise<Response> {
        if (request.method === 'OPTIONS') {
            return new Response('departed', {
                headers: policies
            });
        }
        const response = (await server.fetch()(request)) as Response;
        for (const [key, value] of Object.entries(policies)) response.headers.set(key, value);
        return response;
    };
}

describe('PLUGINS', () => {
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
            });
        }
    }

    @route('/test')
    class Test {
        public async post(request: Request): Promise<Response> {
            return Response.json({ object: await request.json() });
        }
    }

    const server = new Futen(
        {
            Home,
            Test
        },
        {
            port: 0
        }
    ).plug(CORS, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*',
        'Access-Control-Allow-Headers': '*'
    } as const);

    const { port } = server.instance;
    test('should return routes', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/`)
        );
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
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
    });

    test('should return request body', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/test`, {
                method: 'post',
                body: JSON.stringify({ hello: 'world' })
            })
        );
        const body = await response.json();
        expect(body).toEqual({ object: { hello: 'world' } });
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
    });

    test('should return CORS headers', async () => {
        const response = await fetch(
            new Request(`http://localhost:${port}/`)
        );
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Headers')).toBe('*');
    });
});
