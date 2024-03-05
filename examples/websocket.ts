import { ServerWebSocket } from 'bun'
import { WebSocketServer, ws } from '../src/router/websocket'

@ws('/websocket1')
class WebSocket1 {
  message(ws: ServerWebSocket, message: string) {
    console.log(message + ' from websocket1')
    return ws.send(message)
  }

  close(ws: ServerWebSocket) {
    console.log('WebSocket closed')
    return ws.close()
  }

  open(ws: ServerWebSocket) {
    console.log('WebSocket opened')
    return ws.send('Hello, world!')
  }
}

@ws('/websocket2/:id/:id2')
class WebSocket2 {
  message(
    ws: ServerWebSocket,
    message: string,
    _params: { id: string; id2: string }
  ) {
    console.log(message + ' from websocket2')
    return ws.send(message)
  }

  close(
    ws: ServerWebSocket,
    _code: number,
    _message: string,
    _params: { id: string; id2: string }
  ) {
    console.log('WebSocket closed from websocket2')
    return ws.close()
  }

  open(ws: ServerWebSocket, _params: { id: string; id2: string }) {
    console.log('WebSocket opened from websocket2')
    return ws.send('Hello, world!')
  }
}

const wsServer = new WebSocketServer(
  {
    WebSocket1,
    WebSocket2
  },
  {
    middleware: (request) => {
      console.log(`WebSocket request to ${request.url}`)
    }
  }
)

console.log(`Active WebSocket port: ${wsServer.instance.port}`)
