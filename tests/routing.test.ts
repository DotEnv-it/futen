/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable @typescript-eslint/naming-convention */
import Futen, { route } from '../dist/index.mjs';
import Router from '../dist/router/index.mjs';
import { describe, test, expect } from 'bun:test';
import type { FutenHTTPRoute } from '../dist/index.mjs';

describe('REST BASIC ROUTING EXAMPLE', () => {
    @route('/')
    class Home {
        public get(): Response {
            return Response.json({ hello: 'world' });
        }
    }

    @route('/test')
    class Test {
        public post(): Response {
            return Response.json({ hello: 'world' });
        }
    }

    @route('/test/:id')
    class TestWithParams {
        public get(_reqest: Request, params: { id: string }): Response {
            return Response.json({ id: params.id });
        }
    }

    const server = new Futen(
        {
            Home,
            Test,
            TestWithParams
        },
        {
            port: 0
        }
    );

    const { port } = server.instance;

    test('should return basic response', async () => {
        const response = await server.instance.fetch(new Request(`http://localhost:${port}/`));
        const body = await response.json();
        expect(body).toEqual({ hello: 'world' });
    });

    test('should return 404', async () => {
        const response = await server.instance.fetch(new Request(`http://localhost:${port}/not-found`));
        expect(response.status).toBe(404);
    });

    test('should return response with params', async () => {
        const response = await server.instance.fetch(new Request(`http://localhost:${port}/test/123`));
        const body = await response.json();
        expect(body).toEqual({ id: '123' });
    });

    test('should return 405 with wrong method', async () => {
        const response = await server.instance.fetch(new Request(`http://localhost:${port}/test/123`, { method: 'DELETE' }));
        expect(response.status).toBe(405);
    });
});

function create(path: string): FutenHTTPRoute {
    @route(path)
    class Route {
        public get(_request: Request, params: any): Response {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            return Response.json({ path, params });
        }
    }
    // @ts-expect-error - This is valid
    return Route;
}

describe('REST RESPONSES', () => {
    const routes = [
        '/',
        '/user',
        '/user/:userID',
        '/user/:userID/posts',
        '/static/js/*',
        '/static/*',
        '/api/login',
        '/api/projects',
        '/api/people',
        '/api/postings',
        '/api/postings/details',
        '/api/postings/details/misc',
        '/api/postings/details/misc/many',
        '/api/postings/details/misc/many/nodes',
        '/api/postings/details/misc/many/nodes/deep',
        '/api/posts',
        '/api/posts/:postID',
        '/api/posts/:postID/comments',
        '/api/posts/:postID/comments/:commentID',
        '/medium/length/',
        '/very/very/long/long/route/route/path',
        '/v:version/api/login',
        '/user/v:version/:userID'
    ];

    const testURLs = {
        '/': { code: 200, body: { path: '/', params: {} } },
        '/use': { code: 404, body: {} },
        '/user': { code: 200, body: { path: '/user', params: {} } },
        '/user/0123456789': {
            code: 200,
            body: { path: '/user/:userID', params: { userID: '0123456789' } }
        },
        '/user/0123456789012345678901234567890123456789': {
            code: 200,
            body: {
                path: '/user/:userID',
                params: { userID: '0123456789012345678901234567890123456789' }
            }
        },
        '/user/0123456789/posts': {
            code: 200,
            body: { path: '/user/:userID/posts', params: { userID: '0123456789' } }
        },
        '/static/js/common.js': {
            code: 200,
            body: { path: '/static/js/*', params: { $: 'common.js' } }
        },
        '/static/json/config.json': {
            code: 200,
            body: {
                path: '/static/*',
                params: {
                    $: 'json/config.json'
                }
            }
        },
        '/static/css/styles.css': {
            code: 200,
            body: {
                path: '/static/*',
                params: {
                    $: 'css/styles.css'
                }
            }
        },
        '/static/': {
            code: 200,
            body: {
                path: '/static/*',
                params: {
                    $: ''
                }
            }
        },
        '/api/login': { code: 200, body: { path: '/api/login', params: {} } },
        '/api/postings/details/misc/many/nodes/deep': {
            code: 200,
            body: { path: '/api/postings/details/misc/many/nodes/deep', params: {} }
        },
        '/api/posts/0123456789': {
            code: 200,
            body: { path: '/api/posts/:postID', params: { postID: '0123456789' } }
        },
        '/api/posts/0123456789/comments': {
            code: 200,
            body: {
                path: '/api/posts/:postID/comments',
                params: { postID: '0123456789' }
            }
        },
        '/api/posts/0123456789/comments/0123456789': {
            code: 200,
            body: {
                path: '/api/posts/:postID/comments/:commentID',
                params: { postID: '0123456789', commentID: '0123456789' }
            }
        },
        '/medium/length/': {
            code: 200,
            body: { path: '/medium/length/', params: {} }
        },
        '/very/very/long/long/route/route/path': {
            code: 200,
            body: { path: '/very/very/long/long/route/route/path', params: {} }
        },
        '/404-not-found': { code: 404, body: {} },
        '/?q': { code: 200, body: { path: '/', params: {} } },
        '/use?q': { code: 404, body: {} },
        '/user?q': { code: 200, body: { path: '/user', params: {} } },
        '/user/0123456789?q': {
            code: 200,
            body: { path: '/user/:userID', params: { userID: '0123456789' } }
        },
        '/user/0123456789?querystringisreallyreallylong': {
            code: 200,
            body: {
                path: '/user/:userID',
                params: { userID: '0123456789' }
            }
        },
        '/static/css/styles.css?q': {
            code: 200,
            body: {
                path: '/static/*',
                params: {
                    $: 'css/styles.css'
                }
            }
        },
        '/404-not-found?q': { code: 404, body: {} },
        '/v1/api/login': {
            code: 200,
            body: { path: '/v:version/api/login', params: { version: '1' } }
        },
        '/user/v1/0123456789': {
            code: 200,
            body: {
                path: '/user/v:version/:userID',
                params: { version: '1', userID: '0123456789' }
            }
        }
    };

    const Routes: Record<string, any> = {};
    for (const path of routes) Routes[path] = create(path);

    const server = new Futen(Routes, {
        port: 0
    });

    test('should check alignment of route data', () => {
        expect(Object.keys(Routes).length).toBe(routes.length);
        expect(Object.keys(server.routes).length).toBe(routes.length);
    });

    const { port } = server.instance;

    for (const [url, { code, body } ] of Object.entries(testURLs)) {
        let response: Response;
        test(`should return ${code} for ${url}`, async () => {
            response = await server.instance.fetch(new Request(`http://localhost:${port}${url}`));
            expect(response.status).toBe(code);
        });

        if (code === 200) {
            test(`should return ${JSON.stringify(body)} for ${url}`, async () => {
                const responseBody = await response.json();
                expect(responseBody).toEqual(body);
            });
        }
    }
});

