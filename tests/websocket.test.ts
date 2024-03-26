import Futen, { ws } from '../dist/index.mjs';
import { describe, test, expect } from 'bun:test';
import type { WebSocketDataType } from '../dist/index.mjs';
import type { ServerWebSocket } from 'bun';

describe('WebSocket', () => {
    @ws('/websocket1')
    class WebSocket1 {
        public message(websocket: ServerWebSocket, message: string): number {
            return websocket.send(`${message} I received your message`);
        }

        public close(websocket: ServerWebSocket): void {
            websocket.close();
        }

        public open(websocket: ServerWebSocket): number {
            return websocket.send('Hello, world! from FirstWebSocket');
        }
    }

    @ws('/websocket2/:id/:id2')
    class WebSocket2 {
        public message(
            websocket: ServerWebSocket<WebSocketDataType>,
            message: string,
            params: { id: string; id2: string }
        ): number {
            if (message === 'Close me, please!') {
                return wsServer.routes.WebSocket2.close(
                    websocket,
                    1000,
                    `Goodbye, world! from SecondWebSocket with params ${JSON.stringify(params)}`
                );
            }
            const messageWithParams = `${message} from SecondWebSocket${JSON.stringify(params)}`;
            return websocket.send(messageWithParams);
        }

        public close(
            websocket: ServerWebSocket,
            code: number,
            message: string,
            params: { id: string; id2: string }
        ): void {
            expect(code).toBe(1000);
            websocket.close(
                1000,
                `WebSocket closed from SecondWebSocket with code 1000 and message ${message} and params ${JSON.stringify(params)}`
            );
        }

        public open(
            websocket: ServerWebSocket,
            params: { id: string; id2: string }
        ): number {
            const openMessage = `WebSocket opened from SecondWebSocket with params ${JSON.stringify(params)}`;
            return websocket.send(openMessage);
        }
    }

    const wsServer = new Futen(
        {
            WebSocket1,
            WebSocket2
        },
        {
            port: 0
        }
    );

    const randomPort = wsServer.instance.port;
    test('should verify the ports of the instances', () => {
        expect(randomPort).toBeGreaterThan(0);
    });

    test('should verify the paths of the instances', () => {
        expect(wsServer.routes.WebSocket1.path).toBe('/websocket1');
        expect(wsServer.routes.WebSocket2.path).toBe('/websocket2/:id/:id2');
    });

    test('should verify the message event of the instances', async () => {
        const websocket = new WebSocket(
            `ws://localhost:${randomPort}/websocket1`
        );
        let expectsFired = 0;
        websocket.onmessage = (event) => {
            expect(event.data).toBe('Hello, world! from FirstWebSocket');
            websocket.close();
            expectsFired++;
        };
        websocket.onopen = () => {
            websocket.send('Hello, world!');
        };
        await new Promise((resolve) => {
            websocket.onclose = resolve;
        });
        expect(expectsFired).toBe(1);
    });

    test('should verify the message event with params of the instances', async () => {
        const websocket = new WebSocket(
            `ws://localhost:${randomPort}/websocket2/1/2`
        );
        let expectsFired = 0;
        websocket.onmessage = (event) => {
            expect(event.data).toBe(
                'WebSocket opened from SecondWebSocket with params {"id2":"2","id":"1"}'
            );
            websocket.close();
            expectsFired++;
        };
        websocket.onopen = () => {
            websocket.send('Hello, world!');
        };
        await new Promise((resolve) => {
            websocket.onclose = resolve;
        });
        expect(expectsFired).toBe(1);
    });

    test('should verify the close event of the instances', async () => {
        const websocket = new WebSocket(
            `ws://localhost:${randomPort}/websocket2/1/2`
        );
        let expectsFired = 0;
        websocket.onclose = (event) => {
            expect(event.code).toBe(1000);
            expect(event.reason).toBe(
                'WebSocket closed from SecondWebSocket with code 1000 and message Goodbye, world! and params {"id":"1","id2":"2"}'
            );
            expectsFired++;
        };
        websocket.onopen = () => {
            websocket.send('Close me, please!');
        };
        await new Promise((resolve) => {
            websocket.onclose = resolve;
        });
        expect(expectsFired).toBe(0);
    });
});
