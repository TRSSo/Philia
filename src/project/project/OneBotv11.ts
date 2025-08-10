import * as inquirer from "@inquirer/prompts"
import { Server } from "#protocol/onebot/v11"
import { promiseEvent } from "#util"
import * as Common from "./common.js"
import * as Philia from "./Philia.js"

export interface IConfig extends Common.IConfig {
  name: "OneBotv11"
  server: {
    type: "ws" | "ws-reverse"
    path: string | number
  }
}

export class Project extends Common.Project {
  declare config: IConfig
  server?: Server.Server
  client?: Server.Client

  static async createConfig(): Promise<IConfig> {
    const type = await inquirer.select({
      message: "请选择 OneBotv11 协议类型",
      choices: [
        { name: "正向 WebSocket", value: "ws" },
        { name: "反向 WebSocket", value: "ws-reverse" },
      ],
    } as const)
    const path = await (type === "ws"
      ? inquirer.input({
          message: "请输入 OneBotv11 服务器地址：",
          default: "ws://localhost:2536",
          required: true,
        })
      : inquirer.number({
          message: "请输入 OneBotv11 服务器监听端口：",
          min: 1,
          max: 65535,
          required: true,
        }))
    return {
      name: "OneBotv11",
      server: { type, path },
      client: await Philia.Project.createConfig(type === "ws-reverse" ? "Client" : undefined),
    }
  }

  verifyConfig() {
    switch (this.config.server.type) {
      case "ws":
        if (typeof this.config.server.path !== "string")
          throw TypeError("OneBotv11 服务器地址必须为字符串")
        break
      case "ws-reverse":
        if (
          typeof this.config.server.path !== "number" ||
          this.config.server.path < 1 ||
          this.config.server.path > 65535
        )
          throw TypeError("OneBotv11 服务器监听端口必须为1-65535")
        break
      default:
        throw TypeError("OneBotv11 协议类型必须为 ws 或 ws-reverse")
    }
    new Philia.Project(this.config.client)
  }

  start() {
    if (this.config.server.type === "ws") {
      this.client = new Server.Client(
        this.logger,
        this.config.client,
        this.config.server.path as string,
      )
      return promiseEvent(this.client.ws, "open", "error")
    }
    this.server = new Server.Server(
      this.logger,
      this.config.client,
      this.config.server.path as number,
    )
    return promiseEvent(this.server.wss, "listening", "error")
  }

  stop() {
    if (this.config.server.type === "ws") return this.client?.close()!
    return this.server?.close()!
  }
}
