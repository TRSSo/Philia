import child_process from "node:child_process";
import { Client as SocketClient } from "#connect/socket";
import type { Logger } from "#logger";
import { createAPI } from "#protocol/common";
import type API from "./api.js";
import * as type from "./type.js";
export default class ProjectManagerTui {
  logger: Logger;
  path: string;
  name: string;
  client: SocketClient;
  api: ReturnType<typeof createAPI<ReturnType<typeof API>>>;
  constructor(logger: Logger, path: string);
  main(): Promise<void>;
  openMenu(): Promise<void | "stop" | "back" | "notice" | "log">;
  connect(): Promise<SocketClient>;
  checkNotice(): Promise<number | {
    id: string;
    name: string;
    desc: string;
    input: boolean;
  }>;
  handleNotice(notice: Awaited<ReturnType<typeof this.api.listNotice>>[0]): Promise<false | undefined>;
  notice(notice?: Awaited<ReturnType<typeof this.api.listNotice>>): Promise<void>;
  followLog(level: type.LoggerLevel, time?: number, resolver?: PromiseWithResolvers<void>): Promise<void>;
  printLog(data: type.LoggerEvent): string;
  getLog(data: Parameters<typeof this.api.getLog>["0"]): Promise<type.LoggerEvent | undefined>;
  requestLog(data: Parameters<typeof this.getLog>["0"]): Promise<void | type.LoggerEvent>;
  fileLog(follow?: boolean): Promise<void>;
  log(): Promise<void>;
  start(): Promise<void>;
  foreground(): child_process.SpawnSyncReturns<NonSharedBuffer>;
  stop(): Promise<SocketClient>;
  setting(): void;
  delete(): Promise<false | undefined>;
  back(): boolean;
}
