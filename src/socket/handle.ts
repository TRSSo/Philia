import { isPromise } from "util/types"
import { makeError, Loging, getAllProps } from "../util/common.js"
import { CError, EStatus, IAsync, IBase, IError, IHandle, IHandleDefault, IReceive, IRequest } from "./types.js"
import Client from "./client.js"

export default class Handle {
  client: Client
  map: Map<keyof IHandle, IHandle[keyof IHandle]> = new Map([
    ["heartbeat", function() {}],
    ["getKeys", () => Array.from(this.map.keys())],
    ["default", function(name): void { throw new CError("NotFoundError", `处理器 ${name} 不存在`) }],
  ])
  reply_cache: { [key: string]: IBase<EStatus> } = {}

  constructor(handle: IHandle | IHandle[], client: Client) {
    this.client = client
    this.set(handle)
  }

  set(handle: IHandle | IHandle[]) {
    for (const i of Array.isArray(handle) ? handle : [handle])
      for (const k of getAllProps(i))
        if (typeof i[k] === "function")
          this.map.set(k, i[k].bind(i))
  }

  del(name: keyof IHandle) {
    return this.map.delete(name)
  }

  data(req: IBase<EStatus>) {
    this.client.logger.trace("接收", req)
    switch (req.code) {
      case EStatus.Request:
        if (this.reply_cache[req.id])
          return this.client.write(this.reply_cache[req.id])
        return this.request(req as IRequest, this.reply.bind(this, req as IRequest))
      case EStatus.Receive:
        return this.receive(req as IReceive)
      case EStatus.Async:
        return this.async(req as IAsync)
      case EStatus.Error:
        return this.error(req as IError)
      default:
        throw makeError("不支持的数据类型")
    }
  }

  reply(req: IRequest, code: EStatus, data?: IBase<EStatus>["data"]) {
    this.reply_cache[req.id] = { id: req.id, code, data }
    setTimeout(() => delete this.reply_cache[req.id], this.client.timeout.idle)
    return this.client.write(this.reply_cache[req.id])
  }

  async request(req: IRequest, reply: (code: EStatus, data?: IBase<EStatus>["data"]) => void) {
    try {
      let ret: IReceive["data"]
      if (this.map.has(req.name)) {
        this.client.logger.debug(`执行处理器 ${req.name}(${req.data === undefined ? "" : Loging(req.data)})`)
        ret = (this.map.get(req.name) as IHandle[keyof IHandle])(req.data, this.client)
      } else {
        this.client.logger.debug(`执行默认处理器 (${Loging(req.name)}${req.data === undefined ? "" : `, ${Loging(req.data)}`})`)
        ret = (this.map.get("default") as IHandleDefault)(req.name, req.data, this.client)
      }

      if (isPromise(ret)) {
        reply(EStatus.Async)
        ret = await ret
      }
      return reply(EStatus.Receive, ret)
    } catch (err) {
      let error: IError["data"] = {
        name: "HandleError",
        message: `处理器 ${req.name} 错误：${err}`,
      }
      if (err instanceof Error) {
        Object.assign(error, err)
        error.error = err.stack
      } else if (err instanceof CError) {
        error = err.data
      } else {
        error.error = err
      }
      return reply(EStatus.Error, error)
    }
  }

  getCache(req: IBase<EStatus>) {
    const cache = this.client.cache[req.id]
    if (!cache) throw makeError(`请求缓存 ${req.id} 不存在`, { req })
    clearTimeout(cache.timeout)
    return cache
  }

  receive(req: IReceive) {
    const cache = this.getCache(req)
    cache.resolve(req.data)
  }

  async(req: IAsync) {
    const cache = this.getCache(req)
    cache.finally()
    cache.finally = () => delete this.client.cache[req.id]
    cache.timeout = setTimeout(() =>
      cache.reject(makeError("等待异步返回超时", { cache, req, timeout: this.client.timeout.wait }))
    , this.client.timeout.wait)
    this.client.cache[req.id] = cache
  }

  error(req: IError) {
    const cache = this.getCache(req)
    cache.reject(makeError(req.data.message, { ...req.data, request: cache.data }))
  }
}