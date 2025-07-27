import { ulid } from "ulid"
import type { Logger } from "#logger"
import { compress, Encoder, encoder, makeError, verify } from "#util"
import Handle from "./handle.js"
import * as type from "./type.js"

export default abstract class Client {
  handle: Handle
  timeout = {
    send: 5e3,
    wait: 6e4,
    idle: 3e5,
    retry: 3,
  }
  meta: type.Meta = {
    local: {
      id: ulid(),
      name: "Client",
      version: 1,
      encode: Object.keys(encoder),
      verify: Object.keys(verify),
    },
  }
  encoder!: Encoder
  cache: { [key: type.Cache["data"]["id"]]: type.Cache } = {}
  queue: type.Cache["data"]["id"][] = []
  idle = false
  open = false
  path = ""

  constructor(
    public logger: Logger,
    handle: type.Handles,
    opts: type.Options = {},
  ) {
    this.handle = new Handle(handle, this)
    if (opts.meta) Object.assign(this.meta.local, opts.meta)
    if (opts.timeout) Object.assign(this.timeout, opts.timeout)
    if (opts.compress) this.meta.local.verify.unshift(...Object.keys(compress))
    else this.meta.local.verify.push(...Object.keys(compress))
  }

  abstract listener: { [key: string]: (...args: any[]) => void }
  abstract event: NodeJS.EventEmitter
  abstract write(data: Buffer): void
  abstract getMetaInfo(): Promise<type.MetaInfo>
  abstract connect(path?: string): Promise<this>
  abstract close(): Promise<void>
  abstract forceClose(): void

  send(data: type.Status) {
    if ("data" in data && data.data === undefined) delete data.data
    this.logger.trace("发送", data)
    return this.write(this.encoder.encode(data))
  }

  async onconnect() {
    await this.onconnectMeta()
    for (const i in this.listener) this.event.on(i, this.listener[i])
    this.event.emit("connected", this)
  }

  async onconnectMeta() {
    try {
      this.meta.remote = await this.getMetaInfo()
      if (this.meta.local.version !== this.meta.remote.version)
        throw makeError("协议版本不支持", this.meta)
      this.encoder = new Encoder(this.meta.local, this.meta.remote)
    } catch (err) {
      this.forceClose()
      throw err
    }
  }

  sender(): true | undefined {
    if (!this.open) {
      for (const i of this.queue) this.cache[i].reject(Error("连接关闭"))
      this.queue = []
      return (this.idle = true)
    }
    if (this.queue.length === 0) return (this.idle = true)
    const id = this.queue.shift() as type.Status["id"]
    const cache = this.cache[id]
    if (!cache?.data) return this.sender()
    const timeout = () => {
      if (cache.retry > this.timeout.retry)
        return cache.reject(makeError("等待消息超时", { timeout: this.timeout.send }))
      cache.retry++
      this.logger.warn(`发送 ${id} 超时，重试${cache.retry}次`)
      cache.timeout = setTimeout(timeout, this.timeout.send)
      this.send(cache.data)
    }
    cache.timeout = setTimeout(timeout, this.timeout.send)
    this.send(cache.data)
  }

  request(name: type.Request["name"], data?: type.Request["data"]) {
    const id = ulid()
    const cache = {
      data: { id, code: type.EStatus.Request as const, name, data },
      retry: 0,
      ...Promise.withResolvers(),
      finally: () => {
        delete this.cache[id]
        this.sender()
      },
    }

    this.cache[id] = cache
    this.queue.push(id)
    if (this.idle) {
      this.idle = false
      this.sender()
    }
    return cache.promise.finally(() => cache.finally())
  }
}
