// biome-ignore-all lint/complexity/noThisInStatic::
import type { Logger } from "#logger"
import type * as Philia from "#protocol/type"
import type * as type from "./type.js"

/**
 * 创建一个函数式插件
 * @param name 插件名
 * @param desc 插件描述
 * @param priority 优先级
 * @example
 * ```ts
 * export const example = new createPlugin("example", "示例插件")
 *   .command("复读", async (ctx, args) => {
 *     await ctx.reply(args)
 *   })
 *   .middleware((ctx, next) => {
 *     ctx.logger.info("收到一条消息", ctx.event.summary)
 *     return next()
 *   })
 *   .event<Philia.Event.Request>({ type: "request" }, ctx => {
 *     ctx.logger.info("这条请求被我处理了！", ctx.event)
 *   })
 *   .schedule("0 0 0 0 0 0", ctx => {
 *     ctx.logger.info("0点到了！")
 *   })
 *   .start(ctx => {
 *     ctx.logger.info("启动完成！")
 *   })
 *   .stop(ctx => {
 *     ctx.logger.info("正在关闭……")
 *   })
 *   .connect(ctx => {
 *     ctx.logger.info("连接成功！", ctx.self)
 *   })
 *   .close(ctx => {
 *     ctx.logger.info("连接已断开！", ctx.self)
 *   })
 * ```
 */
export class createPlugin<T extends Philia.Event.Event = Philia.Event.Message> {
  /** 插件数据 */
  plugin: type.Plugin

  constructor(
    name: type.Plugin["name"],
    desc: type.Plugin["desc"],
    priority: type.Plugin["priority"] = 0,
  ) {
    this.plugin = { name, desc, priority }
  }

  /**
   * 添加命令
   * @param cmd 命令
   * @param method 命令方法
   * @param opts 命令选项
   */
  command<U extends Philia.Event.Message = T extends Philia.Event.Message ? T : never>(
    cmd: type.SingleCommand<U>["cmd"],
    method: type.SingleCommand<U>["method"],
    opts?: Omit<type.SingleCommand<U>, "cmd" | "method">,
  ): typeof this
  command<U extends Philia.Event.Message = T extends Philia.Event.Message ? T : never>(
    cmd: type.MultiCommand<U>["cmd"],
    method: type.MultiCommand<U>["method"],
    opts?: Omit<type.MultiCommand<U>, "cmd" | "method">,
  ): typeof this
  command<U extends Philia.Event.Message = T extends Philia.Event.Message ? T : never>(
    cmd: type.RegExpCommand<U>["cmd"],
    method: type.RegExpCommand<U>["method"],
    opts?: Omit<type.RegExpCommand<U>, "cmd" | "method">,
  ): typeof this
  command<U extends Philia.Event.Message = T extends Philia.Event.Message ? T : never>(
    cmd: type.Command<U>["cmd"],
    method: type.Command<U>["method"],
    opts?: Omit<type.Command<U>, "cmd" | "method">,
  ) {
    this.plugin.command ??= []
    this.plugin.command.push({ ...opts, cmd, method } as type.Command<U>)
    return this
  }

  /**
   * 添加中间件
   * @param method 中间件方法
   * @param opts.type 事件类型，默认 message
   * @param opts.scene 事件场景
   */
  middleware<U extends Philia.Event.Event = T>(
    method: type.Middleware<U>["method"],
    opts: Omit<type.Middleware<U>, "method"> = { type: "message" },
  ) {
    this.plugin.middleware ??= []
    this.plugin.middleware.push({ ...opts, method })
    return this
  }

  /**
   * 添加事件
   * @param opts.type 事件类型
   * @param opts.scene 事件场景
   * @param method 事件方法
   */
  event<U extends Philia.Event.Event = T>(
    opts: Omit<type.Middleware<U>, "method">,
    method: type.Event<U>["method"],
  ) {
    this.plugin.event ??= []
    this.plugin.event.push({ ...opts, method })
    return this
  }

  /**
   * 添加定时任务
   * @param spec 定时任务规格
   * @param method 定时任务方法
   */
  schedule(spec: type.Schedule["spec"], method: type.Schedule["method"]) {
    this.plugin.schedule ??= []
    this.plugin.schedule.push({ spec, method })
    return this
  }

  /** 添加启动完成触发方法 */
  start(method: type.Plugin["start"]) {
    this.plugin.start = method
    return this
  }

