import { Server, route } from '../src/router/rest'

@route('/')
class Home {
  GET() {
    const routes = Object.entries(server.routes).map(([routeClass, route]) => {
      return {
        class: routeClass,
        path: route.path,
        methods: route.handlers.map((handler) => handler.name)
      }
    })
    return Response.json({
      routes
    })
  }
}

@route('/test')
class Test {
  async POST(request: Request) {
    return Response.json({ object: await request.json() })
  }
}

// class SomeInvalidRoute {
//   GET() {
//     return Response.json({ "message": "This is an invalid request, you will never see this message as a response" });
//   }
// }

const server = new Server(
  {
    Home,
    Test
    // SomeInvalidRoute // This will throw an error as the class is not decorated with @route
  },
  {
    middleware: (request) => {
      console.log(`Request to ${request.url}`)

      /**
       * Returning a response from middleware will prevent the route from being called
       * and will instead return the response from the middleware.
       */
      // return Response.json({ "message": "Hello, world!" });

      /**
       * Returning a request from middleware will modify the request and continue to the route.
       */
      // request.headers.set("X-Server", "Cloudflare Workers");
      // return request;
    },
    middlewarePaths: ['*/']
  }
)

console.log(`API running on port ${server.instance.port}`)
