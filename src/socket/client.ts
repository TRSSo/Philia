import { Socket } from "node:net"
import Path from "node:path"
import { isPromise } from "node:util/types"
import { ulid } from "ulid"
import { IOptions, IMeta, IMetaInfo, IHandle, EStatus, IRequest, IBase, ICache, IReceive, IAsync, IError } from "./types.js"
import { encoder, logger, makeError, findArrays, StringOrBuffer, Loging, getAllProps } from "../util/index.js"
import { promiseEvent } from "../util/common.js"

export default class Client {
  logger = logger
  socket: Socket
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
  handles: IHandle[] = [{
    heartbeat() {},
    getKeys: () => Array.from(new Set(this.handles.flatMap(i => getAllProps(i)))),
  }]
  handle = new Proxy(this.handles, {
    get(target, prop: string) {
      for (const i of target) if (prop in i) {
        if (typeof i[prop]?.bind === "function")
          return i[prop].bind(i)
        else
          return i[prop]
      }
    },
    has(target, prop: string) {
      for (const i of target)
        if (prop in i)
          return true
      return false
    },
  }) as unknown as IHandle
  buffer = Buffer.alloc(0)
  reply_cache: { [key: string]: IBase<EStatus> } = {}
  cache: { [key: ICache["data"]["id"]]: ICache } = {}
  heap: ICache["data"]["id"][] = []
  idle = false
  open = false

  constructor(handle?: IHandle | IHandle[], opts: IOptions = {}, ...args: any[]) {
    if (handle) 
      if (Array.isArray(handle))
        this.handles.push(...handle)
      else
        this.handles.push(handle)

    if (opts.meta)
      Object.assign(this.meta.local, opts.meta)
    if (opts.timeout)
      Object.assign(this.timeout, opts.timeout)
    if (opts.socket)
      this.socket = opts.socket as Socket
    else
      this.socket = new Socket(...args)
        .on("connect", this.onconnect)
    this.socket.setTimeout(this.timeout.idle)

    for (const i in this.listener)
      this.listener[i] = this.listener[i].bind(this)
  }

  connect(path: string, listener?: () => void) {
    if (process.platform === "win32")
      this.path = Path.join("\\\\?\\pipe", path)
    else
      this.path = `\0${path}`
    this.socket.connect(this.path, listener)
    return promiseEvent(this.socket, "connected", "error")
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
      for (const i of this.heap)
        this.cache[i].reject(makeError("连接关闭"))
      this.heap = []
      return this.idle = true
    }
    if (this.heap.length === 0) return this.idle = true
    const id = this.heap.shift() as IBase<EStatus>["id"]
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
    return cache.promise.finally(() => {
      delete this.cache[cache.data.id]
      this.sender()
    })
  }

  send(data: IBase<EStatus>) {
    const promise: Promise<IBase<EStatus>["data"]> = new Promise((resolve, reject) =>
      this.cache[data.id] = { data, retry: 0, resolve, reject } as ICache
    )
    this.cache[data.id].promise = promise
    this.heap.push(data.id)
    if (this.idle) {
      this.idle = false
      this.sender()
    }
    return promise
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

  reply(req: IRequest, code: EStatus, data?: IBase<EStatus>["data"]) {
    this.reply_cache[req.id] = { id: req.id, code, data }
    setTimeout(() => delete this.reply_cache[req.id], this.timeout.idle)
    return this.write(this.reply_cache[req.id])
  }

  request(name: IRequest["name"], data?: IRequest["data"]) {
    return this.send({ id: ulid(), code: EStatus["Request"], name, data })
  }

  receive(data: Buffer) {
    this.buffer = Buffer.concat([this.buffer, data])
    while (this.buffer.length >= 4) {
      const length = this.buffer.readInt32BE()+4
      if (this.buffer.length < length) break
      this.handleData(this.buffer.subarray(4, length))
      this.buffer = this.buffer.subarray(length)
    }
  }

  handleData(data: Buffer) {
    try {
      const req: IBase<EStatus> = this.encoder.decode(data)
      this.logger.trace("接收", req)
      this.handleSwitch(req)
    } catch (err) {
      throw makeError("处理数据错误", { data: StringOrBuffer(data), cause: err })
    }
  }

  handleSwitch(req: IBase<EStatus>) {
    switch (req.code) {
      case EStatus.Request:
        if (this.reply_cache[req.id])
          return this.write(this.reply_cache[req.id])
        return this.handleRequest(req as IRequest, this.reply.bind(this, req as IRequest))
      case EStatus.Receive:
        return this.handleReceive(req as IReceive)
      case EStatus.Async:
        return this.handleAsync(req as IAsync)
      case EStatus.Error:
        return this.handleError(req as IError)
      default:
        throw makeError("不支持的数据类型")
    }
  }

  async handleRequest(req: IRequest, reply: (code: EStatus, data?: IBase<EStatus>["data"]) => void) {
    try {
      let ret: IReceive["data"]
      if (req.name in this.handle) {
        if (typeof this.handle[req.name] !== "function")
          return reply(EStatus.Receive, this.handle[req.name])
        this.logger.debug(`执行处理器 ${req.name}(${req.data === undefined ? "" : Loging(req.data)})`)
        ret = this.handle[req.name](req.data, this)
      } else if (typeof this.handle.default === "function") {
        this.logger.debug(`执行默认处理器 (${Loging(req.name)}${req.data === undefined ? "" : `, ${Loging(req.data)}`})`)
        ret = this.handle.default(req.name, req.data, this)
      } else {
        return reply(EStatus.Error, {
          name: "NotFoundError",
          message: `处理器 ${req.name} 不存在`,
        })
      }

      if (isPromise(ret)) {
        reply(EStatus.Async)
        ret = await ret
      }
      return reply(EStatus.Receive, ret)
    } catch (err) {
      return reply(EStatus.Error, {
        ...(err instanceof Error) ?
          { stack: (err as Error).stack, ...(err as Error) } :
          { error: err },
        name: "HandleError",
        message: `处理器 ${req.name} 错误：${err}`,
      })
    }
  }

  getCache(req: IBase<EStatus>) {
    const cache = this.cache[req.id]
    if (!cache) throw makeError(`请求缓存 ${req.id} 不存在`, { req })
    clearTimeout(cache.timeout)
    return cache
  }

  handleReceive(req: IReceive) {
    const cache = this.getCache(req)
    cache.resolve(req.data)
  }

  handleAsync(req: IAsync) {
    const cache = this.getCache(req)
    cache.timeout = setTimeout(() =>
      cache.reject(makeError("等待异步返回超时", { cache, req, timeout: this.timeout.wait }))
    , this.timeout.wait)
  }

  handleError(req: IError) {
    const cache = this.getCache(req)
    cache.reject(makeError(req.data.message, { ...req.data, request: cache.data }))
  }
}