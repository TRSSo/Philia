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
    handle: type.HandleMap,
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
    try {
      this.meta.remote = await this.getMetaInfo()
      if (this.meta.local.version !== this.meta.remote.version)
        throw makeError("协议版本不支持", this.meta)
      this.encoder = new Encoder(this.meta.local, this.meta.remote)
      for (const i in this.listener) this.event.on(i, this.listener[i])
      this.event.emit("connected", this)
    } catch (err) {
      this.forceClose()
      throw err
    }
  }

  onconnected() {
    this.open = true
    this.sender()
  }

  onclose() {
    this.open = false
    for (const i in this.listener) this.event.off(i, this.listener[i])
  }

  onerror(error: Error) {
    this.logger.error("错误", error)
  }

  setTimeout(cache: type.Cache, timeout = this.timeout.send) {
    const fn = () => {
      if (cache.retry > this.timeout.retry)
        return cache.reject(makeError("等待消息超时", { timeout }))
      cache.retry++
      this.logger.warn(`发送 ${cache.data.id} 超时，重试${cache.retry}次`)
      cache.finally = () => {
        delete this.cache[cache.data.id]
        this.sender()
      }
      this.queue.push(cache.data.id)
      if (this.idle) {
        this.idle = false
        this.sender()
      }
    }
    cache.timeout = setTimeout(fn, timeout)
  }

  sender(): true | undefined {
    if (!this.open) return (this.idle = true)
    const id = this.queue.shift()
    if (!id) return (this.idle = true)
    const cache = this.cache[id]
    if (!cache?.data) return this.sender()
    this.setTimeout(cache)
    this.send(cache.data)
  }

  request(name: type.Request["name"], data?: type.Request["data"]) {
    const id = ulid()
    const cache = {
      data: { id, code: type.EStatus.Request, name, data },
      retry: 0,
      ...Promise.withResolvers(),
    } as type.Cache

    this.cache[id] = cache
    this.queue.push(id)
    if (this.idle) {
      this.idle = false
      this.sender()
    }
    return cache.promise.finally(() => cache.finally())
  }
}
