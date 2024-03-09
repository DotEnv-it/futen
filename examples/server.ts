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

// This allows to maintain the correct type for the route class being returned by the decorator
const WS = ws('/ws')(class {
    message(ws: ServerWebSocket<WebSocketDataType>, message: string) {
        server.routes.WS
        return ws.send(message);
    }
})

const server = new Futen({
    IndexController,
    WS
}, {
    port: 3001
});

console.log(`Server running on port ${server.instance.port}`);