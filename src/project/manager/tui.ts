import child_process from "node:child_process"
import fs from "node:fs/promises"
import Path from "node:path"
import { setTimeout } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import * as inquirer from "@inquirer/prompts"
import { Client as SocketClient } from "#connect/socket"
import type { Logger } from "#logger"
import { createAPI } from "#protocol/common"
import { chalk, getDateTime, getTime } from "#util"
import { continueTui, selectArray } from "#util/tui.js"
import type ManagerAPI from "./api.js"
import * as ManagerType from "./type.js"

const ROOT_DIR = Path.relative(
  process.cwd(),
  Path.dirname(Path.dirname(Path.dirname(fileURLToPath(import.meta.url)))),
)

export default class ProjectManagerTui {
  client: SocketClient
  api: ReturnType<
    typeof createAPI<ReturnType<typeof ManagerAPI> & { [key: string]: (data: any) => unknown }>
  >

  constructor(
    public logger: Logger,
    public path: string,
  ) {
    this.client = new SocketClient(logger, {})
    this.api = createAPI<ReturnType<typeof ManagerAPI> & { [key: string]: (data: any) => unknown }>(
      this.client,
    )
  }

  async main() {
    await this.connect().catch(() => {})
    while (true) {
      const choose = await (this.client.open
        ? inquirer.select({
            message: `${this.path} 项目运行中`,
            choices: [
              { name: "📝 日志", value: "log" },
              { name: "⏹️ 停止", value: "stop" },
              { name: "🔙 返回", value: "back" },
            ],
          } as const)
        : inquirer.select({
            message: `${this.path} 项目管理`,
            choices: [
              { name: "▶️ 启动", value: "start" },
              { name: "📝 日志", value: "log" },
              { name: "⚙️ 设置", value: "config" },
              { name: "📌 前台", value: "foreground" },
              { name: "🗑️ 删除", value: "delete" },
              { name: "🔙 返回", value: "back" },
            ],
          } as const))
      if ((await this[choose]()) === false) break
    }
    this.client.close().catch(() => {})
  }

  connect() {
    return this.client.connect(`${Path.resolve(this.path)}/Manager`)
  }

  async followLog(level: ManagerType.LoggerLevel, time = -1) {
    await this.getLog({ level, time, lines: 10 })
    const handle = "receiveLog"
    this.client.handle.set(handle, (event: ManagerType.LoggerEvent) =>
      process.stdout.write(this.printLog(event)),
    )
    this.api.followLog({ level, handle })
    await continueTui("按回车键结束")
    this.api.unfollowLog()
    this.client.handle.del(handle)
  }

  printLog(data: ManagerType.LoggerEvent) {
    const time = getTime(new Date(data.time))
    const level = ManagerType.LoggerLevel[data.level] as keyof typeof ManagerType.LoggerLevelColor
    return `${chalk[ManagerType.LoggerLevelColor[level]](`[${time}][${level.slice(0, 4)}]`)}${data.name} ${data.data.join(" ")}\n`
  }

  async getLog(data: Parameters<typeof this.api.getLog>["0"]) {
    const events = await this.api.getLog(data)
    if (events.length === 0) return
    let log = ""
    for (const i of events) log += this.printLog(i)
    process.stdout.write(log)
    return events[events.length - 1]
  }

  async requestLog(data: Parameters<typeof this.getLog>["0"]) {
    if (!data.lines || (data.time && data.time < 0)) return this.getLog(data)
    let time = data.time,
      event: ManagerType.LoggerEvent | undefined
    while ((event = await this.getLog({ ...data, time }))) {
      if (!(await inquirer.confirm({ message: `往下查看${data.lines}条日志` }))) return
      time = event.time + 1
    }
    if (await inquirer.confirm({ message: "没有日志了，监听实时日志？" }))
      return this.followLog(data.level, time)
  }

  async fileLog() {
    let path = Path.join(this.path, "log")
    const files = await fs.readdir(path).catch(err => {
      if (err.code === "ENOENT") return []
      else throw err
    })
    if (!files.length) return continueTui("没有日志文件")
    const choose = await inquirer.select({
      message: "选择日志文件",
      choices: selectArray(files.filter(i => i.endsWith(".log"))),
    })
    path = Path.join(path, choose)
    const res = child_process.spawnSync("less", ["-RM+F", path], { stdio: "inherit" })
    if ((res.error as NodeJS.ErrnoException)?.code === "ENOENT") {
      process.stdout.write(await fs.readFile(path))
      await continueTui()
    }
  }

  async log() {
    if (!this.client.open) return this.fileLog()
    const choose = await inquirer.select({
      message: "请选择查看类型",
      choices: [
        { name: "⏱️ 实时日志", value: "now" },
        { name: "📜 历史日志", value: "history" },
        { name: "📄 文件日志", value: "file" },
      ],
    } as const)
    if (choose === "file") return this.fileLog()

    const level =
      ManagerType.LoggerLevel[
        await inquirer.select({
          message: "请选择日志等级",
          choices: selectArray(
            Object.keys(
              ManagerType.LoggerLevelColor,
            ) as (keyof typeof ManagerType.LoggerLevelColor)[],
          ),
        })
      ]
    if (choose === "now") return this.followLog(level)

    const lines = await inquirer.number({
      message: "请输入获取行数",
      default: 10,
      min: 1,
    })
    const time = await inquirer.input({
      message: "请输入开始时间",
      default: getDateTime(new Date(Date.now() - 6e5)),
      validate: i => {
        if (i && Number.isNaN(Date.parse(i))) return "时间格式错误"
        return true
      },
    })
    await this.requestLog({
      level,
      lines,
      time: time ? Date.parse(time) : undefined,
    })
  }

  async start() {
    const p = child_process.spawn(
      process.execPath,
      [Path.join(ROOT_DIR, "bin", "run"), this.path],
      { detached: true },
    )
    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)

    for (let i = 0; i < 10; i++)
      try {
        await setTimeout(1000)
        await this.connect()
        if (this.client.open) {
          p.stdin.end()
          p.stdout.destroy()
          p.stderr.destroy()
          p.unref()
          return continueTui("启动成功")
        }
      } catch {}
    p.kill()
    return continueTui("启动失败")
  }

  foreground() {
    return child_process.spawnSync(
      process.execPath,
      [Path.join(ROOT_DIR, "bin", "run"), this.path],
      { stdio: "inherit" },
    )
  }

  stop() {
    return this.api.stop()
  }

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
