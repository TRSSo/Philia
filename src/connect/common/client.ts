import logger from "#logger"
import * as type from "./type.js"
import Handle from "./handle.js"
import { ulid } from "ulid"
import { encoder, verify, Encoder, makeError } from "#util"

export default abstract class Client {
  logger = logger
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
  encoder = new Encoder()
  cache: { [key: type.Cache["data"]["id"]]: type.Cache } = {}
  queue: type.Cache["data"]["id"][] = []
  idle = false
  open = false
  path = ""

  constructor(handle: type.Handles, opts: type.Options = {}) {
    this.handle = new Handle(handle, this)
    if (opts.meta) Object.assign(this.meta.local, opts.meta)
    if (opts.timeout) Object.assign(this.timeout, opts.timeout)
  }

  abstract write(data: type.Base<type.EStatus>): void
  abstract getMetaInfo(): Promise<type.MetaInfo>
  abstract force_close(): void

  async onconnectMeta() {
    try {
      this.meta.remote = await this.getMetaInfo()
      if (this.meta.local.version !== this.meta.remote.version)
        throw makeError("协议版本不支持", this.meta)
      this.encoder = new Encoder(this.meta.local, this.meta.remote)
    } catch (err) {
      this.force_close()
      throw err
    }
  }

  async sender(): Promise<type.Cache["promise"]> {
    if (!this.open) {
      for (const i of this.queue) this.cache[i].reject(Error("连接关闭"))
      this.queue = []
      return (this.idle = true)
    }
    if (this.queue.length === 0) return (this.idle = true)
    const id = this.queue.shift() as type.Base<type.EStatus>["id"]
    const cache = this.cache[id]
    if (!cache?.data) return this.sender()
    const timeout = () => {
      if (cache.retry > this.timeout.retry)
        return cache.reject(makeError("等待消息超时", { timeout: this.timeout.send }))
      cache.retry++
      this.logger.debug(`发送 ${id} 超时，重试${cache.retry}次`)
      cache.timeout = setTimeout(timeout, this.timeout.send)
      this.write(cache.data)
    }
    cache.timeout = setTimeout(timeout, this.timeout.send)
    this.write(cache.data)
  }

  send(data: type.Request) {
    const cache = {
      data,
      retry: 0,
      ...Promise.withResolvers(),
      finally: () => {
        delete this.cache[data.id]
        this.sender()
      },
    }

    this.cache[data.id] = cache
    this.queue.push(data.id)
    if (this.idle) {
      this.idle = false
      this.sender()
    }
    return cache.promise
  }

  request(name: type.Request["name"], data?: type.Request["data"]) {
    return this.send({ id: ulid(), code: type.EStatus["Request"], name, data })
  }
}
