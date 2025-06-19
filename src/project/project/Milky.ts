import * as inquirer from "@inquirer/prompts"
import * as Philia from "./Philia.js"
import { Client } from "#protocol/milky"
import { Config as AConfig } from "../type.js"

export interface IConfig extends AConfig {
  name: "Milky"
  server: string | URL
  client: Philia.IConfig
}

export class Project {
  config: IConfig
  client: Client

  constructor(config: IConfig) {
    this.config = config
    this.verifyConfig()
    this.client = new Client(this.config.client, this.config.server)
  }

  static async createConfig(): Promise<IConfig> {
    const server = await inquirer.input({
      message: "请输入 Milky 服务器地址",
      default: "http://localhost:2536",
      required: true,
    })

    return {
      name: "Milky",
      server,
      client: await Philia.Project.createConfig(),
    }
  }

  verifyConfig() {
    try {
      this.config.server = new URL(this.config.server)
    } catch (err) {
      throw TypeError("Milky 服务器地址格式错误", { cause: err })
    }
    new Philia.Project(this.config.client)
  }

  start() {
    return this.client.start()
  }
  stop() {
    return this.client.close()
  }
}
