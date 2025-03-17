import { Socket } from "node:net"
import Path from "node:path"
import { ulid } from "ulid"
import { IClientOptions, IMeta, IMetaInfo, IHandles, EStatus, IRequest, IBase, ICache } from "./type.js"
import { encoder, logger, makeError, findArrays, StringOrBuffer } from "../util/index.js"
import { promiseEvent } from "../util/common.js"
import Handle from "./handle.js"

export default class Client {
  logger = logger
  socket: Socket & { path?: string }
  handle: Handle
  timeout = {
    send: 5e3,
    wait: 6e4,
    idle: 3e5,
    retry: 3,
  }
  meta: IMeta = {
    local: {
      id: ulid(),
      name: "Client",
      version: 1,
      encode: Object.keys(encoder),
    },
  }
  path = ""
  encoder = encoder.JSON
  buffer = Buffer.alloc(0)
  cache: { [key: ICache["data"]["id"]]: ICache } = {}
  queue: ICache["data"]["id"][] = []
  idle = false
  open = false

  constructor(handle: IHandles, opts: IClientOptions = {}) {
    this.handle = new Handle(handle, this)

    if (opts.meta)
      Object.assign(this.meta.local, opts.meta)
    if (opts.timeout)
      Object.assign(this.timeout, opts.timeout)
    if (opts.path)
      this.path = opts.path
    if (opts.socket instanceof Socket)
      this.socket = opts.socket as Socket
    else
      this.socket = new Socket(opts.socket)
        .on("connect", this.onconnect)
    this.socket.setTimeout(this.timeout.idle)

    for (const i in this.listener)
      this.listener[i] = this.listener[i].bind(this)
  }

  connect(path = this.path, listener?: () => void) {
    if (process.platform === "win32")
      this.socket.path = Path.join("\\\\?\\pipe", path)
    else
      this.socket.path = `\0${path}`
    this.socket.connect(this.socket.path as string, listener)
    return promiseEvent(this.socket, "connected", "error") as Promise<Client | Error>
  }

  onconnect = async () => {
    try {
      this.meta.remote = await this.getMetaInfo() as IMetaInfo
      if (this.meta.local.version !== this.meta.remote.version)
        throw makeError("两端版本不匹配", this.meta)
      const encode = findArrays(this.meta.local.encode, this.meta.remote.encode) as string
      if (!encode)
        throw makeError("两端编码不匹配", this.meta)
      const decode = findArrays(this.meta.remote.encode, this.meta.local.encode) as string
      this.encoder = {
        encode: encoder[encode].encode,
        decode: encoder[decode].decode,
      }
    } catch (err) {
      this.socket.destroy()
      throw err
    }

    for (const i in this.listener)
      this.socket.on(i, this.listener[i])
    this.socket.emit("connected", this)
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    data: this.receive,
    end(this: Client) {
      this.logger.info(`${this.meta.remote?.id} 请求关闭`)
    },
    close(this: Client) {
      this.open = false
      this.buffer = Buffer.alloc(0)
      for (const i in this.listener)
        this.socket.off(i, this.listener[i])
      this.logger.info(`${this.meta.remote?.id} 已断开连接`)
    },
    timeout(this: Client) {
      this.request("heartbeat")
    },
    connected(this: Client) {
      this.logger.info("已连接", this.meta.remote)
      this.open = true
      this.sender()
    },
    error(this: Client, error) {
      this.logger.error("错误", error)
    },
  }

  close() {
    this.socket.end()
    const timeout = setTimeout(() => this.socket.destroy(), this.timeout.wait)
    return promiseEvent(this.socket, "close", "error").finally(() => clearTimeout(timeout))
  }

  write(data: IBase<EStatus>) {
    if (data.data === undefined) delete data.data
    this.logger.trace("发送", data)
    const buffer = this.encoder.encode(data)
    const length = Buffer.alloc(4)
    length.writeInt32BE(buffer.length)
    return this.socket.write(Buffer.concat([length, buffer]))
  }

  async sender(): Promise<ICache["promise"]> {
    if (!this.open) {
      for (const i of this.queue)
        this.cache[i].reject(makeError("连接关闭"))
      this.queue = []
      return this.idle = true
    }
    if (this.queue.length === 0) return this.idle = true
    const id = this.queue.shift() as IBase<EStatus>["id"]
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

  send(data: IBase<EStatus>) {
    const cache = { data, retry: 0, finally: () => {
      delete this.cache[data.id]
      this.sender()
    }} as ICache
    cache.promise = new Promise((resolve, reject) => {
      cache.resolve = resolve
      cache.reject = reject
    }).finally(() => cache.finally())

    this.cache[data.id] = cache
    this.queue.push(data.id)
    if (this.idle) {
      this.idle = false
      this.sender()
    }
    return cache.promise
  }

  getMetaInfo(): Promise<IMetaInfo> {
    this.socket.write(encoder.JSON.encode(this.meta.local))
    return new Promise((resolve, reject) => {
      const listener = (data: Buffer) => {
        clearTimeout(timeout)
        try {
          resolve(encoder.JSON.decode(data))
        } catch (err) {
          reject(makeError("解析元数据错误", { data: StringOrBuffer(data), cause: err }))
        }
      }
      this.socket.once("data", listener)
      const timeout = setTimeout(() => {
        reject(makeError("等待元数据超时", { timeout: this.timeout.send }))
        this.socket.off("data", listener)
      }, this.timeout.send)
    })
  }

  request(name: IRequest["name"], data?: IRequest["data"]) {
    return this.send({ id: ulid(), code: EStatus["Request"], name, data })
  }

  receive(data: Buffer) {
    try {
      this.buffer = Buffer.concat([this.buffer, data])
      while (this.buffer.length >= 4) {
        const length = this.buffer.readInt32BE()+4
        if (this.buffer.length < length) break
        this.handle.data(this.encoder.decode(this.buffer.subarray(4, length)))
        this.buffer = this.buffer.subarray(length)
      }
    } catch (err) {
      this.close()
      throw makeError("处理数据错误", { data, cause: err })
    }
  }
}

export function createClient(path: string | Client, handle: ConstructorParameters<typeof Client>[0], opts?: ConstructorParameters<typeof Client>[1]) {
  if (path instanceof Client) {
    path.handle.set(handle)
    return path
  }
  return new Client(handle, { ...opts, path })
}