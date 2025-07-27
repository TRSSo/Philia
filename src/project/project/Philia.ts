import Path from "node:path"
import * as inquirer from "@inquirer/prompts"
import type { type } from "#connect/common"
import * as Socket from "#connect/socket"
import * as WebSocket from "#connect/websocket"
import * as Common from "./common.js"

export interface IConfig extends Common.IConfig {
  name: "Philia"
  type: "Socket" | "WebSocket"
  role: "Server" | "Client"
  path?: string | string[] | number
  opts?: type.Options
}

export class Project extends Common.Project {
  declare config: IConfig
  server?: Socket.Server | WebSocket.Server
  clients = new Set<Socket.Client | WebSocket.Client>()

  constructor(
    config: IConfig,
    public handles: type.Handles = {},
  ) {
    super(config)
  }

  static async createConfig(role?: IConfig["role"]): Promise<IConfig> {
    const type = await inquirer.select({
      message: "请选择 Philia 协议类型",
      choices: [
        { name: "Socket", value: "Socket" },
        { name: "WebSocket", value: "WebSocket" },
      ],
    } as const)
    role ??= await inquirer.select({
      message: "请选择 Philia 协议端类型",
      choices: [
        { name: "服务端", value: "Server" },
        { name: "客户端", value: "Client" },
      ],
    })

    let path: IConfig["path"]
    switch (type) {
      case "Socket":
        if (role === "Client") {
          /** TODO 获取客户端列表，多选 */
        }
        break
      case "WebSocket":
        if (role === "Server")
          path = await inquirer.number({
            message: "请输入 Philia WebSocket 服务器监听端口",
            min: 1,
            max: 65535,
            required: true,
          })
        else
          path = (
            await inquirer.input({
              message: "请输入 Philia WebSocket 服务器地址，多个按半角逗号分隔",
              default: "ws://localhost:2536",
              required: true,
            })
          ).split(",")
        break
    }
    return { name: "Philia", type, role, path }
  }

  verifyConfig() {
    if (this.config.role !== "Server" && this.config.role !== "Client")
      throw TypeError("Philia 协议端类型必须为 Server 或 Client")
    switch (this.config.type) {
      case "Socket":
        if (this.config.role === "Client") {
          if (!Array.isArray(this.config.path) || this.config.path.some(i => typeof i !== "string"))
            throw TypeError("Philia 客户端地址必须为字符串数组")
        } else {
          if (this.config.path && typeof this.config.path !== "string")
            throw TypeError("Philia 服务端监听地址必须为字符串")
        }
        break
      case "WebSocket":
        if (this.config.role === "Client") {
          if (!Array.isArray(this.config.path) || this.config.path.some(i => typeof i !== "string"))
            throw TypeError("Philia 客户端地址必须为字符串数组")
        } else {
          if (
            typeof this.config.path !== "number" ||
            this.config.path < 1 ||
            this.config.path > 65535
          )
            throw TypeError("Philia 服务端监听端口必须为1-65535")
        }
        break
      default:
        throw TypeError("Philia 协议类型必须为 Socket 或 WebSocket")
    }
  }

  start() {
    switch (this.config.type) {
      case "Socket":
        if (this.config.role === "Client") {
          return Promise.allSettled(
            (this.config.path as string[]).map(i => {
              const client = new Socket.Client(this.logger, this.handles, this.config.opts)
              this.clients.add(client)
              return client.connect(i)
            }),
          )
        } else {
          this.server = new Socket.Server(this.logger, this.handles, this.config.opts)
          this.clients = this.server.clients
          this.config.path = Path.resolve((this.config.path as string) || this.config.name)
          return this.server.listen(this.config.path)
        }
      case "WebSocket":
        if (this.config.role === "Client") {
          return Promise.allSettled(
            (this.config.path as string[]).map(i => {
              const client = new WebSocket.Client(this.logger, this.handles, this.config.opts)
              this.clients.add(client)
              return client.connect(i)
            }),
          )
        } else {
          this.server = new WebSocket.Server(this.logger, this.handles, this.config.opts)
          this.clients = this.server.clients
          return this.server.listen(this.config.path as number)
        }
    }
  }

  stop() {
    if (this.config.role === "Server") return this.server?.close()!
    return Promise.allSettled([...this.clients].map(i => i.close()))
  }
}
