import child_process from "node:child_process"
import fs from "node:fs/promises"
import Path from "node:path"
import { fileURLToPath } from "node:url"
import * as inquirer from "@inquirer/prompts"
import YAML from "yaml"
import logger from "#logger"
import { continueTui } from "#util/tui.js"
import * as Project from "./project/index.js"

const __dirname = Path.relative(process.cwd(), Path.dirname(fileURLToPath(import.meta.url)))

export class ProjectManager {
  logger = logger
  path: string
  constructor(path: string) {
    this.path = path
  }

  async main() {
    while (true) {
      const choose = await inquirer.select<"log" | "start" | "stop" | "config" | "delete" | "back">(
        {
          message: `${this.path} 项目管理`,
          choices: [
            {
              name: "☀️ 日志",
              value: "log",
              description: "查看项目日志",
            },
            {
              name: "▶️ 启动",
              value: "start",
              description: "启动此项目",
            },
            {
              name: "⏹️ 停止",
              value: "stop",
              description: "停止此项目",
            },
            {
              name: "⚙️ 设置",
              value: "config",
              description: "修改此项目的配置",
            },
            {
              name: "🗑️ 删除",
              value: "delete",
              description: "删除此项目",
            },
            {
              name: "🔙 返回",
              value: "back",
            },
          ],
        },
      )
      if ((await this[choose]()) === false) break
    }
  }

  log() {}

  start() {
    child_process.spawnSync(
      process.execPath,
      [Path.join(Path.dirname(__dirname), "bin", "run"), this.path],
      {
        stdio: "inherit",
      },
    )
  }

  stop() {}

  config() {}

  async delete() {
    if (!(await inquirer.confirm({ message: "是否删除项目？" }))) return
    fs.rm(this.path, { recursive: true })
    return false
  }

  back() {
    return false
  }
}

export class Tui {
  logger = logger
  path = "project"

  async main() {
    while (true)
      try {
        const choose = await inquirer.select<"list" | "create" | "exit">({
          message: "欢迎使用 Philia 项目管理器",
          choices: [
            {
              name: "项目列表",
              value: "list",
              description: "查看已创建项目",
            },
            {
              name: "创建项目",
              value: "create",
              description: "创建一个项目",
            },
            {
              name: "退出",
              value: "exit",
            },
          ],
        })
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
      choices: [
        ...list.map(item => ({
          name: item,
          value: item,
        })),
        { name: "返回", value: back },
      ],
    })
    if (path === back) return
    return new ProjectManager(Path.join(this.path, path)).main()
  }

  async create() {
    const path = await inquirer.input({
      message: "请输入项目名",
      validate: async input => {
        if (Path.basename(input) !== input) return "输入不规范"
        if (await fs.stat(Path.join(this.path, input)).catch(() => false)) return "项目已存在"
        return true
      },
      required: true,
    })
    const name = await inquirer.select<keyof typeof Project>({
      message: "选择创建项目",
      choices: (Object.keys(Project) as (keyof typeof Project)[]).map(i => ({
        name: i,
        value: i,
      })),
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
