import { WebSocket } from "ws";
import type { Logger } from "#logger";
import { Client as AClient, type type } from "../common/index.js";
export interface ClientOptions extends type.Options {
  ws?: WebSocket | ConstructorParameters<typeof WebSocket>[2];
}
export default class Client extends AClient {
  event: WebSocket;
  ws_opts?: ConstructorParameters<typeof WebSocket>[2];
  constructor(logger: Logger, handle: type.HandleMap, opts?: ClientOptions);
  connectOpen(path: string): void;
  heartbeat_timeout?: NodeJS.Timeout;
  heartbeat: () => void;
  onclose(info?: string): void;
  listener: {
    [key: string]: (...args: any[]) => void;
  };
  getMetaInfo(): Promise<type.MetaInfo>;
  forceClose: () => void;
  close(): Promise<void>;
  write(data: Buffer): void;
  receive(data: Buffer): void;
}
