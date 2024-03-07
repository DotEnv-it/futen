import { describe, test, expect } from 'bun:test'
import { HTTPServer, route } from '../dist/index.mjs'

describe('REST', () => {
  @route('/')
  class Home {
    get() {
      const routes = Object.entries(server.routes).map(
        ([routeClass, route]) => {
          return {
            class: routeClass,
            path: route.path
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
    async post(request: Request) {
      return Response.json({ object: await request.json() })
    }
  }

  const server = new HTTPServer(
    {
      Home,
      Test
    },
    {
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
          path: '/'
        },
        {
          class: 'Test',
          path: '/test'
        }
      ]
    })
  })

  test('should return request body', async () => {
    const response = await server.instance.fetch(
      new Request(`http://localhost:${port}/test`, {
        method: 'post',
        body: JSON.stringify({ hello: 'world' })
      })
    )
    const body = await response.json()
    expect(body).toEqual({ object: { hello: 'world' } })
  })
})
