import { Route } from '../server';
import type { ServerWebSocket, WebSocketServeOptions } from 'bun';

export type WebSocketDataType<T = unknown> = {
    route: FutenWebSocketRouteType<T>;
    params: Record<string, string>;
};

export const WSEvent = {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    message: (
        _ws: ServerWebSocket<WebSocketDataType>,
        _message: string | ArrayBuffer | Uint8Array
    ) => {
        return;
    },
    open: (_ws: ServerWebSocket<WebSocketDataType>) => {
        return;
    },
    close: (
        _ws: ServerWebSocket<WebSocketDataType>,
        _code: number,
        _reason: string
    ) => {
        return;
    },
    drain: (_ws: ServerWebSocket<WebSocketDataType>) => {
        return;
    },
    ping: (_ws: ServerWebSocket<WebSocketDataType>, _data: Buffer) => {
        return;
    },
    pong: (_ws: ServerWebSocket<WebSocketDataType>, _data: Buffer) => {
        return;
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
} satisfies WebSocketServeOptions<WebSocketDataType>['websocket'];

export interface FutenWebSocketRoute extends Partial<typeof WSEvent> {}
export type FutenWebSocketRouteType<T> = Route<T> &
    Required<FutenWebSocketRoute>;

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
type OmitFirstArg<F> = F extends (arg0: any, ...args: infer P) => infer R
    ? (...args: P) => R
    : never;
type WebSocketEventParameterType<T extends WebSocketKey> = Parameters<
    OmitFirstArg<(typeof WSEvent)[T]>
>;

export function webSocketRouteWrapper(): typeof WSEvent {
    const router = {} as typeof WSEvent;
    for (const event of Object.keys(WSEvent) as WebSocketKey[]) {
        router[event] = function (
            websocket: ServerWebSocket<WebSocketDataType>,
            ...eventParameters: WebSocketEventParameterType<typeof event>
        ) {
            websocket.data.route[event](
                websocket,
                // @ts-expect-error - shush
                ...eventParameters,
                websocket.data.params
            );
        };
    }
    return router;
}
