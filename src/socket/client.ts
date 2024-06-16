import { Socket } from "node:net"
import Path from "node:path"
import { isPromise } from "node:util/types"
import { ulid } from "ulid"
import { IOptions, IMeta, IMetaInfo, IHandle, EStatus, IRequest, IBase, ICache, IReceive, IAsync, IError } from "./types.js"
import { logger, makeError, findArrays, StringOrBuffer, Loging, getAllProps } from "../util/index.js"
import encoding from "./encoding.js"

export default class Client {
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
      encoding: Object.keys(encoding),
    },
  }
  encoding = encoding.JSON
  handle: IHandle = {
    heartbeat() {},
    getKeys() { return Object.keys(this) },
  }
  handles?: IHandle[]
  buffer = Buffer.alloc(0)
  reply_cache: { [key: string]: IBase<EStatus> } = {}
  cache: { [key: ICache["data"]["id"]]: ICache } = {}
  heap: ICache["data"]["id"][] = []
  idle = false
  closed = false

  constructor(handle: IHandle | IHandle[] = {}, opts: IOptions = {}, ...args: any[]) {
    if (Array.isArray(handle)) {
      this.handles = handle
      this.handle.default = (name, data, client) => {
        for (const i of this.handles as IHandle[]) if (name in i) {
          if (typeof (i as any)[name] === "function")
            return (i as any)[name](data, client)
          else
            return (i as any)[name]
        }
        throw Error(`处理器 ${name} 不存在`)
      }
      this.handle.getKeys = () => Array.from(new Set((this.handles as IHandle[]).flatMap(i => getAllProps(i))))
    } else Object.assign(this.handle, handle)

    if (opts.meta)
      Object.assign(this.meta.local, opts.meta)
    if (opts.timeout)
      Object.assign(this.timeout, opts.timeout)
    if (opts.socket)
      this.socket = opts.socket
    else
      this.socket = new Socket(...args)
        .on("connect", this.onconnect)
    this.socket.setTimeout(this.timeout.idle)
  }

  connect(path: string, listener?: () => void) {
    if (process.platform === "win32")
      path = Path.join("\\\\?\\pipe", path)
    else
      path = `\0${path}`
    this.socket.connect(path, listener)
  }

  onconnect = async () => {
    try {
      this.meta.remote = await this.getMetaInfo() as IMetaInfo
      if (this.meta.local.version !== this.meta.remote.version)
        throw makeError("两端版本不匹配", this.meta)

      const encode = findArrays(this.meta.local.encoding, this.meta.remote.encoding) as string
      if (!encode)
        throw makeError("两端编码不匹配", this.meta)
      const decode = findArrays(this.meta.remote.encoding, this.meta.local.encoding) as string
      this.encoding = {
        encode: encoding[encode].encode,
        decode: encoding[decode].decode,
      }
    } catch (err) {
      this.socket.destroy()
      throw err
    }
    for (const i in this.listener)
      this.socket.on(i, this.listener[i].bind(this))
    logger.info("已连接", this.meta.remote)
    this.sender()
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    data: this.receive,
    end(this: Client) {
      this.closed = true
      logger.debug(`服务端 ${this.meta.remote?.id} 请求关闭`)
    },
    close(this: Client) {
      logger.debug(`服务端 ${this.meta.remote?.id} 已断开连接`)
    },
    timeout(this: Client) {
      return this.request("heartbeat")
    },
  }

  write(data: IBase<EStatus>) {
    if (data.data === undefined) delete data.data
    logger.trace("发送", data)
    const buffer = this.encoding.encode(data)
    const length = Buffer.alloc(4)
    length.writeInt32BE(buffer.length)
    return this.socket.write(Buffer.concat([length, buffer]))
  }

  async sender(): Promise<ICache["promise"]> {
    if (this.closed) {
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
        cache.reject(makeError("等待消息超时", { timeout: this.timeout.send }))
      cache.retry++
      logger.debug(`发送 ${id} 超时，重试${cache.retry}次`)
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
    this.socket.write(this.encoding.encode(this.meta.local))
    return new Promise((resolve, reject) => {
      const listener = (data: Buffer) => {
        clearTimeout(timeout)
        try {
          resolve(this.encoding.decode(data))
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
      const req: IBase<EStatus> = this.encoding.decode(data)
      logger.trace("接收", req)
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
        logger.debug(`执行处理器 ${req.name}(${req.data === undefined ? "" : Loging(req.data)})`)
        ret = this.handle[req.name](req.data, this)
      } else if (typeof this.handle.default === "function") {
        logger.debug(`执行处理器 default(${req.name}, ${req.data === undefined ? "" : Loging(req.data)})`)
        ret = this.handle.default(req.name, req.data, this)
      } else {
        return reply(EStatus.Error, {
          name: "NotFoundError",
          message: `处理器 ${req.name} 不存在`,
        })
      }

      if (isPromise(ret)) {
        reply(EStatus.Async)
        return reply(EStatus.Receive, await ret)
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
    return cache
  }

  handleReceive(req: IReceive) {
    const cache = this.getCache(req)
    clearTimeout(cache.timeout)
    cache.resolve(req.data)
  }

  handleAsync(req: IAsync) {
    const cache = this.getCache(req)
    clearTimeout(cache.timeout)
    cache.timeout = setTimeout(() =>
      cache.reject(makeError("等待异步返回超时", { cache, req, timeout: this.timeout.wait }))
    , this.timeout.wait)
  }

  handleError(req: IError) {
    const cache = this.getCache(req)
    clearTimeout(cache.timeout)
    cache.reject(makeError(req.data.message, { ...req.data, request: cache.data }))
  }
}