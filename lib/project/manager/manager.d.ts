import { type Logger } from "#logger";
import type * as Common from "../project/common.js";
import * as Philia from "../project/philia.js";
import API from "./api.js";
import LoggerManager from "./logger.js";
import NoticeManager from "./notice.js";
import type * as type from "./type.js";
export default class Manager {
  project: Common.Project;
  config: type.ManagerConfig;
  logger: Logger;
  logger_manager: LoggerManager;
  handle: ReturnType<typeof API>;
  philia: Philia.Project;
  notice: NoticeManager;
  constructor(project: Common.Project, config: Common.IConfig["manager"]);
  start(): Promise<[import("../../connect/socket/server.js").Server | PromiseSettledResult<void>[] | import("../../connect/websocket/server.js").Server | undefined, unknown]>;
  stop(): Promise<[unknown, void | PromiseSettledResult<void>[]]>;
}
