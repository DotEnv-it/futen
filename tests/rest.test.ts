import Futen, { route } from '../dist/index.mjs';
import { describe, test, expect } from 'bun:test';

describe('REST', () => {
    @route('/')
    class Home {
        public get(): Response {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
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
    );

    const { port } = server.instance;
    test('should return routes', async () => {
        const response = await server.instance.fetch(
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
    });

    test('should return request body', async () => {
        const response = await server.instance.fetch(
            new Request(`http://localhost:${port}/test`, {
                method: 'post',
                body: JSON.stringify({ hello: 'world' })
            })
        );
        const body = await response.json();
        expect(body).toEqual({ object: { hello: 'world' } });
    });
});
