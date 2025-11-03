import type { Client, type } from "#connect/common";
import type HTTPClient from "#connect/common/http.js";
import type { Config as HTTPConfig } from "#connect/common/http.js";
import * as Socket from "#connect/socket";
import * as WebSocket from "#connect/websocket";
import { type Logger } from "#logger";
import type { type as ManagerType } from "../manager/index.js";
export interface IConfig {
  name: "Philia";
  type: "Socket" | "WebSocket";
  role: "Server" | "Client";
  path?: string | string[] | number;
  opts?: type.Options;
  logger?: ManagerType.LoggerConfig;
  http?: HTTPConfig;
}
export declare class Project {
  config: IConfig;
  handles: type.HandleMap;
  logger: Logger;
  server?: Socket.Server | WebSocket.Server;
  clients: Set<Client>;
  http?: HTTPClient;
  constructor(config: IConfig, handles?: type.HandleMap);
  static getClientProject(connect_type: "Impl" | "App"): Promise<[string, string][]>;
  static createConfig(connect_type: "Impl" | "App", role?: IConfig["role"]): Promise<IConfig>;
  verifyConfig(): void;
  httpStart(): Promise<unknown>;
  start(): Promise<PromiseSettledResult<void>[]> | Promise<Socket.Server> | Promise<WebSocket.Server> | undefined;
  stop(): Promise<void | PromiseSettledResult<void>[]>;
}
