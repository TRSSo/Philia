import * as inquirer from "@inquirer/prompts"
import { Client } from "#protocol/milky"
import * as Common from "../common.js"
import * as Philia from "../philia.js"

export interface IConfig extends Common.IConfig {
  server: string | URL
}

export class Project extends Common.Project {
  declare config: IConfig
  client: Client

  constructor(config: IConfig) {
    super(config)
    this.client = new Client(this.logger, this.config.philia, this.config.server)
  }

  static async createConfig(name: IConfig["name"]): Promise<IConfig> {
    const server = await inquirer.input({
      message: "请输入 Milky 服务器地址:",
      default: "http://localhost:2536",
      required: true,
      validate(input) {
        try {
          new URL(input)
        } catch {
          return "请输入正确的URL"
        }
        return true
      },
    })

    return {
      name,
      server,
      philia: await Philia.Project.createConfig(),
    }
  }

  verifyConfig() {
    try {
      this.config.server = new URL(this.config.server)
    } catch (err) {
      throw TypeError("Milky 服务器地址格式错误", { cause: err })
    }
  }

  start() {
    return this.client.start()
  }

  stop() {
    return this.client.close()
  }
}
