import { ServerWebSocket } from "bun";
import { Futen } from "../src/router/core";
import { route, ws } from "../src/router/decorators";
import { FutenWebSocket, WebSocketDataType } from "../src/servers/websocket";
import { FutenHTTPRoute } from "../src/servers/http";

// this doesn't benefit of type inference due to https://github.com/Microsoft/TypeScript/issues/4881
@route('/')
class IndexController implements FutenHTTPRoute { // Using `implements` is optional, but allows to get better type hints
    get(req: Request) {
        return Response.json({ message: req.url });
    }
}

// This one does though
const WSController = ws('/ws')(
    class WSController implements FutenWebSocket {
        message(ws: ServerWebSocket<WebSocketDataType>, message: string | Bun.BufferSource) {
            return ws.send(message);
        }
    }
)

const server = new Futen({
    IndexController,
    WSController
}, {
    port: 3001
});

console.log(`Server running on port ${server.instance.port}`);