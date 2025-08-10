import fs from "node:fs/promises"
import Path from "node:path"
import * as inquirer from "@inquirer/prompts"
import YAML from "yaml"
import type { Logger } from "#logger"
import { selectArray, sendInfo } from "#util/tui.js"
import ProjectManagerTui from "./manager/tui.js"
import * as Project from "./project/index.js"

export default class Tui {
  impl_path = Path.join("Project", "Impl")
  app_path = Path.join("Project", "App")
  constructor(public logger: Logger) {}

  async main() {
    for (;;)
      try {
        const create = Symbol("create")
        const exit = Symbol("exit")
        const choose = await inquirer.select<symbol | string>({
          message: "欢迎使用 Philia 项目管理器",
          choices: [
            ...(await this.list()),
            { name: "🆕 创建项目", value: create },
            { name: "🔚 退出", value: exit },
          ],
        } as const)
        switch (choose) {
          case create:
            await this.create()
            break
          case exit:
            this.exit()
            break
          default:
            await new ProjectManagerTui(this.logger, choose as string).main()
        }
      } catch (error) {
        this.logger.error(error)
        await sendInfo()
      }
  }

  async list() {
    const ret: Exclude<Parameters<typeof inquirer.select<string>>[0]["choices"][0], string>[] = []
    const impl_list = await fs.readdir(this.impl_path).catch(() => [])
    if (impl_list.length) {
      ret.push(new inquirer.Separator("────实现端────"))
      for (const i of impl_list)
        ret.push({ name: `${ret.length + 1}. ${i}`, value: Path.join(this.impl_path, i) })
    }
    const app_list = await fs.readdir(this.app_path).catch(() => [])
    if (app_list.length) {
      ret.push(new inquirer.Separator("────应用端────"))
      for (const i of app_list)
        ret.push({ name: `${ret.length + 1}. ${i}`, value: Path.join(this.app_path, i) })
    }
    if (ret.length) ret.push(new inquirer.Separator("──────────────"))
    return ret
  }

  async create() {
    const type = await inquirer.select({
      message: "请选择 Philia 类型",
      choices: [
        { name: "实现端", value: "impl" },
        { name: "应用端", value: "app" },
      ],
    } as const)

    const project_list = Object.keys(Project[type])
    if (!project_list.length) return sendInfo("没有可创建项目")
    const name = await inquirer.select({
      message: "选择创建项目",
      choices: selectArray(project_list),
    })
    const config = await (
      await (Project[type] as typeof Project.impl & typeof Project.app)[name]()
    ).Project.createConfig(name)

    let path = await inquirer.input({
      message: "请输入项目名：",
      validate: async input => {
        if (Path.basename(input) !== input) return "输入无效"
        if (await fs.stat(Path.join(this[`${type}_path`], input)).catch(() => false))
          return "项目已存在"
        return true
      },
      required: true,
      default: config.name,
    })
    path = Path.join(this[`${type}_path`], path)

    await fs.mkdir(path, { recursive: true })
    await fs.writeFile(Path.join(path, "config.yml"), YAML.stringify(config))
    await new ProjectManagerTui(this.logger, path).main()
  }

  exit() {
    process.exit()
  }
}
