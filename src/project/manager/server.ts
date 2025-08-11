import { type Logger, makeLogger } from "#logger"
import type * as Common from "../project/common.js"
import * as Philia from "../project/philia.js"
import API from "./api.js"
import LoggerManager from "./logger.js"
import NoticeManager from "./notice.js"
import type * as type from "./type.js"

export default class Manager {
  config: type.ManagerConfig = {
    logger: {
      max_lines: 10000,
    },
    philia: {
      name: "Philia",
      type: "Socket",
      role: "Server",
      path: "Manager",
    },
  }
  logger: Logger
  logger_manager: LoggerManager
  handle: ReturnType<typeof API>
  philia: Philia.Project
  notice = new NoticeManager(this)

  constructor(
    public project: Common.Project,
    config: Common.IConfig["manager"],
  ) {
    Object.assign(this.config.logger, config?.logger)
    if (config?.philia) this.config.philia = config.philia

    this.logger = makeLogger("Manager", this.config.logger.level, this.config.logger.inspect)
    this.logger_manager = new LoggerManager(this)

    this.handle = API(this)
    this.philia = new Philia.Project(
      this.config.philia,
      this.handle as unknown as ConstructorParameters<typeof Philia.Project>[1],
    )
    this.philia.logger = this.logger
  }

  start() {
    return Promise.all([this.philia.start(), this.project.start()])
  }

  stop() {
    return Promise.all([this.project.stop(), this.philia.stop()])
  }
}
