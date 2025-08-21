import fs from "node:fs/promises"
import Path from "node:path"
import schedule from "node-schedule"
import { type Logger, makeLogger } from "#logger"
import { chalk } from "#util"
import type { Project } from "./app.js"
import type * as type from "./type.js"

export type Plugin = type.Plugin & { logger: Logger }

/** 插件管理器 */
export default class PluginManager {
  loaded = false
  path: string[]
  ctx: type.ctxGlobal

  command: (type.Command & { plugin: Plugin })[] = []
  middleware: (type.Middleware & { plugin: Plugin })[] = []
  event: (type.Event & { plugin: Plugin })[] = []
  schedule: (type.Schedule & { job: schedule.Job })[] = []
  start: (Plugin & { start: NonNullable<Plugin["start"]> })[] = []
  stop: (Plugin & { stop: NonNullable<Plugin["stop"]> })[] = []
  connect: (Plugin & { connect: NonNullable<Plugin["connect"]> })[] = []
  close: (Plugin & { close: NonNullable<Plugin["close"]> })[] = []

  constructor(
    public project: Project,
    path: string | string[],
  ) {
    this.ctx = { logger: makeLogger("Global"), ctx_map: project.ctx_map }
    this.path = Array.isArray(path) ? path : [path]
  }

  async load() {
    if (this.loaded) throw Error("插件加载已完成")
    this.loaded = true
    const plugins = (await Promise.all(this.path.map(this.readdir.bind(this))))
      .flat()
      .sort((a, b) => a.priority - b.priority)

    for (const plugin of plugins)
      try {
        plugin.logger = this.makeLogger(this.ctx.logger, plugin.name)

        for (const k of ["command", "middleware", "event"] as const)
          if (plugin[k]) for (const i of plugin[k]) this[k].push({ ...i, plugin } as never)

        for (const k of ["start", "stop", "connect", "close"] as const)
          if (plugin[k]) this[k].push(plugin as never)

        if (plugin.schedule)
          for (const i of plugin.schedule)
            this.schedule.push({
              ...i,
              job: schedule.scheduleJob(i.spec, this.execSchedule.bind(this, plugin, i)),
            })
      } catch (err) {
        this.project.logger.error("插件加载错误", plugin, err)
      }
  }

  async readdir(path: string) {
    try {
      const p: ReturnType<typeof this.import>[] = []
      for (const i of await fs.readdir(path, { withFileTypes: true }))
        if (i.isFile() && i.name.endsWith(".js"))
          p.push(this.import(Path.join(i.parentPath, i.name)))
      return (await Promise.all(p)).flat()
    } catch (err) {
      this.project.logger.error(`文件夹读取错误 ${chalk.red(path)}`, err)
    }
    return []
  }

  async import(file: string) {
    const plugins: Plugin[] = []
    try {
      const p = await import(Path.resolve(file))
      for (const i in p) if (typeof p[i]?.plugin === "object") plugins.push(p[i].plugin)
    } catch (err) {
      this.project.logger.error(`插件加载错误 ${chalk.red(file)}`, err)
    }
    return plugins
  }

  makeLogger(logger: Logger, name: string): Logger {
    name = chalk.cyan(`[${name}]`)
    return Object.setPrototypeOf(
      {
        trace: logger.trace.bind(logger, name),
        debug: logger.debug.bind(logger, name),
        info: logger.info.bind(logger, name),
        warn: logger.warn.bind(logger, name),
        error: logger.error.bind(logger, name),
        fatal: logger.fatal.bind(logger, name),
        mark: logger.mark.bind(logger, name),
      },
      logger,
    )
  }

  async execSchedule(plugin: Plugin, schedule: type.Schedule) {
    try {
      plugin.logger.info("定时任务开始执行")
      await schedule.method({ ...this.ctx, logger: plugin.logger })
      plugin.logger.info("定时任务执行完成")
    } catch (err) {
      plugin.logger.error("定时任务执行错误", err)
    }
  }

  exec<T extends string, U extends Plugin & { [_ in T]: (...args: any[]) => unknown }>(
    error_message: string,
    name: T,
    array: U[],
    ...args: Parameters<U[T]>
  ) {
    return Promise.all(
      array.map(async i => {
        args[0] = { ...args[0], logger: i.logger }
        try {
          await i[name](...args)
        } catch (err) {
          i.logger.error(error_message, err)
        }
      }),
    )
  }
  execStart() {
    return this.exec("开启插件错误", "start", this.start, this.ctx)
  }
  execStop() {
    return this.exec("关闭插件错误", "stop", this.stop, this.ctx)
  }
  execConnect(...args: Parameters<(typeof this.connect)[0]["connect"]>) {
    return this.exec("机器人连接插件错误", "connect", this.connect, ...args)
  }
  execClose(...args: Parameters<(typeof this.close)[0]["close"]>) {
    return this.exec("机器人断开插件错误", "close", this.close, ...args)
  }
}
