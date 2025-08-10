import { type Logger, makeLogger } from "#logger"
import { type type as ManagerType, Server } from "../manager/index.js"
import type * as Philia from "./Philia.js"

export interface IConfig {
  /** 项目名 */
  name: string
  /** 项目客户端配置 */
  client: Philia.IConfig
  /** 日志配置 */
  logger?: ManagerType.LoggerConfig
  /** 项目管理器配置 */
  manager?: ManagerType.ManagerConfig
}

export abstract class Project {
  logger: Logger
  manager: Server

  constructor(public config: IConfig) {
    this.verifyConfig()
    if (this.config.logger) this.config.client.logger ??= this.config.logger
    this.manager = new Server(this, config.manager)
    this.logger = makeLogger(config.name, config.logger?.level, config.logger?.inspect)
  }

  /** 创建配置文件，静态方法 */
  static async createConfig(): Promise<IConfig> {
    throw Error("未实现")
  }
  /** 验证配置 */
  abstract verifyConfig(): void
  /** 启动项目 */
  abstract start(): Promise<unknown>
  /** 停止项目 */
  abstract stop(): Promise<unknown>
}
