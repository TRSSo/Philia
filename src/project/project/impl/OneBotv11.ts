import * as inquirer from "@inquirer/prompts"
import { Impl } from "#protocol/onebot/v11"
import { promiseEvent } from "#util"
import * as Common from "../common.js"
import * as Philia from "../philia.js"

export interface IConfig extends Common.IConfig {
  server: {
    type: "ws" | "ws-reverse"
    path: string | number
  }
}

export class Project extends Common.Project {
  declare config: IConfig
  server?: Impl.Server
  client?: Impl.Client

  static async createConfig(name: IConfig["name"]): Promise<IConfig> {
    const type = await inquirer.select({
      message: "请选择 OneBotv11 协议类型",
      choices: [
        { name: "正向 WebSocket", value: "ws" },
        { name: "反向 WebSocket", value: "ws-reverse" },
      ],
    } as const)
    const path = await (type === "ws"
      ? inquirer.input({
          message: "请输入 OneBotv11 服务器地址:",
          default: "ws://localhost:2536",
          required: true,
        })
      : inquirer.number({
          message: "请输入 OneBotv11 服务器监听端口:",
          min: 1,
          max: 65535,
          required: true,
        }))
    return {
      name,
      server: { type, path },
      philia: await Philia.Project.createConfig(type === "ws-reverse" ? "Client" : undefined),
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
  }

  start() {
    if (this.config.server.type === "ws") {
      this.client = new Impl.Client(
        this.logger,
        this.config.philia,
        this.config.server.path as string,
      )
      return promiseEvent(this.client.ws, "open", "error")
    }
    this.server = new Impl.Server(
      this.logger,
      this.config.philia,
      this.config.server.path as number,
    )
    return promiseEvent(this.server.wss, "listening", "error")
  }

  stop() {
    if (this.config.server.type === "ws") return this.client?.close()!
    return this.server?.close()!
  }
}
