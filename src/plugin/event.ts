import type { Client } from "#connect/common"
import type { Event } from "#protocol/type"
import { chalk } from "#util"
import type { Project } from "./app.js"
import { type BaseContext, Context, type ContextHookPlugin } from "./context.js"

export const HOOK = chalk.yellow("[钩子]")
export const MIDDLEWARE = chalk.yellow("[中间件]")
export const EVENT = chalk.yellow("[事件]")
export const COMMAND = chalk.yellow("[命令]")

export class EventHandle {
  hooks = new Set<ContextHookPlugin<any>>()
  constructor(public project: Project) {}

  handle<T extends Event.Event>(event: T, client: Client) {
    const ctx = this.project.ctx_map.get(client)
    if (!ctx) return this.project.logger.warn("客户端上下文不存在", client)
    return this.hook(event, ctx)
  }

  async hook<T extends Event.Event>(event: T, base_ctx: BaseContext) {
    for (const i of this.hooks) {
      if (
        i.type !== event.type ||
        (i.scene && i.scene !== event.scene) ||
        (i.uid && i.uid !== event.user.id) ||
        (i.gid && i.gid !== event.group?.id)
      )
        continue

      const ctx = new Context(event, i.plugin, this.project, base_ctx)
      ctx.logger.debug(`${HOOK}开始执行`)
      try {
        const ret = await i.method(ctx)
        ctx.logger.debug(`${HOOK}执行完成`)
        if (ret === false) continue
      } catch (err) {
        ctx.logger.error(`${HOOK}执行错误`, err)
      }
      return true
    }

    return this.middleware(event, base_ctx)
  }

  middleware<T extends Event.Event>(event: T, base_ctx: BaseContext) {
    const mw = this.project.plugin.middleware
    let i = -1
    const next: (index: number) => Promise<boolean> = async (index: number) => {
      if (index !== i) {
        base_ctx.logger.error(mw[index].plugin.name, `${MIDDLEWARE}重复调用 next()`)
        throw Error("中间件重复调用 next()")
      }

      do {
        i++
        if (i >= mw.length) return this.event(event, base_ctx)
      } while (mw[i].type !== event.type || (mw[i].scene && mw[i].scene !== event.scene))

      const ctx = new Context(event, mw[i].plugin, this.project, base_ctx)
      ctx.logger.debug(`${MIDDLEWARE}开始执行`)
      try {
        const ret = await mw[i].method(ctx, next.bind(undefined, i))
        ctx.logger.debug(`${MIDDLEWARE}执行完成`)
        return ret
      } catch (err) {
        ctx.logger.error(`${MIDDLEWARE}执行错误`, err)
        return true
      }
    }
    return next(i)
  }

  async event<T extends Event.Event>(event: T, base_ctx: BaseContext) {
    if (event.type === "message" && (await this.command(event as Event.Message, base_ctx)) === true)
      return true

    for (const i of this.project.plugin.event) {
      if (i.type !== event.type || (i.scene && i.scene !== event.scene)) continue

      const ctx = new Context(event, i.plugin, this.project, base_ctx)
      ctx.logger.debug(`${EVENT}开始执行`)
      try {
        await i.method(ctx)
        ctx.logger.debug(`${EVENT}执行完成`)
      } catch (err) {
        ctx.logger.error(`${EVENT}执行错误`, err)
      }
      return true
    }

    return false
  }

  async command<T extends Event.Message>(event: T, base_ctx: BaseContext) {
    let msg = event.message.reduce((pre, cur) => (cur.type === "text" ? pre + cur.data : pre), "")
    if (!msg.startsWith(this.project.config.command.prefix)) return false
    msg = msg.slice(this.project.config.command.prefix.length)
    const split = this.project.config.command.split

    for (const i of this.project.plugin.command) {
      if (i.scene && i.scene !== event.scene) continue
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
        base_ctx.logger.error(i.plugin.name, i.cmd, `${COMMAND}匹配错误`, err)
        continue
      }

      const ctx = new Context(event, i.plugin, this.project, base_ctx)
      ctx.logger.debug(`${COMMAND}开始执行`, ...args)
      try {
        await i.method(ctx, ...args)
        ctx.logger.debug(`${COMMAND}执行完成`)
      } catch (err) {
        ctx.logger.error(`${COMMAND}执行错误`, err)
      }
      return true
    }

    return false
  }
}
