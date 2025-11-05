import * as inquirer from "@inquirer/prompts"
import { ulid } from "ulid"
import { Impl } from "#protocol/milky"
import * as Common from "../common.js"
import * as Philia from "../philia.js"

export interface IConfig extends Common.IConfig {
  server: string | URL
}

export class Project extends Common.Project {
  declare config: IConfig
  impl: Impl

  constructor(config: IConfig) {
    super(config)
    this.impl = new Impl(this.logger, this.config.philia, this.config.server)
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

    return { id: ulid(), name, server, philia: await Philia.Project.createConfig("App") }
  }

  verifyConfig() {
    try {
      this.config.server = new URL(this.config.server)
    } catch (err) {
      throw TypeError("Milky 服务器地址格式错误", { cause: err })
    }
  }

  start() {
    return this.impl.start()
  }

  stop() {
    return this.impl.close()
  }
}
