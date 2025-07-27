import { Writable } from "node:stream"
import type log4js from "log4js"
import type { Client } from "#connect/common"
import { getLogger } from "#logger"
import type Manager from "./server.js"
import { type LoggerEvent, LoggerLevel, type LoggerLevelStr, type ManagerConfig } from "./type.js"

const stream = new Writable({ write: (_, __, c) => c() })
for (const i of ["stdout", "stderr"] as const)
  process[i].once("error", () => (process[i].write = stream.write.bind(stream)))

export default class LoggerManager {
  events: LoggerEvent[] = []
  follows: { level: LoggerLevel; handle: string; client: Client }[] = []
  config: ManagerConfig["logger"]
  constructor(
    public manager: Manager,
    public logger = getLogger(),
  ) {
    this.config = manager.config.logger
    this.manager.logger.setHook()
    this.logger.setHook(this.hook.bind(this))
  }

  hook(name: string, l: log4js.Level, data: string[]) {
    const event: LoggerEvent = {
      name,
      time: Date.now(),
      level: LoggerLevel[l.levelStr as LoggerLevelStr],
      data,
    }
    for (const i of this.follows) if (event.level >= i.level) i.client.request(i.handle, event)
    if (this.events.length === this.config.max_lines) this.events.unshift()
    this.events.push(event)
  }

  get(opts: { level: LoggerLevel; time?: number; lines?: number }) {
    const events = []
    /** 时间小于零从最新往前获取 */
    if (opts.time && opts.time < 0)
      for (let i = this.events.length - 1; i >= 0; i--) {
        const e = this.events[i]
        if (e.level < opts.level) continue
        events.unshift(e)
        if (opts.lines && events.length === opts.lines) break
      }
    else
      for (const e of this.events) {
        if (e.level < opts.level || (opts.time && e.time < opts.time)) continue
        events.push(e)
        if (opts.lines && events.length === opts.lines) break
      }
    return events
  }

  follow(data: Omit<(typeof this.follows)[0], "client">, client: Client) {
    if (!this.follows.some(i => i.client === client))
      client.event.once("close", this.unfollow.bind(this, client))
    this.follows.push({ ...data, client })
  }

  unfollow(client: Client) {
    this.follows = this.follows.filter(i => i.client !== client)
  }
}
