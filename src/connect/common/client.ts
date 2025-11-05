import { ulid } from "ulid"
import type { Logger } from "#logger"
import { makeError, promiseEvent } from "#util"
import { compress, Encoder, encoder, verify } from "./encoder.js"
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
      encode: Array.from(encoder.keys()),
      verify: Array.from(verify.keys()),
    },
  }
  encoder!: Encoder
  cache = new Map<type.Cache["data"]["id"], type.Cache>()
  queue: type.Cache["data"]["id"][] = []
  idle = false
  open = false
  path = ""
  connected_fn?(client: this): void
  closed_fn?(client: this): void

  constructor(
    public logger: Logger,
    handle: type.HandleMap,
    opts: type.Options = {},
  ) {
    this.handle = new Handle(handle, this)
    if (opts.meta) Object.assign(this.meta.local, opts.meta)
    if (opts.timeout) Object.assign(this.timeout, opts.timeout)
    if (opts.compress) this.meta.local.verify.unshift(...Array.from(compress.keys()))
    else this.meta.local.verify.push(...Array.from(compress.keys()))
    if (opts.connected_fn) this.connected_fn = opts.connected_fn
    if (opts.closed_fn) this.closed_fn = opts.closed_fn
  }

  /** 连接事件监听器 */
  abstract listener: { [key: string]: (...args: any[]) => void }
  /** 连接对象 */
  abstract event: NodeJS.EventEmitter
  /** 最终发送的二进制数据 */
  abstract write(data: Buffer): void
  /** 获取元信息 */
  abstract getMetaInfo(): Promise<type.MetaInfo>
  /** 打开连接 */
  abstract connectOpen(path: string): void
  /** 关闭连接 */
  abstract close(): Promise<void>
  /** 强制关闭连接 */
  abstract forceClose(): void

  /**
   * 连接到服务端
   * @param path 连接地址，为空则从构造函数读取
   * @param reconnect 自动重连毫秒，为0则不重连
   * @returns 开启自动重连返回 void，否则 Promise
   */
  connect(path: string | undefined, reconnect: 0): Promise<this>
  connect(path?: string, reconnect?: number): void
  connect(path?: string, reconnect?: number) {
    if (this.open) throw Error("连接已打开")
    if (path) this.path = path
    else if (this.path) path = this.path
    else throw Error("连接地址为空")
    this.connectOpen(path)
    return this.onconnectError(reconnect)
  }

  /** 发送数据 */
  send(data: type.Status) {
    if ("data" in data && data.data === undefined) delete data.data
    this.logger.trace("发送", data)
    return this.write(this.encoder.encode(data))
  }

  /** 处理开启连接 */
  async onconnect() {
    try {
      this.meta.remote = await this.getMetaInfo()
      if (this.meta.local.version !== this.meta.remote.version)
        throw makeError("协议版本不支持", this.meta)
      this.encoder = new Encoder(this.meta.local, this.meta.remote)
      for (const i in this.listener) this.event.on(i, this.listener[i])
      this.event.emit("connected", this)
    } catch (err) {
      if (this.path) this.event.emit("error", err)
      else throw err
    }
  }

  /** 处理连接成功 */
  onconnected(info = "") {
    this.open = true
    this.sender()
    this.connected_fn?.(this)
    info &&= `，${info}`
    if (this.path) this.logger.debug(`${this.meta.remote?.id} 已连接`, this.meta.remote)
    else {
      this.logger.info(`${this.meta.remote?.id} 已连接${info}`)
      this.logger.debug(this.meta.remote)
    }
  }

  /** 处理连接时错误 */
  onconnectError(reconnect?: number) {
    if (reconnect === 0) return promiseEvent<this>(this.event, "connected", "error")
    this.reconnect_allow = true
    promiseEvent<this>(this.event, "connected", "error").catch(err => {
      this.logger.error("连接错误", err)
      this.reconnect(reconnect)
    })
  }

  reconnect_allow = false
  reconnect_timeout?: NodeJS.Timeout
  /** 处理重连 */
  reconnect(delay = this.timeout.send) {
    if (!this.reconnect_allow) return
    this.logger.info(delay / 1e3, "秒后重连")
    this.reconnect_timeout = setTimeout(
      this.connect.bind(this, undefined, delay + this.timeout.send),
      delay,
    )
  }

  /** 准备关闭连接 */
  prepareClose() {
    this.reconnect_allow = false
    clearTimeout(this.reconnect_timeout)
  }

  /** 处理连接关闭 */
  onclose(info = "") {
    this.open = false
    for (const i in this.listener) this.event.off(i, this.listener[i])
    this.closed_fn?.(this)

    this.cache.forEach((cache, id) => {
      cache.finally = this.cache.delete.bind(this.cache, id)
      clearTimeout(cache.timeout)
      cache.timeout = setTimeout(() => cache.reject(Error("连接断开")), this.timeout.wait)
    })

    info = `${this.meta.remote?.id} 已断开连接${info && `，${info}`}`
    if (this.path && this.reconnect_allow) {
      this.logger.warn(info)
      this.reconnect()
    } else this.logger.debug(info)
  }

  /** 处理连接错误 */
  onerror(error: Error) {
    this.logger.error("错误", error)
    this.forceClose()
  }

  /** 设置请求超时 */
  setTimeout(cache: type.Cache, timeout?: number) {
    const fn = () => {
      if (cache.retry > this.timeout.retry)
        return cache.reject(makeError("等待消息超时", { timeout }))
      cache.retry++
      this.logger.warn(`发送 ${cache.data.id} 超时，重试${cache.retry}次`)
      if (timeout) {
        this.queue.push(cache.data.id)
        if (this.idle) {
          this.idle = false
          this.sender()
        }
      } else {
        this.queue.unshift(cache.data.id)
        this.idle = false
        this.sender()
      }
    }
    cache.timeout = setTimeout(fn, timeout ?? this.timeout.send)
  }

  /** 启动发送数据队列 */
  sender(): true | undefined {
    if (!this.open) return (this.idle = true)
    const id = this.queue.shift()
    if (!id) return (this.idle = true)
    const cache = this.cache.get(id)
    if (!cache?.data) return this.sender()
    this.setTimeout(cache)
    this.send(cache.data)
  }

  /** 发送请求 */
  request(name: type.Request["name"], data?: type.Request["data"]) {
    const id = ulid()
    const cache = {
      data: { id, code: type.EStatus.Request as const, name, data },
      retry: 0,
      finally: () => {
        this.cache.delete(id)
        this.sender()
      },
      ...Promise.withResolvers(),
    }

    this.cache.set(id, cache)
    this.queue.push(id)
    if (this.idle) {
      this.idle = false
      this.sender()
    }
    return cache.promise.finally(() => cache.finally())
  }
}
