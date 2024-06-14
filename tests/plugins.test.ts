import Futen, { route } from '../dist/index.mjs';
import { describe, test, expect } from 'bun:test';

type CORSHeaders = Partial<{
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
}>;

function CORS(server: Futen<any>, policies: CORSHeaders) {
    async function CORSFetch(request: Request) {
        const response = await server.fetch()(request, server.instance);
        for (const [key, value] of Object.entries(policies)) {
            response.headers.set(key, value);
        }
        return response;
    };
    server.instance.fetch = CORSFetch;
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
    });

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
