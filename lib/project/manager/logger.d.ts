import type log4js from "log4js";
import type { Client } from "#connect/common";
import type Manager from "./manager.js";
import { type LoggerEvent, LoggerLevel, type ManagerConfig } from "./type.js";
export default class LoggerManager {
  manager: Manager;
  logger: import("#logger").Logger;
  events: LoggerEvent[];
  follows: {
    level: LoggerLevel;
    handle: string;
    client: Client;
  }[];
  config: ManagerConfig["logger"];
  constructor(manager: Manager, logger?: import("#logger").Logger);
  hook(name: string, l: log4js.Level, data: string[]): void;
  get(opts: {
    level: LoggerLevel;
    time?: number;
    lines?: number;
  }): LoggerEvent[];
  follow(data: Omit<(typeof this.follows)[0], "client">, client: Client): void;
  unfollow(client: Client): void;
}
