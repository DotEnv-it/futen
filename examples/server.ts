import { ServerWebSocket } from "bun";
import { Futen } from "../src/router/core";
import { route, ws } from "../src/router/decorators";
import { WebSocketDataType } from "../src/servers/websocket";

@route('/')
class IndexController {
    get(req: Request) {
        server.routes.IndexController
        return Response.json({ message: req.url });
    }
}

@ws('/ws')
class WsController {
    message(ws: ServerWebSocket<WebSocketDataType>, message: string) {
        server.routes.WsController
        return ws.send(message);

    }
}

const server = new Futen({
    IndexController,
    WsController
}, {
    port: 3001
});

console.log(`Server running on port ${server.instance.port}`);