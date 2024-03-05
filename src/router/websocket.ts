import { ServerWebSocket, WebSocketServeOptions } from 'bun'
import Router from './router.ts'

// type BaseWSHandler<T extends Record<string, unknown> = any> = (ws: BunServerWebSocket, ...args: T[keyof T][]) => void | Promise<void>
/**
 * Standard WebSocket events which are automatically picked up by the router
 * ---
 * Compatible with Bun base WebSocket server
 * @link https://bun.sh/docs/api/websockets#reference
 */
export const WSRoute = {
  message: (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ws: ServerWebSocket,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _message: string | ArrayBuffer | Uint8Array
  ) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  open: (_ws: ServerWebSocket) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  close: (_ws: ServerWebSocket, _code: number, _reason: string) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  drain: (_ws: ServerWebSocket) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ping: (_ws: ServerWebSocket, _data: Buffer) => {},
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pong: (_ws: ServerWebSocket, _data: Buffer) => {}
} satisfies WebSocketServeOptions['websocket']

export function webSocketRouterHandler(routes: Router) {
  const router = {} as typeof WSRoute
  for (const event in WSRoute) {
    router[event as keyof typeof WSRoute] = function (
      ws: ServerWebSocket<any>,
      ...args: any[]
    ) {
      const route = routes.find(ws.data.route)
      if (route === null) return
      return route.store[0][event as keyof typeof WSRoute](
        ws,
        ...args,
        ws.data.params
      )
    }
  }
  return router
}
