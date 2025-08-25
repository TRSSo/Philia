import { Socket } from "node:net";
import type { Logger } from "#logger";
import { Client as AClient, type type } from "../common/index.js";
export interface ClientOptions extends type.Options {
  socket?: Socket | ConstructorParameters<typeof Socket>[0];
}
export default class Client extends AClient {
  event: Socket;
  buffer: Buffer;
  buffer_split?: Buffer;
  constructor(logger: Logger, handle: type.HandleMap, opts?: ClientOptions);
  connectOpen(path: string): void;
  onclose(info?: string): void;
  listener: {
    [key: string]: (...args: any[]) => void;
  };
  getMetaInfo(): Promise<type.MetaInfo>;
  forceClose: () => void;
  close(): Promise<void>;
  decode_empty: symbol;
  decode(): typeof this.decode_empty | ReturnType<typeof this.encoder.decode>;
  write(data: Buffer): boolean;
  receive(buffer: Buffer): void;
}
