// Byte
import Futen, { route } from '../../dist/index.mjs';
import test from './test';
import { Byte, send } from '@bit-js/byte';

// Hono
import { Hono } from 'hono';
import { RegExpRouter } from 'hono/router/reg-exp-router';

// Main testing

function createByte(): (arg0: Request) => any {
    const app = new Byte()
        .get('/user', () => send.body('User'))
        .get('/user/comments', () => send.body('User comments'))
        .get('/user/avatar', () => send.body('User avatar'))
        .get('/event/:id', (ctx) => send.body(`Event ${ctx.params.id}`))
        .get('/event/:id/comments', (ctx) => send.body(`Event ${ctx.params.id} comments`))
        .get('/status', () => send.body('Status'))
        .get('/deeply/nested/route/for/testing', () => send.body('Deeply nested route for testing'));

    return app.fetch;
}

function createHono(): (arg0: Request) => any {
    const app = new Hono({ router: new RegExpRouter() })
        .get('/user', (ctx) => ctx.body('User'))
        .get('/user/comments', (ctx) => ctx.body('User comments'))
        .get('/user/avatar', (ctx) => ctx.body('User avatar'))
        .get('/event/:id', (ctx) => ctx.body(`Event ${ctx.req.param('id')}`))
        .get('/event/:id/comments', (ctx) => ctx.body(`Event ${ctx.req.param('id')} comments`))
        .get('/status', (ctx) => ctx.body('Status'))
        .get('/deeply/nested/route/for/testing', (ctx) => ctx.body('Deeply nested route for testing'));

    return app.fetch;
}

function createFuten(): (arg0: Request) => any {
    @route('/user')
    class User {
        public get(): Response {
            return new Response('User');
        }
    }
    @route('/user/comments')
    class UserComments {
        public get(): Response {
            return new Response('User comments');
        }
    }
    @route('/user/avatar')
    class UserAvatar {
        public get(): Response {
            return new Response('User avatar');
        }
    }
    @route('/event/:id')
    class Event {
        public get(req: any, params: { id: any }): Response {
            return new Response(`Event ${params.id}`);
        }
    }
    @route('/event/:id/comments')
    class EventComments {
        public get(req: any, params: { id: any }): Response {
            return new Response(`Event ${params.id} comments`);
        }
    }
    @route('/status')
    class Status {
        public get(): Response {
            return new Response('Status');
        }
    }
    @route('/deeply/nested/route/for/testing')
    class DeeplyNestedRouteForTesting {
        public get(): Response {
            return new Response('Deeply nested route for testing');
        }
    }

    const app = new Futen({
        User,
        UserComments,
        UserAvatar,
        Event,
        EventComments,
        Status,
        DeeplyNestedRouteForTesting
    }, { port: 0 });
    const serverInstance = app.instance;
    return serverInstance.fetch.bind(serverInstance);
}

console.log('Benchmarking...');
const { benchmarks } = await test({
    Byte: createByte(),
    Hono: createHono(),
    Futen: createFuten()
});

const groupResult: Record<string, string[]> = {};

for (let i = 0, { length } = benchmarks; i < length; ++i) {
    const result = benchmarks[i]; const { group } = result;
    if (group === null) continue;

    groupResult[group] ??= [];
    if (result === undefined) continue;
    if (result.stats === undefined) continue;
    groupResult[group].push(`- ${result.name}: ${Math.round(result.stats.avg)}ns\n`);
}

for (const group in groupResult) console.log(`${group}:\n${groupResult[group].join('')}`);
