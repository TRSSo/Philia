import http from "node:http";
import https from "node:https";
import type { Logger } from "#logger";
import Handle from "./handle.js";
import * as type from "./type.js";
export interface Config {
  /** 监听地址 */
  host?: string;
  /** 监听端口 */
  port?: number;
  /** 服务器选项 */
  opts?: http.ServerOptions;
  /** HTTPS 选项 */
  https?: https.ServerOptions;
}
export interface Request extends Omit<type.Request, "id"> {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  reply(code: number, data?: unknown): void;
  async: boolean;
  id: type.Request["id"] | null;
}
export default class HTTP {
  config: Config;
  logger: Logger;
  server: http.Server;
  handle: Handle;
  timeout_idle: number;
  headers: {
    "Accept-Encoding": string;
  };
  constructor(config: Config | undefined, logger: Logger, handle: type.HandleMap);
  start(): Promise<unknown>;
  stop(): Promise<unknown>;
  readPostData(req: http.IncomingMessage): Promise<unknown>;
  request(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
  reply(req: Request, code: type.Reply["code"], data?: type.Response["data"]): void;
}
