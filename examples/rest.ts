import { Futen } from "../src/router/core"
import { middleware, route } from "../src/router/decorators"

@middleware([(request) => {
  console.log(`Request to ${request.url}`)
}, (request) => {
  console.log(`Request to ${request.url} - The Second`)
}])
@route('/')
class Home {
  get() {
    const routes = Object.entries(server.routes).map(([routeClass, route]) => {
      return {
        class: routeClass,
        path: route.path
      }
    })
    const thisClassAsARoute = server.routes.Home
    return Response.json({
      routes
    })
  }
}

@route('/test')
class Test {
  // @route('/') // Throws
  async post(request: Request) {
    return Response.json({ object: await request.json() })
  }

  // @route('/') // Throws
  private prop = 'This is a private property'

  // @route('/') // Throws
  method() {
    return Response.json({ message: 'This is a method' })
  }
}

// class SomeInvalidRoute {
//   get() {
//     return Response.json({ "message": "This is an invalid request, you will never see this message as a response" });
//   }
// }

const server = new Futen(
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
    middlewarePaths: ['/test']
  }
)

console.log(`API running on port ${server.instance.port}`)
