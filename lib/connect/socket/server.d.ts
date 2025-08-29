import { type Socket, Server as SocketServer } from "node:net";
import type { Logger } from "#logger";
import type { type } from "../common/index.js";
import OClient from "./client.js";
export interface ServerOptions extends type.ServerOptions {
  socket?: SocketServer | ConstructorParameters<typeof SocketServer>[0];
}
export declare class Server {
  logger: Logger;
  handle: type.HandleMap;
  opts: ServerOptions;
  socket: SocketServer;
  sockets: Set<Socket>;
  clients: Set<Client>;
  meta: {
    id: string;
    name: string;
  };
  path: string;
  limit?: number;
  constructor(logger: Logger, handle?: type.HandleMap, opts?: ServerOptions);
  listen(path?: string, ...args: any[]): Promise<this> | undefined;
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
  constructor(server: Server, socket: Socket);
}
