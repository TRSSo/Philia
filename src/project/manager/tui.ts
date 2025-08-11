import child_process from "node:child_process"
import fs from "node:fs/promises"
import Path from "node:path"
import { setTimeout } from "node:timers/promises"
import * as inquirer from "@inquirer/prompts"
import { Client as SocketClient } from "#connect/socket"
import type { Logger } from "#logger"
import { createAPI } from "#protocol/common"
import { chalk, getCodeDir, getDateTime, getTime } from "#util"
import { selectArray, sendInfo } from "#util/tui.js"
import type API from "./api.js"
import * as type from "./type.js"

export default class ProjectManagerTui {
  name: string
  client: SocketClient
  api: ReturnType<
    typeof createAPI<ReturnType<typeof API> & { [key: string]: (data: unknown) => unknown }>
  >

  constructor(
    public logger: Logger,
    public path: string,
  ) {
    this.name = Path.basename(this.path)
    this.client = new SocketClient(logger, {})
    this.api = createAPI<ReturnType<typeof API> & { [key: string]: (data: unknown) => unknown }>(
      this.client,
    )
  }

  async main() {
    await this.connect().catch(() => {})
    for (;;) {
      const choose = await (this.client.open
        ? inquirer.select({
            message: `${this.name} 项目运行中`,
            choices: [
              ...(await this.checkNotice().then(i =>
                i === 0
                  ? []
                  : ([
                      {
                        name: `🔔 通知${typeof i === "string" ? `：${i}` : `(${i})`}`,
                        value: "notice",
                      },
                    ] as const),
              )),
              { name: "📝 日志", value: "log" },
              { name: "⏹️ 停止", value: "stop" },
              { name: "🔙 返回", value: "back" },
            ],
          } as const)
        : inquirer.select({
            message: `${this.name} 项目管理`,
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
    return this.client.connect(`${Path.resolve(this.path)}/Manager`, 0)
  }

  async checkNotice() {
    const count = await this.api.countNotice()
    if (count === 1) return (await this.api.listNotice())[0].name
    return count
  }

  async handleNotice(notice: Awaited<ReturnType<typeof this.api.listNotice>>[0]) {
    const choose = await inquirer.select({
      message: notice.desc,
      choices: [
        notice.handle
          ? ({ name: "📥 处理", value: "handle" } as const)
          : ({ name: "✅ 已读", value: "readed" } as const),
        { name: "🔙 返回", value: "back" },
      ],
    } as const)
    if (choose === "back") return
    const data =
      choose === "readed"
        ? undefined
        : await inquirer.input({
            message: "请输入数据：",
            required: true,
          })
    const ret = await this.api.handleNotice({ name: notice.name, data })
    if (ret) await sendInfo(`处理结果：${ret}`)
  }

  async notice() {
    for (;;) {
      const notice = await this.api.listNotice()
      if (!notice.length) break
      if (notice.length === 1) return this.handleNotice(notice[0])
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
    const notice_count = await this.checkNotice()
    if (notice_count) {
      if (typeof notice_count === "string") this.logger.info(`收到新通知：${notice_count}`)
      await this.notice()
    }
    const handle = "receiveLog"
    this.client.handle.set(handle, (event: type.LoggerEvent) =>
      process.stdout.write(this.printLog(event)),
    )
    const controller = new AbortController()
    let notice: Parameters<typeof this.handleNotice>[0]
    this.client.handle.setOnce("newNotice", (n: typeof notice) => {
      notice = n
      controller.abort()
    })
    inquirer
      .confirm({ message: "正在监听实时日志，按回车键结束" }, { signal: controller.signal })
      .then(
        () => notice ?? resolver.resolve(),
        i => notice ?? resolver.reject(i),
      )
      .finally(() => {
        this.api.unfollowLog()
        this.client.handle.del(handle)
        if (notice) {
          time = Date.now()
          this.logger.info(`收到新通知：${notice.name}`)
          this.handleNotice(notice).then(
            this.followLog.bind(this, level, time, resolver),
            resolver.reject,
          )
        }
      })
    process.stdout.write("\n")
    await this.getLog({ level, time, lines: 10 })
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
    if (await inquirer.confirm({ message: "没有日志了，监听实时日志？" }))
      return this.followLog(data.level, time)
  }

  async fileLog() {
    let path = Path.join(this.path, "Log")
    const files = await fs.readdir(path).catch(err => {
      if (err.code === "ENOENT") return []
      else throw err
    })
    if (!files.length) return sendInfo("没有日志文件")
    const choose = await inquirer.select({
      message: "选择日志文件",
      choices: selectArray(files.filter(i => i.endsWith(".log"))),
    })
    path = Path.join(path, choose)
    const res = child_process.spawnSync("less", ["-RM+F", path], { stdio: "inherit" })
    if ((res.error as NodeJS.ErrnoException)?.code === "ENOENT") {
      process.stdout.write(await fs.readFile(path))
      await sendInfo()
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
      message: "请输入获取行数：",
      default: 10,
      min: 1,
    })
    const time = await inquirer.input({
      message: "请输入开始时间：",
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

  config() {}

  async delete() {
    if (!(await inquirer.confirm({ message: "是否删除项目？" }))) return
    await fs.rm(this.path, { recursive: true })
    return false
  }

  back() {
    return false
  }
}
