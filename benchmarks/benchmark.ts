import Benchmark from 'benchmark'
import { HTTPServer, route } from '../dist/index.mjs'

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
]
const testURLs = [
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
  // With query string
  '/?q',
  '/use?q',
  '/user?q',
  '/user/0123456789?q',
  '/user/0123456789?querystringisreallyreallylong',
  '/static/css/styles.css?q',
  '/404-not-found?q'
]

class RouteFactory {
  static create(path: string) {
    @route(path)
    class Route {
      GET(_request: Request, params: any) {
        return Response.json({ path, params })
      }
    }
    return Route
  }
}

const Routes: Record<string, any> = {}
for (const path of routes) {
  Routes[path] = RouteFactory.create(path)
}

const server = new HTTPServer(Routes, { port: 0 })

const benchSuite = new Benchmark.Suite()

for (const url of testURLs) {
  benchSuite.add(url + ' ', () => {
    server.router.find(url)
  })
}

benchSuite.on('cycle', (event) => {
  console.log(String(event.target))
}).run()
