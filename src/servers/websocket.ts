import { ServerWebSocket, WebSocketServeOptions } from 'bun'
import Router from '../router/routing.ts'
import { Middleware } from '../router/middleware.ts'

/**
 * Optional porting of the WebSocketServeOptions type from Bun
 */
export type WebSocketServerOptions = {
  [key in keyof WebSocketServeOptions]?: WebSocketServeOptions[key]
} & Middleware

export type WebSocketDataType = {
  route: string
  params: Record<string, string>
}

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
    _ws: ServerWebSocket<WebSocketDataType>,
    _message: string | ArrayBuffer | Uint8Array
  ) => { },
  open: (_ws: ServerWebSocket<WebSocketDataType>) => { },
  close: (
    _ws: ServerWebSocket<WebSocketDataType>,
    _code: number,
    _reason: string
  ) => { },
  drain: (_ws: ServerWebSocket<WebSocketDataType>) => { },
  ping: (_ws: ServerWebSocket<WebSocketDataType>, _data: Buffer) => { },
  pong: (_ws: ServerWebSocket<WebSocketDataType>, _data: Buffer) => { }
  /* eslint-enable @typescript-eslint/no-unused-vars */
} satisfies WebSocketServeOptions<WebSocketDataType>['websocket']

export type WSEvents = typeof WSEvent

type WebSocketKey = keyof WSEvents

type FutenWebSocketEventInterfaceType = {
  [key in keyof typeof WSEvent]?: WSEvents[key]
}
export interface FutenWebSocket extends FutenWebSocketEventInterfaceType { }

type WebSocketEventParameterType<T extends WebSocketKey> = Parameters<
  WSEvents[T]
>

/**
 * Helper function to handle WebSocket events with multiple routes
 * @param routes Instance of the router
 * @returns Wrapper on the WSEvent object to handle WebSocket events
 */
export function webSocketRouteWrapper(routes: Router) {
  const router = {} as WSEvents
  for (const event in WSEvent) {
    // @ts-expect-error - This is a valid use case
    router[event as WebSocketKey] = function <T extends WebSocketKey>(
      ws: ServerWebSocket<WebSocketDataType>,
      ...eventParameters: WebSocketEventParameterType<T>
    ) {
      const route = routes.find<Record<number, WSEvents>>(ws.data.route)
      if (route === null) return
      return route.store[0][event as WebSocketKey](
        ws,
        // @ts-expect-error - This is a valid use case
        ...eventParameters,
        ws.data.params
      )
    }
  }
  return router
}