  /** 添加关闭时触发方法 */
  stop(method: type.Plugin["stop"]) {
    this.plugin.stop = method
    return this
  }

  /** 添加机器人连接时触发方法 */
  connect(method: type.Plugin["connect"]) {
    this.plugin.connect = method
    return this
  }

  /** 添加机器人断开连接时触发方法 */
  close(method: type.Plugin["close"]) {
    this.plugin.close = method
    return this
  }
}

/** 类插件 */
export class Plugin<E extends Philia.Event.Event = Philia.Event.Message> {
  /**
   * 创建一个类插件数据
   * @this 类
   * @param d 插件数据
   * @example
   * ```ts
   * export class Example extends Plugin {
   *   static plugin = this.createPlugin({
   *     name: "example",
   *     desc: "示例插件",
   *     type: "message",
   *     command: { cmd: "复读", method: "cmd" },
   *     middleware: { method: "middleware" },
   *     event: { method: "event" },
   *     schedule: { spec: "0 0 0 0 0 0", method: "schedule" },
   *     start: "start",
   *     stop: "stop",
   *     connect: "connect",
   *     close: "close",
   *   })
   *   async cmd(args: string) {
   *     await this.reply(args)
   *   }
   *   middleware(next: () => Promise<boolean>) {
   *     this.logger.info("收到一条消息", this.e.summary)
   *     return next()
   *   }
   *   event() {
   *     this.logger.info("这条消息被我处理了！", this.e.summary)
   *   }
   *   schedule() {
   *     this.logger.info("0点到了！")
   *   }
   *   start() {
   *     this.logger.info("启动完成！")
   *   }
   *   stop() {
   *     this.logger.info("正在关闭……")
   *   }
   *   connect() {
   *     this.logger.info("连接成功！", this.ctx.self)
   *   }
   *   close() {
   *     this.logger.info("连接已断开！", this.ctx.self)
   *   }
   * }
   * ```
   */
  static createPlugin<T, E extends Philia.Event.Event>(
    this: new (
      ...args: ConstructorParameters<typeof Plugin<E>>
    ) => T,
    d: type.ClassPlugin<T, E>,
  ) {
    const plugin: type.Plugin = { name: d.name, desc: d.desc, priority: d.priority ?? 0 }

    if (d.command)
      plugin.command = ((Array.isArray(d.command) ? d.command : [d.command]) as any[]).map(i => ({
        ...i,
        ...(d.scene && { scene: d.scene }),
        method: (
          ...args: Parameters<type.Command<E extends Philia.Event.Message ? E : never>["method"]>
        ) => (new this(args.shift() as (typeof args)[0]) as any)[i.method](...args),
      }))

    if (d.middleware)
      plugin.middleware = (Array.isArray(d.middleware) ? d.middleware : [d.middleware]).map(i => ({
        ...i,
        type: d.type,
        ...(d.scene && { scene: d.scene }),
        method: (...args: Parameters<type.Middleware<E>["method"]>) =>
          (new this(args.shift() as (typeof args)[0]) as any)[i.method](...args),
      }))

    if (d.event)
      plugin.event = (Array.isArray(d.event) ? d.event : [d.event]).map(i => ({
        ...i,
        type: d.type,
        ...(d.scene && { scene: d.scene }),
        method: (...args: Parameters<type.Event<E>["method"]>) =>
          (new this(args.shift() as (typeof args)[0]) as any)[i.method](...args),
      }))

    if (d.schedule)
      plugin.schedule = (Array.isArray(d.schedule) ? d.schedule : [d.schedule]).map(i => ({
        ...i,
        method: ctx => (new this(ctx as unknown as type.ctx<E>) as any)[i.method](),
      }))

    if (d.start) plugin.start = ctx => (new this(ctx as unknown as type.ctx<E>) as any)[d.start]()
    if (d.stop) plugin.stop = ctx => (new this(ctx as unknown as type.ctx<E>) as any)[d.stop]()
    if (d.connect) plugin.connect = ctx => (new this(ctx) as any)[d.connect]()
    if (d.close) plugin.close = ctx => (new this(ctx) as any)[d.close]()
    return plugin
  }

  e: E
  logger: Logger
  constructor(public ctx: type.ctx<E>) {
    this.e = ctx.event
    this.logger = ctx.logger
  }

  reply(...args: Parameters<type.ctx<Philia.Event.Event>["reply"]>) {
    if (this.ctx?.reply) return this.ctx.reply(...args)
  }
}
