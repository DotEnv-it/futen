/* eslint-disable @stylistic/max-len */
import { Route } from '../server';
import type { RouteParams } from '../../router';
import type { ServerWebSocket, WebSocketServeOptions } from 'bun';

export type WebSocketDataType<P extends string, T = unknown> = {
    route: FutenWebSocketRouteType<T, P>;
    params: RouteParams<P>;
};

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type
export function WSEvents<T extends string>(_path?: T) {
    return {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        message: (
            _ws: ServerWebSocket<WebSocketDataType<T>>,
            _message: string | ArrayBuffer | Uint8Array,
            _params?: RouteParams<T>
        ): void => {
            return;
        },
        open: (
            _ws: ServerWebSocket<WebSocketDataType<T>>,
            _params?: RouteParams<T>
        ) => {
            return;
        },
        close: (
            _ws: ServerWebSocket<WebSocketDataType<T>>,
            _code: number,
            _reason: string,
            _params?: RouteParams<T>
        ) => {
            return;
        },
        drain: (
            _ws: ServerWebSocket<WebSocketDataType<T>>,
            _params?: RouteParams<T>
        ) => {
            return;
        },
        ping: (
            _ws: ServerWebSocket<WebSocketDataType<T>>,
            _data: Buffer,
            _params?: RouteParams<T>
        ) => {
            return;
        },
        pong: (
            _ws: ServerWebSocket<WebSocketDataType<T>>,
            _data: Buffer,
            _params?: RouteParams<T>
        ) => {
            return;
        }
        /* eslint-enable @typescript-eslint/no-unused-vars */
    } satisfies WebSocketServeOptions<WebSocketDataType<T>>['websocket'];
}

export type WSEvent<P extends string = string> = ReturnType<typeof WSEvents<P>>;
export interface FutenWebSocketRoute<P extends string> extends Partial<WSEvent<P>> {}
export type FutenWebSocketRouteType<T, P extends string = string> = Route<T, P> &
    Required<FutenWebSocketRoute<P>>;

export function ws<P extends string>(path: P) {
    return function <T extends new (...args: any[]) => any>(
        target: T,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Context is a mandatory parameter but is always undefined in this case
        _context?: ClassDecoratorContext<T>
    ) {
        return new Route(target, path, 'ws') as FutenWebSocketRouteType<T, P> & T;
    };
}

type WebSocketKey = keyof WSEvent;
type OmitFirstArg<F> = F extends (arg0: any, ...args: infer P) => infer R
    ? (...args: P) => R
    : never;
type WebSocketEventParameterType<T extends WebSocketKey> = Parameters<
    OmitFirstArg<(WSEvent)[T]>
>;

export function webSocketRouteWrapper(): WSEvent {
    const router = {} as WSEvent;
    for (const event of Object.keys(WSEvents()) as WebSocketKey[]) {
        router[event] = function (
            websocket: ServerWebSocket<WebSocketDataType<string>>,
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
