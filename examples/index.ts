import Futen, { route, ws } from '../dist/index.mjs';
import type { FutenHTTPRoute, WebSocketDataType } from '../dist/index.mjs';
import type { ServerWebSocket } from 'bun';
// this doesn't benefit of type inference due to https://github.com/Microsoft/TypeScript/issues/4881
@route('/')
class IndexController implements FutenHTTPRoute {
    // Using `implements` is optional, but allows to get better type hints
    public get(req: Request): Response {
        return Response.json({ message: req.url });
    }
}

@ws('/ws')
class WSController {
    public message(
        websocket: ServerWebSocket<WebSocketDataType>,
        data: string
    ): void {
        websocket.send(data);
    }
}

export const server = new Futen(
    {
        IndexController,
        WSController
    },
    {
        port: 3001
    }
);
