import { describe, test, expect } from 'bun:test'
import { WebSocketServer, ws } from '../dist/index.mjs'
import { ServerWebSocket } from 'bun'

describe('WebSocket', () => {
  @ws('/websocket1')
  class WebSocket1 {
    message(ws: ServerWebSocket, message: string) {
      return ws.send(message + ' I received your message')
    }

    close(ws: ServerWebSocket) {
      return ws.close()
    }

    open(ws: ServerWebSocket) {
      return ws.send('Hello, world! from FirstWebSocket')
    }
  }

  @ws('/websocket2/:id/:id2')
  class WebSocket2 {
    message(
      ws: ServerWebSocket,
      message: string,
      params: { id: string; id2: string }
    ) {
      if (message === 'Close me, please!') {
        return wsServer.websockets.WebSocket2.close(
          ws,
          1000,
          `Goodbye, world! from SecondWebSocket with params ${JSON.stringify(params)}`
        )
      }
      const messageWithParams =
        message + ' from SecondWebSocket' + JSON.stringify(params)
      return ws.send(messageWithParams)
    }

    close(
      ws: ServerWebSocket,
      code: number,
      message: string,
      params: { id: string; id2: string }
    ) {
      expect(code).toBe(1000)
      return ws.close(
        1000,
        `WebSocket closed from SecondWebSocket with code 1000 and message ${message} and params ${JSON.stringify(params)}`
      )
    }

    open(ws: ServerWebSocket, params: { id: string; id2: string }) {
      const openMessage = `WebSocket opened from SecondWebSocket with params ${JSON.stringify(params)}`
      return ws.send(openMessage)
    }
  }

  const wsServer = new WebSocketServer(
    {
      WebSocket1,
      WebSocket2
    },
    {
      port: 0
    }
  )

  const randomPort = wsServer.instance.port
  test('should verify the ports of the instances', () => {
    expect(randomPort).toBeGreaterThan(0)
  })

  test('should verify the paths of the instances', () => {
    expect(wsServer.websockets.WebSocket1.path).toBe('/websocket1')
    expect(wsServer.websockets.WebSocket2.path).toBe('/websocket2/:id/:id2')
  })

  test('should verify the message event of the instances', async () => {
    const ws = new WebSocket(`ws://localhost:${randomPort}/websocket1`)
    let expectsFired = 0
    ws.onmessage = (event) => {
      expect(event.data).toBe('Hello, world! from FirstWebSocket')
      ws.close()
      expectsFired++
    }
    ws.onopen = () => ws.send('Hello, world!')
    await new Promise((resolve) => (ws.onclose = resolve))
    expect(expectsFired).toBe(1)
  })

  test('should verify the message event with params of the instances', async () => {
    const ws = new WebSocket(`ws://localhost:${randomPort}/websocket2/1/2`)
    let expectsFired = 0
    ws.onmessage = (event) => {
      expect(event.data).toBe(
        'WebSocket opened from SecondWebSocket with params {"id2":"2","id":"1"}'
      )
      ws.close()
      expectsFired++
    }
    ws.onopen = () => ws.send('Hello, world!')
    await new Promise((resolve) => (ws.onclose = resolve))
    expect(expectsFired).toBe(1)
  })

  test('should verify the close event of the instances', async () => {
    const ws = new WebSocket(`ws://localhost:${randomPort}/websocket2/1/2`)
    let expectsFired = 0
    ws.onclose = (event) => {
      expect(event.code).toBe(1000)
      expect(event.reason).toBe(
        'WebSocket closed from SecondWebSocket with code 1000 and message Goodbye, world! and params {"id":"1","id2":"2"}'
      )
      expectsFired++
    }
    ws.onopen = () => {
      ws.send('Close me, please!')
    }
    await new Promise((resolve) => (ws.onclose = resolve))
    expect(expectsFired).toBe(0)
  })
})
