import type { IncomingMessage } from "node:http";
import { type WebSocket, WebSocketServer } from "ws";
import type { Logger } from "#logger";
import type * as Philia from "#project/project/philia.js";
import Client from "./client.js";
export default class Server {
	logger: Logger;
	philia: Philia.IConfig;
	wss: WebSocketServer;
	clients: Map<string, Client>;
	constructor(logger: Logger, philia: Philia.IConfig, path: number, opts?: ConstructorParameters<typeof WebSocketServer>[0]);
	connected(ws: WebSocket, req: IncomingMessage): Promise<void>;
	close(): Promise<void>;
}
