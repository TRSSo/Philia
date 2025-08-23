import child_process from "node:child_process"
import fs from "node:fs/promises"
import Path from "node:path"
import { setTimeout } from "node:timers/promises"
import * as inquirer from "@inquirer/prompts"
import { Client as SocketClient } from "#connect/socket"
import type { Logger } from "#logger"
import { createAPI } from "#protocol/common"
import { chalk, getCodeDir, getDateTime, getTime } from "#util"
import { less, lessZstd, selectArray, sendInfo } from "#util/tui.js"
import type API from "./api.js"
import * as type from "./type.js"

export default class ProjectManagerTui {
  name: string
  client: SocketClient
  api: ReturnType<typeof createAPI<ReturnType<typeof API>>>

  constructor(
    public logger: Logger,
    public path: string,
  ) {
    this.name = Path.basename(this.path)
    this.client = new SocketClient(logger, {})
    this.api = createAPI<ReturnType<typeof API>>(this.client)
  }

  async main() {
    await this.connect().catch(() => {})
    for (;;) {
      const choose = await (this.client.open
        ? this.openMenu()
        : inquirer.select({
            message: `${this.name} 项目管理`,
            choices: [
              { name: "▶️ 启动", value: "start" },
              { name: "📝 日志", value: "log" },
              { name: "⚙️ 设置", value: "setting" },
              { name: "📌 前台", value: "foreground" },
              { name: "🗑️ 删除", value: "delete" },
              { name: "🔙 返回", value: "back" },
            ],
          } as const))
      if (choose && (await this[choose]()) === false) break
    }
    this.client.close().catch(() => {})
  }

  async openMenu() {
    const check_notice = await this.checkNotice()
    const notice: { name: string; value: "notice" }[] = []
    if (check_notice !== 0)
      notice.push({
        name: `🔔 通知${typeof check_notice === "object" ? `: ${check_notice.name}` : `(${check_notice})`}`,
        value: "notice",
      })

    const controller = new AbortController()
    this.client.handle.setOnce("newNotice", () => controller.abort())
    return inquirer
      .select(
        {
          message: `${this.name} 项目运行中`,
          choices: [
            ...notice,
            { name: "📝 日志", value: "log" },
            { name: "⏹️ 停止", value: "stop" },
            { name: "🔙 返回", value: "back" },
          ],
        } as const,
        { signal: controller.signal },
      )
      .catch(i => {
        if (!controller.signal.aborted) throw i
      })
  }

  connect() {
    return this.client.connect(`${Path.resolve(this.path)}/Manager`, 0)
  }

  async checkNotice() {
    const count = await this.api.countNotice()
    if (count === 1) return (await this.api.listNotice())[0]
    return count
  }

  async handleNotice(notice: Awaited<ReturnType<typeof this.api.listNotice>>[0]) {
    const choose = await inquirer.select({
      message: notice.desc,
      choices: [
        notice.input
          ? ({ name: "📥 处理", value: "handle" } as const)
          : ({ name: "✅ 完成", value: "done" } as const),
        { name: "🔙 返回", value: "back" },
      ],
    } as const)
    let data: string | undefined
    switch (choose) {
      case "back":
        return false
      case "handle":
        data = await inquirer.input({ message: "请输入数据:", required: true })
    }
    const ret = await this.api.handleNotice({ id: notice.id, data })
    if (ret) await sendInfo(`处理结果: ${ret}`)
  }

  async notice(notice?: Awaited<ReturnType<typeof this.api.listNotice>>) {
    notice ??= await this.api.listNotice()
    for (; notice.length; notice = await this.api.listNotice()) {
      if (notice.length === 1) {
        if ((await this.handleNotice(notice[0])) === false) break
        continue
      }
      const back = Symbol("back") as unknown as number
      const choose = await inquirer.select({
        message: "通知列表",
        choices: [
          ...selectArray(
            notice.map(({ name }, i) => [i, name] as const),
            notice.map(({ desc }) => desc),
          ),
          { name: "🔙 返回", value: back },
        ],
      })
      if (choose === back) break
      await this.handleNotice(notice[choose])
    }
  }

  async followLog(level: type.LoggerLevel, time = -1, resolver = Promise.withResolvers<void>()) {
    if (time === -1) {
      const notice = await this.checkNotice()
      if (notice) {
        if (typeof notice === "object") {
          this.logger.info(`收到新通知: ${notice.name}`)
          await this.notice([notice])
        } else await this.notice()
      }
    } else {
      const notice = await this.api.listNotice()
      if (notice.length) {
        this.logger.info(`收到新通知: ${notice[notice.length - 1].name}`)
        await this.notice(notice)
      }
    }

    const handle = "receiveLog"
    this.client.handle.set(handle, (event: type.LoggerEvent) =>
      process.stdout.write(this.printLog(event)),
    )
    const controller = new AbortController()
    this.client.handle.setOnce("newNotice", () => controller.abort())
    inquirer
      .confirm({ message: "正在监听实时日志，按回车键结束" }, { signal: controller.signal })
      .then(
        () => controller.signal.aborted || resolver.resolve(),
        i => controller.signal.aborted || resolver.reject(i),
      )
      .finally(() => {
        this.api.unfollowLog()
        this.client.handle.del(handle)
        if (controller.signal.aborted)
          this.followLog(level, Date.now(), resolver).catch(resolver.reject)
      })

    process.stdout.write("\n")
    await this.getLog({ level, time, ...(time === -1 ? { lines: 10 } : {}) })
    await this.api.followLog({ level, handle })
    return resolver.promise
  }

