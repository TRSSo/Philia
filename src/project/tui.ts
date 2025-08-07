import fs from "node:fs/promises"
import Path from "node:path"
import * as inquirer from "@inquirer/prompts"
import YAML from "yaml"
import type { Logger } from "#logger"
import { continueTui, selectArray } from "#util/tui.js"
import ProjectManagerTui from "./manager/tui.js"
import * as Project from "./project/index.js"

export default class Tui {
  path = "project"
  constructor(public logger: Logger) {}

  async main() {
    while (true)
      try {
        const choose = await inquirer.select({
          message: "欢迎使用 Philia 项目管理器",
          choices: [
            { name: "📂 项目列表", value: "list" },
            { name: "🆕 创建项目", value: "create" },
            { name: "🔚 退出", value: "exit" },
          ],
        } as const)
        await this[choose]()
      } catch (error) {
        this.logger.error(error)
        await continueTui()
      }
  }

  async list() {
    const list = await fs.readdir(this.path).catch(() => [])
    if (!list.length) return continueTui("没有项目")
    const back = Symbol("back") as unknown as string
    const path = await inquirer.select({
      message: "项目列表",
      choices: [...selectArray(list), { name: "🔙 返回", value: back }],
    })
    if (path === back) return
    return new ProjectManagerTui(this.logger, Path.join(this.path, path)).main()
  }

  async create() {
    const path = await inquirer.input({
      message: "请输入项目名",
      validate: async input => {
        if (Path.basename(input) !== input) return "输入无效"
        if (await fs.stat(Path.join(this.path, input)).catch(() => false)) return "项目已存在"
        return true
      },
      required: true,
    })
    const name = await inquirer.select({
      message: "选择创建项目",
      choices: selectArray(Object.keys(Project) as (keyof typeof Project)[]),
    })
    // biome-ignore lint/performance/noDynamicNamespaceImportAccess::
    const config = await Project[name].Project.createConfig()
    await fs.mkdir(Path.join(this.path, path), { recursive: true })
    await fs.writeFile(Path.join(this.path, path, "config.yml"), YAML.stringify(config))
  }

  exit() {
    process.exit()
  }
}
