import fs from "node:fs/promises"
import Path from "node:path"
import * as inquirer from "@inquirer/prompts"
import YAML from "yaml"
import type { Client, type } from "#connect/common"
import type HTTPClient from "#connect/common/http.js"
import type { Config as HTTPConfig } from "#connect/common/http.js"
import * as Socket from "#connect/socket"
import * as WebSocket from "#connect/websocket"
import { type Logger, makeLogger } from "#logger"
import { getProjectDir } from "#util"
import { selectArray } from "#util/tui.js"
import type { type as ManagerType } from "../manager/index.js"

export interface IConfig {
  name: "Philia"
  type: "Socket" | "WebSocket"
  role: "Server" | "Client"
  path?: string | string[] | number
  opts?: type.Options
  logger?: ManagerType.LoggerConfig
  http?: HTTPConfig
}

export class Project {
  logger: Logger
  server?: Socket.Server | WebSocket.Server
  clients = new Set<Client>()
  http?: HTTPClient

  constructor(
    public config: IConfig,
    public handles: type.HandleMap = {},
  ) {
    this.verifyConfig()
    this.logger = makeLogger(config.name, config.logger?.level, config.logger?.inspect)
  }

  static async getClientProject(connect_type: "Impl" | "App") {
    const path_type = getProjectDir(connect_type)
    const config_list = (await fs.readdir(path_type).catch(() => [])).map(
      async i =>
        [
          i,
          YAML.parse(await fs.readFile(Path.join(path_type, i, "config.yml"), "utf8"))
            .philia as IConfig,
        ] as const,
    )
    const list: [string, string][] = []
    for (const i of await Promise.allSettled(config_list))
      if (
        i.status === "fulfilled" &&
        i.value[1].name === "Philia" &&
        i.value[1].type === "Socket" &&
        i.value[1].role === "Server"
      )
        list.push([Path.join(connect_type, i.value[0]), i.value[0]])
    return list
  }

  static async createConfig(
    connect_type: "Impl" | "App",
    role?: IConfig["role"],
  ): Promise<IConfig> {
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
          const list = await Project.getClientProject(connect_type)
          const custom = Symbol("custom") as unknown as string
          list.push([custom, "自定义"])
          path = await inquirer.checkbox({
            message: "请选择项目",
            choices: selectArray(list),
          })
          const index = path.indexOf(custom)
          if (index !== -1) {
            path.splice(index, 1)
            path.push(
              ...(
                await inquirer.input({
                  message: "请输入 Philia Socket 服务器地址，多个按半角逗号分隔:",
                })
              )
                .split(",")
                .filter(i => i.trim())
                .map(i => (i.startsWith("tcp://") ? i : `file://${i.trim()}`)),
            )
          }
          if (!path.length) throw TypeError("连接地址不能为空")
        }
        break
      case "WebSocket":
        if (role === "Server")
          path = await inquirer.number({
            message: "请输入 Philia WebSocket 服务器监听端口:",
            min: 1,
            max: 65535,
            required: true,
          })
        else
          path = (
            await inquirer.input({
              message: "请输入 Philia WebSocket 服务器地址，多个按半角逗号分隔:",
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

  async httpStart() {
    if (this.config.http) {
      this.http = new (await import("#connect/common/http.js")).default(
        this.config.http,
        this.logger,
        this.handles,
      )
      return this.http.start()
    }
  }

  start() {
    this.httpStart()
    switch (this.config.type) {
      case "Socket":
        if (this.config.role === "Client") {
          return Promise.allSettled(
            (this.config.path as string[]).map(i => {
              if (i.startsWith("file://")) i = i.slice(7)
              else if (!i.startsWith("tcp://")) i = getProjectDir(i, this.config.name)

              const client = new Socket.Client(this.logger, this.handles, this.config.opts)
              this.clients.add(client)
              return client.connect(i)
            }),
          )
        } else {
          this.server = new Socket.Server(this.logger, this.handles, this.config.opts)
          this.clients = this.server.clients
          return this.server.listen((this.config.path as string) || this.config.name)
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

  async stop() {
    if (this.http) this.http.stop()
    if (this.config.role === "Server") return this.server?.close()
    return Promise.allSettled([...this.clients].map(i => i.close()))
  }
}
