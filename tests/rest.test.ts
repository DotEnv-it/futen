import { describe, test, expect } from 'bun:test'
import { Server, route } from '../dist/index.mjs'

describe('REST', () => {
  @route('/')
  class Home {
    GET() {
      const routes = Object.entries(server.routes).map(
        ([routeClass, route]) => {
          return {
            class: routeClass,
            path: route.path,
            methods: route.handlers.map((handler) => handler.name)
          }
        }
      )
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

  const server = new Server(
    {
      Home,
      Test
    },
    {
      middleware: (request) => {
        expect(request.url).toBe(`http://localhost:${port}/`)
      },
      middlewarePaths: ['*/'],
      port: 0
    }
  )

  const port = server.instance.port
  test('should return routes', async () => {
    const response = await server.instance.fetch(
      new Request(`http://localhost:${port}/`)
    )
    const body = await response.json()
    expect(body).toEqual({
      routes: [
        {
          class: 'Home',
          path: '/',
          methods: ['GET']
        },
        {
          class: 'Test',
          path: '/test',
          methods: ['POST']
        }
      ]
    })
  })

  test('should return request body', async () => {
    const response = await server.instance.fetch(
      new Request(`http://localhost:${port}/test`, {
        method: 'POST',
        body: JSON.stringify({ hello: 'world' })
      })
    )
    const body = await response.json()
    expect(body).toEqual({ object: { hello: 'world' } })
  })
})
