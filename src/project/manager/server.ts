import { type Logger, makeLogger } from "#logger"
import type * as Common from "../project/common.js"
import * as Philia from "../project/Philia.js"
import API from "./api.js"
import LoggerManager from "./logger.js"
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

  constructor(
    public project: Common.Project,
    config: Common.IConfig,
  ) {
    Object.assign(this.config.logger, config.manager?.logger)
    if (config.manager?.philia) this.config.philia = config.manager.philia

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
