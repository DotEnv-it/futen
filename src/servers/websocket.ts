import { ServerWebSocket, WebSocketServeOptions } from 'bun'
import Router from '../router/routing.ts'

/**
 * Standard WebSocket events which are automatically picked up by the router
 *
 * ---
 *
 * Compatible with Bun base WebSocket server
 * @link https://bun.sh/docs/api/websockets#reference
 */
export const WSEvent = {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  message: (
    _ws: ServerWebSocket,
    _message: string | ArrayBuffer | Uint8Array
  ) => {},
  open: (_ws: ServerWebSocket) => {},
  close: (_ws: ServerWebSocket, _code: number, _reason: string) => {},
  drain: (_ws: ServerWebSocket) => {},
  ping: (_ws: ServerWebSocket, _data: Buffer) => {},
  pong: (_ws: ServerWebSocket, _data: Buffer) => {}
  /* eslint-enable @typescript-eslint/no-unused-vars */
} satisfies WebSocketServeOptions['websocket']

/**
 * Helper function to handle WebSocket events with multiple routes
 * @param routes Instance of the router
 * @returns Wrapper on the WSEvent object to handle WebSocket events
 */
export function webSocketRouterHandler(routes: Router) {
  const router = {} as typeof WSEvent
  for (const event in WSEvent) {
    router[event as keyof typeof WSEvent] = function (
      ws: ServerWebSocket<any>,
      ...args: any[]
    ) {
      const route = routes.find(ws.data.route)
      if (route === null) return
      return route.store[0][event as keyof typeof WSEvent](
        ws,
        ...args,
        ws.data.params
      )
    }
  }
  return router
}
