import * as inquirer from "@inquirer/prompts"
import { ulid } from "ulid"
import type { Client } from "#connect/common"
import { makeLogger } from "#logger"
import * as Common from "#project/project/common.js"
import * as Philia from "#project/project/philia.js"
import { createAPI } from "#protocol/common"
import type { API } from "#protocol/type"
import type { BaseContext } from "./context.js"
import { EventHandle } from "./event.js"
import PluginManager from "./manager.js"

export interface IConfig extends Common.IConfig {
  /** 命令插件配置 */
  command: {
    /** 命令前缀 */
    prefix: string
    /** 命令参数分隔符 */
    split: string
  }
}

export class Project extends Common.Project {
  declare config: IConfig
  philia: Philia.Project
  plugin: PluginManager
  event: EventHandle
  ctx_map = new Map<Client, BaseContext>()

  /**
   * 创建应用端插件项目
   * @param config 项目配置
   * @param path 插件文件夹
   */
  constructor(config: IConfig, path: string | string[]) {
    super(config)
    this.event = new EventHandle(this)
    this.plugin = new PluginManager(this, path)
    this.philia = new Philia.Project(
      {
        ...config.philia,
        opts: {
          ...config.philia.opts,
          connected_fn: this.connect.bind(this),
          closed_fn: this.close.bind(this),
        },
      },
      { handle: this.event.handle.bind(this.event) },
    )
  }

  static async createConfig(name: IConfig["name"]): Promise<IConfig> {
    const command = {
      prefix: await inquirer.input({ message: "请输入命令前缀:", default: "/", required: true }),
      split: await inquirer.input({ message: "请输入命令分隔符:", default: " " }),
    }
    return { id: ulid(), name, command, philia: await Philia.Project.createConfig("Impl") }
  }

  verifyConfig() {
    if (
      typeof this.config.command.prefix !== "string" ||
      typeof this.config.command.split !== "string"
    )
      throw Error("命令插件配置必须为字符串")
  }

  async start() {
    await Promise.all([this.plugin.load(), this.philia.start()])
    await this.plugin.execStart()
  }

  async stop() {
    await this.plugin.execStop()
    await this.philia.stop()
  }

  async connect(client: Client) {
    try {
      const api = createAPI<API.API>(client)
      const self = await api.getSelfInfo()
      const ctx: BaseContext = { client, api, self, logger: makeLogger(self.id) }
      this.ctx_map.set(client, ctx)

      ctx.logger.info(self.name, "连接成功")
      await this.plugin.execConnect(ctx)
      await api.receiveEvent({
        event: (["message", "notice", "request"] as const).map(i => ({
          type: i,
          handle: "handle",
        })),
      })
    } catch (err) {
      this.logger.error("客户端连接错误", client, err)
      client.close()
    }
  }

  close(client: Client) {
    const ctx = this.ctx_map.get(client)
    if (!ctx) return this.logger.warn("客户端上下文不存在", client)
    this.ctx_map.delete(client)
    ctx.logger.info(ctx.self.name, "连接已断开")
    return this.plugin.execClose(ctx)
  }
}
