import Router from '../../src/router';
import Benchmark from 'benchmark';

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
    '/very/very/long/long/route/route/path'
];
const testUrls = [
    '/',
    '/use',
    '/user',
    '/user/0123456789',
    '/user/0123456789012345678901234567890123456789',
    '/user/0123456789/posts',
    '/static/js/common.js',
    '/static/json/config.json',
    '/static/css/styles.css',
    '/static/',
    '/api/login',
    '/api/postings/details/misc/many/nodes/deep',
    '/api/posts/0123456789',
    '/api/posts/0123456789/comments',
    '/api/posts/0123456789/comments/0123456789',
    '/medium/length/',
    '/very/very/long/long/route/route/path',
    '/404-not-found',
    '/?q',
    '/use?q',
    '/user?q',
    '/user/0123456789?q',
    '/user/0123456789?querystringisreallyreallylong',
    '/static/css/styles.css?q',
    '/404-not-found?q'
];

const router = new Router();
console.log('Registering routes...');
for (const path of routes) router.register(path);

console.log('Starting benchmark...');
const benchSuite = new Benchmark.Suite();

console.log('Benchmarking...');
for (const url of testUrls) {
    benchSuite.add(`${url} `, () => {
        router.find(url);
    });
}

benchSuite.on('cycle', (event: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.log(String(event.target));
}).run();
