import Futen, { route, ws } from '../dist/index.mjs';
import type { FutenHTTPRoute, FutenWebSocketRoute, WebSocketDataType } from '../dist/index.mjs';
import type { ServerWebSocket } from 'bun';
// this doesn't benefit of type inference due to https://github.com/Microsoft/TypeScript/issues/4881
@route('/')
class IndexController implements FutenHTTPRoute<'/'> {
    // Using `implements` is optional, but allows to get better type hints
    public get(req: Request): Response {
        return Response.json({ message: req.url });
    }
}

// This is the best way to define a WebSocket route
const WSController = ws('/ws/:id')(
    class implements FutenWebSocketRoute<'/ws/:id'> {
        public message(
            websocket: ServerWebSocket<WebSocketDataType<'/ws/:id'>>,
            data: string | ArrayBuffer | Uint8Array,
            params?: { id: string }
        ): void {
            websocket.send(data);
            console.log(websocket.data.params);
            console.log(params);
        }
    }
);

export const server = new Futen(
    {
        IndexController,
        WSController
    },
    {
        port: 3001
    }
);
