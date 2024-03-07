import { describe, test, expect } from 'bun:test'
import { HTTPServer, route, middleware } from '../dist/index.mjs'

describe('MIDDLEWARE', () => {
  test('runs middleware on server scope', async () => {
    @route('/')
    class Index {
      get(request: Request) {
        return Response.json({ hello: 'world' }, { headers: request.headers })
      }
    }

    const server = new HTTPServer(
      { Index },
      {
        middleware: (request) => {
          request.headers.set('x-middleware', 'true')
          return request
        },
        middlewarePaths: ['*/'],
        port: 0
      }
    )

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    )
    expect(await response.json()).toEqual({ hello: 'world' })
    expect(response.headers.get('x-middleware')).toBe('true')

    server.instance.stop()
  })

  test('runs middleware on route scope', async () => {
    @middleware((request) => {
      request.headers.set('x-middleware', 'true')
      return request
    })
    @route('/')
    class Index {
      get(request: Request) {
        expect(request.headers.get('x-middleware')).toBe('true')
        return Response.json({ hello: 'world' }, { headers: request.headers })
      }
    }

    const server = new HTTPServer({ Index }, { port: 0 })

    const response = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    )
    expect(await response.json()).toEqual({ hello: 'world' })
    expect(response.headers.get('x-middleware')).toBe('true')

    server.instance.stop()
  })

  test('runs multiple middlewares on route scope', async () => {
    @middleware((request) => {
      request.headers.set('x-middleware', 'true')
      return request
    })
    @middleware((request) => {
      request.headers.set('x-middleware2', 'true')
      request.headers.set('x-middleware', 'false')
      return request
    })
    @route('/')
    class Index {
      get(request: Request) {
        return Response.json({ hello: 'world' }, { headers: request.headers })
      }
    }

    const server = new HTTPServer({ Index }, { port: 0 })

    const body = await server.instance.fetch(
      new Request(`http://localhost:${server.instance.port}/`)
    )
    expect(await body.json()).toEqual({ hello: 'world' })
    expect(body.headers.get('x-middleware')).toBe('false')
    expect(body.headers.get('x-middleware2')).toBe('true')

    server.instance.stop()
  })
})
