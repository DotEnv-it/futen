/* eslint-disable @stylistic/max-len */
import { Route } from '../server';
import type { RouteParams } from '../../router';
import type { ServerWebSocket, WebSocketServeOptions } from 'bun';

export type WebSocketDataType<P extends string, T = unknown> = {
    route: FutenWebSocketRouteType<T, P>;
    params: RouteParams<P>;
};

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars, @typescript-eslint/explicit-function-return-type
export function WSEvents<P extends string>(_path?: P) {
    return {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        message: (
            _ws: ServerWebSocket<WebSocketDataType<P>>,
            _message: string | Buffer | Uint8Array,
            _params?: RouteParams<P>
        ): void => {
            return;
        },
        open: (
            _ws: ServerWebSocket<WebSocketDataType<P>>,
            _params?: RouteParams<P>
        ) => {
            return;
        },
        close: (
            _ws: ServerWebSocket<WebSocketDataType<P>>,
            _code: number,
            _reason: string,
            _params?: RouteParams<P>
        ) => {
            return;
        },
        drain: (
            _ws: ServerWebSocket<WebSocketDataType<P>>,
            _params?: RouteParams<P>
        ) => {
            return;
        },
        ping: (
            _ws: ServerWebSocket<WebSocketDataType<P>>,
            _data: Buffer,
            _params?: RouteParams<P>
        ) => {
            return;
        },
        pong: (
            _ws: ServerWebSocket<WebSocketDataType<P>>,
            _data: Buffer,
            _params?: RouteParams<P>
        ) => {
            return;
        }
        /* eslint-enable @typescript-eslint/no-unused-vars */
    } satisfies WebSocketServeOptions<WebSocketDataType<P>>['websocket'];
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
export type OmitFirstArg<F> = F extends (arg0: any, ...args: infer P) => infer R
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
