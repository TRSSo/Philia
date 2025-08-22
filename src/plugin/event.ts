import type { Client } from "#connect/common"
import type * as Philia from "#protocol/type"
import type { Project } from "./app.js"
import type * as type from "./type.js"

export class EventHandle {
  constructor(public project: Project) {}

  handle(event: Philia.Event.Event, client: Client) {
    const ctx_base = this.project.ctx_map.get(client)
    if (!ctx_base) return this.project.logger.warn("客户端上下文不存在", client)
    const ctx: type.ctx<Philia.Event.Event> = { ...ctx_base, event }

    if (event.group?.id && event.scene !== "group_invite")
      ctx.reply = data => ctx.api.sendMsg({ scene: "group", id: event.group!.id, data })
    else ctx.reply = data => ctx.api.sendMsg({ scene: "user", id: event.user.id, data })

    if (event.type === "request")
      ctx.request = (result, reason, block) =>
        ctx.api.setRequest({ id: event.id, result, reason, block })

    return this.middleware(ctx)
  }

  middleware(ctx: type.ctx<Philia.Event.Event>) {
    const middleware = this.project.plugin.middleware
    let i = -1
    const next: (index: number) => Promise<boolean> = async (index: number) => {
      if (index !== i) {
        ctx.logger.error(middleware[index].plugin.name, "中间件重复调用 next()")
        throw Error("中间件重复调用 next()")
      }

      do {
        i++
        if (i >= middleware.length) return this.event(ctx)
      } while (
        middleware[i].type !== ctx.event.type ||
        (middleware[i].scene && middleware[i].scene !== ctx.event.scene)
      )

      const logger = this.project.plugin.makeLogger(ctx.logger, middleware[i].plugin.name)
      logger.debug("中间件开始执行")
      try {
        return await middleware[i].method({ ...ctx, logger }, next.bind(undefined, i))
      } catch (err) {
        logger.error("中间件执行错误", err)
        return true
      }
    }
    return next(i)
  }

  async event(ctx: type.ctx<Philia.Event.Event>) {
    if (
      ctx.event.type === "message" &&
      (await this.command(ctx as type.ctx<Philia.Event.Message>)) === true
    )
      return true

    for (const i of this.project.plugin.event) {
      if (i.type !== ctx.event.type || (i.scene && i.scene !== ctx.event.scene)) continue

      const logger = this.project.plugin.makeLogger(ctx.logger, i.plugin.name)
      logger.debug("事件开始执行")
      try {
        await i.method({ ...ctx, logger })
      } catch (err) {
        logger.error(i.plugin.name, "事件执行错误", err)
      }
      return true
    }

    return false
  }

  async command(ctx: type.ctx<Philia.Event.Message>) {
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
        ctx.logger.error(i.plugin.name, i.cmd, "命令匹配错误", err)
        continue
      }

      const logger = this.project.plugin.makeLogger(ctx.logger, i.plugin.name)
      logger.debug("命令开始执行", ...args)
      try {
        await i.method({ ...ctx, logger }, ...args)
      } catch (err) {
        logger.error("命令执行错误", err)
      }
      return true
    }

    return false
  }
}
