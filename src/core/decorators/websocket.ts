import { Route } from '../server';
import type Router from '../../router';
import type { ServerWebSocket, WebSocketServeOptions } from 'bun';

export type WebSocketDataType = {
    route: string,
    params: Record<string, string>
};

export const WSEvent = {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    message: (
        _ws: ServerWebSocket<WebSocketDataType>,
        _message: string | ArrayBuffer | Uint8Array
    ) => { return; },
    open: (_ws: ServerWebSocket<WebSocketDataType>) => { return; },
    close: (
        _ws: ServerWebSocket<WebSocketDataType>,
        _code: number,
        _reason: string
    ) => { return; },
    drain: (_ws: ServerWebSocket<WebSocketDataType>) => { return; },
    ping: (_ws: ServerWebSocket<WebSocketDataType>, _data: Buffer) => { return; },
    pong: (_ws: ServerWebSocket<WebSocketDataType>, _data: Buffer) => { return; }
    /* eslint-enable @typescript-eslint/no-unused-vars */
} satisfies WebSocketServeOptions<WebSocketDataType>['websocket'];

type FutenWebSocketRouteType<T> = Route<T> & WSEvents;
export type WSEvents = typeof WSEvent;

export function ws(path: string) {
    return function <T extends new (...args: any[]) => any>(
        target: T,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
        _context?: ClassDecoratorContext<T>
    ) {
        return new Route(target, path, 'ws') as FutenWebSocketRouteType<T> & T;
    };
}

type WebSocketKey = keyof typeof WSEvent;
type WebSocketEventParameterType<T extends WebSocketKey> = Parameters<
    (typeof WSEvent)[T]
>;

export function webSocketRouteWrapper(routes: Router): WSEvents {
    const router = {} as typeof WSEvent;
    for (const event in WSEvent) {
        // @ts-expect-error - This is a valid use case
        router[event as WebSocketKey] = function <T extends WebSocketKey>(
            websocket: ServerWebSocket<WebSocketDataType>,
            ...eventParameters: WebSocketEventParameterType<T>
        ) {
            const route = routes.find(websocket.data.route);
            if (route === null) return;
            // @ts-expect-error - This is a valid use case
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return route.store[0][event](
                websocket,
                ...eventParameters,
                websocket.data.params
            );
        };
    }
    return router;
}