describe('SIMPLE ROUTING', () => {
    const routes = [
        '/',
        '/user',
        '/user/:userID',
        '/user/:userID/posts',
        '/static/js/*',
        '/static/*',
        '/api/login',
        '/api/projects',
        '/api/people',
        '/api/postings',
        '/api/postings/details',
        '/api/postings/details/misc',
        '/api/postings/details/misc/many',
        '/api/postings/details/misc/many/nodes',
        '/api/postings/details/misc/many/nodes/deep',
        '/api/posts',
        '/api/posts/:postID',
        '/api/posts/:postID/comments',
        '/api/posts/:postID/comments/:commentID',
        '/medium/length/',
        '/very/very/long/long/route/route/path',
        '/v:version/api/login',
        '/user/v:version/:userID'
    ];

    const testURLs = {
        '/': true,
        '/use': false,
        '/user': true,
        '/user/0123456789': true,
        '/user/0123456789012345678901234567890123456789': true,
        '/user/0123456789/posts': true,
        '/static/js/common.js': true,
        '/static/json/config.json': true,
        '/static/css/styles.css': true,
        '/static/': true,
        '/api/login': true,
        '/api/postings/details/misc/many/nodes/deep': true,
        '/api/posts/0123456789': true,
        '/api/posts/0123456789/comments': true,
        '/api/posts/0123456789/comments/0123456789': true,
        '/medium/length/': true,
        '/very/very/long/long/route/route/path': true,
        '/404-not-found': false,
        '/?q': true,
        '/use?q': false,
        '/user?q': true,
        '/user/0123456789?q': true,
        '/user/0123456789?querystringisreallyreallylong': true,
        '/static/css/styles.css?q': true,
        '/404-not-found?q': false,
        '/v1/api/login': true,
        '/user/v1/0123456789': true
    };

    const router = new Router();

    for (const path of routes) router.register(path);

    for (const [url, expected] of Object.entries(testURLs)) {
        test(`should return ${expected ? 'found' : 'not found'} for ${url}`, () => {
            expect(router.find(url) !== null).toBe(expected);
        });
    }
});