  printLog(data: type.LoggerEvent) {
    const time = getTime(new Date(data.time))
    const level = type.LoggerLevel[data.level] as keyof typeof type.LoggerLevelColor
    return `${chalk[type.LoggerLevelColor[level]](`[${time}][${level.slice(0, 4)}]`)}${data.name} ${data.data.join(" ")}\n`
  }

  async getLog(data: Parameters<typeof this.api.getLog>["0"]) {
    const events = await this.api.getLog(data)
    if (!events.length) return
    let log = ""
    for (const i of events) log += this.printLog(i)
    process.stdout.write(log)
    return events[events.length - 1]
  }

  async requestLog(data: Parameters<typeof this.getLog>["0"]) {
    if (!data.lines || (data.time && data.time < 0)) return this.getLog(data)
    let time = data.time,
      event: type.LoggerEvent | undefined
    while ((event = await this.getLog({ ...data, time }))) {
      if (!(await inquirer.confirm({ message: `往下查看${data.lines}条日志` }))) return
      time = event.time + 1
    }
    if (await inquirer.confirm({ message: "没有日志了，监听实时日志?" }))
      return this.followLog(data.level, time)
  }

  async fileLog(follow = false) {
    const dir = Path.join(this.path, "Log")
    const back = Symbol("back") as unknown as string
    for (;;) {
      const dirs = await fs.readdir(dir).catch(err => {
        if (err.code === "ENOENT") return []
        else throw err
      })
      const choose = await inquirer.select({
        message: "选择日志分类",
        choices: [...selectArray(dirs), { name: "🔙 返回", value: back }],
      })
      if (choose === back) break

      const path = Path.join(dir, choose)
      for (;;) {
        const files = await fs.readdir(path).catch(err => {
          if (err.code === "ENOENT") return []
          else throw err
        })
        const choose = await inquirer.select({
          message: "选择日志文件",
          choices: [...selectArray(files), { name: "🔙 返回", value: back }],
        })
        if (choose === back) break
        const file = Path.join(path, choose)
        await (choose.endsWith(".zst") ? lessZstd(file) : less(file, follow))
      }
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
    if (choose === "file") return this.fileLog(true)

    const level =
      type.LoggerLevel[
        await inquirer.select({
          message: "请选择日志等级",
          choices: selectArray(
            Object.keys(type.LoggerLevelColor) as (keyof typeof type.LoggerLevelColor)[],
          ),
        })
      ]
    if (choose === "now") return this.followLog(level)

    const lines = await inquirer.number({
      message: "请输入获取行数:",
      default: 10,
      min: 1,
    })
    const time = await inquirer.input({
      message: "请输入开始时间:",
      default: getDateTime(new Date(Date.now() - 6e5)),
      validate(i) {
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
      [Path.join(getCodeDir(), "bin", "run"), this.path],
      { detached: true },
    )
    p.stdout.pipe(process.stdout)
    p.stderr.pipe(process.stderr)

    for (let i = 0; i < 30; i++)
      try {
        await setTimeout(500)
        if (p.exitCode !== null) break
        await this.connect()
        if (this.client.open) {
          await this.api.closeConsole()
          p.stdin.end()
          p.stdout.destroy()
          p.stderr.destroy()
          p.unref()
          return sendInfo("启动完成")
        }
      } catch {}

    p.kill("SIGKILL")
    return sendInfo(`启动错误(${p.exitCode})`)
  }

  foreground() {
    try {
      return process.execve!(
        process.execPath,
        [process.execPath, Path.join(getCodeDir(), "bin", "run"), this.path],
        process.env,
      )
    } catch {}
    return child_process.spawnSync(
      process.execPath,
      [Path.join(getCodeDir(), "bin", "run"), this.path],
      { stdio: "inherit" },
    )
  }

  async stop() {
    await this.api.stop()
    const promise = Promise.withResolvers<SocketClient>()
    this.client.closed_fn = promise.resolve
    return promise.promise
  }

  setting() {}

  async delete() {
    if (!(await inquirer.confirm({ message: "是否删除项目?" }))) return
    await fs.rm(this.path, { recursive: true })
    return false
  }

  back() {
    return false
  }
}
