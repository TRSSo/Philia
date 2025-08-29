import type { Client } from "#connect/common"
import type { Logger } from "#logger"
import type { createAPI } from "#protocol/common"
import type { API, Contact, Event, Message } from "#protocol/type"
import type { Project } from "./app.js"
import type * as type from "./type.js"

/** 基本上下文 */
export interface BaseContext {
  /** API 调用 */
  api: ReturnType<typeof createAPI<API.API>>
  /** 自己信息 */
  self: Contact.Self
  /** 客户端 */
  client: Client
  /** 日志 */
  logger: Logger
}

/** 全局上下文 */
export interface GlobalContext {
  /** 日志 */
  logger: Logger
  /** 所有上下文 */
  ctx_map: Map<Client, BaseContext>
}

/** 事件上下文 */
export class Context<T extends Event.Event> {
  /** API 调用 */
  api: ReturnType<typeof createAPI<API.API>>
  /** 自己信息 */
  self: Contact.Self
  /** 客户端 */
  client: Client
  /** 日志 */
  logger: Logger

  constructor(
    /** 事件 */
    public event: T,
    /** 插件 */
    public plugin: type.Plugin,
    /** 项目 */
    public project: Project,
    /** 基本上下文 */
    ctx: BaseContext,
  ) {
    this.api = ctx.api
    this.self = ctx.self
    this.client = ctx.client
    this.logger = project.plugin.makeLogger(ctx.logger, plugin.name)
  }

  /** 钩子 */
  get hook() {
    const default_opts: ContextHookOpts<T> = {
      type: this.event.type,
      scene: this.event.scene,
      uid: this.event.user.id,
    }
    if (this.event.group?.id) default_opts.gid = this.event.group.id as unknown as undefined

    return {
      set: <U extends Event.Event = T>(
        method: (ctx: Context<U>, cancel: () => void) => (void | boolean) | Promise<void | boolean>,
        opts = default_opts as unknown as ContextHookOpts<U>,
      ) => {
        const hook: ContextHookPlugin<U> = {
          ...opts,
          plugin: this.plugin,
          method: ctx => method(ctx, () => this.project.event.hooks.delete(hook)),
        }
        this.project.event.hooks.add(hook)
      },

      once: <U extends Event.Event = T>(
        method: (ctx: Context<U>) => (void | boolean) | Promise<void | boolean>,
        opts = default_opts as unknown as ContextHookOpts<U>,
      ) => {
        const hook: ContextHookPlugin<U> = {
          ...opts,
          plugin: this.plugin,
          method: ctx => {
            this.project.event.hooks.delete(hook)
            return method(ctx)
          },
        }
        this.project.event.hooks.add(hook)
      },

      promise: <U extends Event.Event = T>(
        opts = default_opts as unknown as ContextHookOpts<U>,
      ) => {
        const { promise, resolve } = Promise.withResolvers<Context<U>>()
        const hook: ContextHookPlugin<U> = { ...opts, plugin: this.plugin, method: resolve }
        this.project.event.hooks.add(hook)
        return promise.finally(this.project.event.hooks.delete.bind(this.project.event.hooks, hook))
      },
    }
  }

  /** 快速回复 */
  reply(data: Message.Message) {
    return this.event.group?.id && this.event.scene !== "group_invite"
      ? this.api.sendMsg({ scene: "group", id: this.event.group.id, data })
      : this.api.sendMsg({ scene: "user", id: this.event.user.id, data })
  }

  /** 快速处理，仅请求事件可用 */
  request(result: boolean, reason?: string, block?: boolean) {
    if (this.event.type !== "request") throw Error("无法处理非请求事件")
    return this.api.setRequest({ id: this.event.id, result, reason, block })
  }
}

/** 钩子选项 */
export interface ContextHookOpts<T extends Event.Event = Event.Event> {
  /** 事件类型 */
  type: T["type"]
  /** 事件场景 */
  scene?: T["scene"]
  /** 发起事件用户ID */
  uid?: T["user"]["id"]
  /** 发起事件群ID */
  gid?: T["group"] extends Contact.Group ? T["group"]["id"] : never
}

/** 钩子 */
export interface ContextHook<D extends Event.Event> {
  /** 添加钩子 */
  set<T extends Event.Event = D>(
    /**
     * 钩子方法
     * @param ctx 上下文
     * @param cancel 取消钩子
     * @returns false 继续执行插件
     */
    method: (ctx: Context<T>, cancel: () => void) => (void | boolean) | Promise<void | boolean>,
    opts?: ContextHookOpts<T>,
  ): void

  /** 添加一次性钩子 */
  once<T extends Event.Event = D>(
    /**
     * 钩子方法
     * @param ctx 上下文
     * @returns false 继续执行插件
     */
    method: (ctx: Context<T>) => (void | boolean) | Promise<void | boolean>,
    opts?: ContextHookOpts<T>,
  ): void

  /** Promise 钩子 */
  promise<T extends Event.Event = D>(opts?: ContextHookOpts<T>): Promise<Context<T>>
}

/** 钩子插件 */
export type ContextHookPlugin<T extends Event.Event = any> = ContextHookOpts<T> & {
  plugin: type.Plugin
  method(ctx: Context<T>): (void | boolean) | Promise<void | boolean>
}
