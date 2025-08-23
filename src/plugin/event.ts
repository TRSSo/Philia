import type { Client } from "#connect/common"
import type { Event } from "#protocol/type"
import { chalk } from "#util"
import type { Project } from "./app.js"
import type * as type from "./type.js"

export type Hook = type.ctxHookOpts & {
  plugin: type.Plugin
  method<T extends type.ctx<Event.Event>>(ctx: T): (void | boolean) | Promise<void | boolean>
}

export const hook = chalk.yellow("[钩子]")
export const middleware = chalk.yellow("[中间件]")
export const event = chalk.yellow("[事件]")
export const command = chalk.yellow("[命令]")

export class EventHandle {
  hooks = new Set<Hook>()
  constructor(public project: Project) {}

  handle<T extends Event.Event>(event: T, client: Client) {
    const ctx_base = this.project.ctx_map.get(client)
    if (!ctx_base) return this.project.logger.warn("客户端上下文不存在", client)

    const ctx: type.ctx<T> = {
      ...ctx_base,
      event,
      reply: (event.group?.id && event.scene !== "group_invite"
        ? data => ctx.api.sendMsg({ scene: "group", id: event.group!.id, data })
        : data => ctx.api.sendMsg({ scene: "user", id: event.user.id, data })) as typeof ctx.reply,
    }

    if (event.type === "request")
      ctx.request = ((result, reason, block) =>
        ctx.api.setRequest({ id: event.id, result, reason, block })) as typeof ctx.request

    return this.hook(ctx)
  }

  getHook<T extends type.ctx<Event.Event>>(ctx: T, plugin: type.Plugin) {
    const default_opts: type.ctxHookOpts = {
      type: ctx.event.type,
      scene: ctx.event.scene,
      uid: ctx.event.user.id,
    }
    if (ctx.event.group?.id) default_opts.gid = ctx.event.group.id as unknown as undefined

    return {
      set: (method: Parameters<T["hook"]["set"]>[0], opts = default_opts) => {
        const hook: Hook = {
          ...opts,
          plugin,
          method: ctx => method(ctx, () => this.hooks.delete(hook)),
        }
        this.hooks.add(hook)
      },

      once: (method: Parameters<T["hook"]["once"]>[0], opts = default_opts) => {
        const hook: Hook = {
          ...opts,
          plugin,
          method: ctx => {
            this.hooks.delete(hook)
            return method(ctx)
          },
        }
        this.hooks.add(hook)
      },

      promise: (opts = default_opts) => {
        const { promise, resolve } = Promise.withResolvers()
        const hook: Hook = { ...opts, plugin, method: resolve }
        this.hooks.add(hook)
        return promise.finally(this.hooks.delete.bind(this.hooks, hook))
      },
    } as T["hook"]
  }

  makeHook<T extends type.ctx<Event.Event>>(ctx: T, plugin: type.Plugin) {
    Object.defineProperty(ctx, "hook", { get: this.getHook.bind(this, ctx, plugin) })
    return ctx
  }

  async hook<T extends type.ctx<Event.Event>>(ctx: T) {
    for (const i of this.hooks) {
      if (
        i.type !== ctx.event.type ||
        (i.scene && i.scene !== ctx.event.scene) ||
        (i.uid && i.uid !== ctx.event.user.id) ||
        (i.gid && i.gid !== ctx.event.group?.id)
      )
        continue

      const logger = this.project.plugin.makeLogger(ctx.logger, i.plugin.name)
      logger.debug(`${hook}开始执行`)
      try {
        const ret = await i.method(this.makeHook({ ...ctx, logger }, i.plugin))
        logger.debug(`${hook}执行完成`)
        if (ret === false) continue
      } catch (err) {
        logger.error(`${hook}执行错误`, err)
      }
      return true
    }

    return this.middleware(ctx)
  }

  middleware<T extends type.ctx<Event.Event>>(ctx: T) {
    const mw = this.project.plugin.middleware
    let i = -1
    const next: (index: number) => Promise<boolean> = async (index: number) => {
      if (index !== i) {
        ctx.logger.error(mw[index].plugin.name, `${middleware}重复调用 next()`)
        throw Error("中间件重复调用 next()")
      }

      do {
        i++
        if (i >= mw.length) return this.event(ctx)
      } while (mw[i].type !== ctx.event.type || (mw[i].scene && mw[i].scene !== ctx.event.scene))

      const logger = this.project.plugin.makeLogger(ctx.logger, mw[i].plugin.name)
      logger.debug(`${middleware}开始执行`)
      try {
        const ret = await mw[i].method(
          this.makeHook({ ...ctx, logger }, mw[i].plugin),
          next.bind(undefined, i),
        )
        logger.debug(`${middleware}执行完成`)
        return ret
      } catch (err) {
        logger.error(`${middleware}执行错误`, err)
        return true
      }
    }
    return next(i)
  }

  async event<T extends type.ctx<Event.Event>>(ctx: T) {
    if (
      ctx.event.type === "message" &&
      (await this.command(ctx as type.ctx<Event.Message>)) === true
    )
      return true

    for (const i of this.project.plugin.event) {
      if (i.type !== ctx.event.type || (i.scene && i.scene !== ctx.event.scene)) continue

      const logger = this.project.plugin.makeLogger(ctx.logger, i.plugin.name)
      logger.debug(`${event}开始执行`)
      try {
        await i.method(this.makeHook({ ...ctx, logger }, i.plugin))
        logger.debug(`${event}执行完成`)
      } catch (err) {
        logger.error(`${event}执行错误`, err)
      }
      return true
    }

    return false
  }

  async command<T extends type.ctx<Event.Message>>(ctx: T) {
    let msg = ctx.event.message.reduce(
      (pre, cur) => (cur.type === "text" ? pre + cur.data : pre),
      "",
    )
    if (!msg.startsWith(this.project.config.command.prefix)) return false
    msg = msg.slice(this.project.config.command.prefix.length)
    const split = this.project.config.command.split

    for (const i of this.project.plugin.command) {
      if (i.scene && i.scene !== ctx.event.scene) continue
      let args: [string & RegExpMatchArray, string]
      try {
        if (Array.isArray(i.cmd)) {
          const cmd = i.cmd.find(cmd => msg.startsWith(`${cmd}${split}`))
          if (!cmd) continue
          args = [cmd, msg.slice(cmd.length + split.length)] as typeof args
        } else if (i.cmd instanceof RegExp) {
          const match = msg.match(i.cmd)
          if (!match) continue
          args = [match] as unknown as typeof args
        } else {
          if (!msg.startsWith(`${i.cmd}${split}`)) continue
          args = [msg.slice(i.cmd.length + split.length)] as unknown as typeof args
        }
      } catch (err) {
        ctx.logger.error(i.plugin.name, i.cmd, `${command}匹配错误`, err)
        continue
      }

      const logger = this.project.plugin.makeLogger(ctx.logger, i.plugin.name)
      logger.debug(`${command}开始执行`, ...args)
      try {
        await i.method(this.makeHook({ ...ctx, logger }, i.plugin), ...args)
        logger.debug(`${command}执行完成`)
      } catch (err) {
        logger.error(`${command}执行错误`, err)
      }
      return true
    }

    return false
  }
}
