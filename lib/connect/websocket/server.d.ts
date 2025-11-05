import type { IncomingMessage } from "node:http";
import { type WebSocket, WebSocketServer } from "ws";
import type { Logger } from "#logger";
import type { type } from "../common/index.js";
import OClient from "./client.js";
export interface ServerOptions extends type.ServerOptions {
  ws?: WebSocketServer | ConstructorParameters<typeof WebSocketServer>[0];
}
export declare class Server {
  logger: Logger;
  handle: type.HandleMap;
  opts: ServerOptions;
  ws: WebSocketServer;
  ws_opts?: ConstructorParameters<typeof WebSocketServer>[0];
  wss: Set<WebSocket>;
  clients: Set<Client>;
  meta: {
    id: string;
    name: string;
  };
  cache: Map<string, {
    client: Client;
    timeout: NodeJS.Timeout;
  }>;
  limit?: number;
  constructor(logger: Logger, handle?: type.HandleMap, opts?: ServerOptions);
  listen(port?: number, ...args: any[]): Promise<this>;
  add(client: Client): void;
  del(client: Client): void;
  listener: {
    [key: string]: (...args: any[]) => void;
  };
  close(): Promise<void>;
}
export default Server;
declare class Client extends OClient {
  server: Server;
  constructor(server: Server, ws: WebSocket, req: IncomingMessage);
}
