import { isPromise } from "node:util/types"
import { getAllProps, Loging, makeError } from "#util"
import type Client from "./client.js"
import * as type from "./type.js"

export default class Handle {
  default_handle: [keyof type.OHandle, type.Handle | type.HandleDefault][] = [
    ["heartbeat", () => {}],
    ["getHandleList", () => Array.from(this.map.keys())],
    [
      "default",
      (name: string) => {
        throw new type.CError("NotFoundError", `处理器 ${name} 不存在`)
      },
    ],
  ]
  map = new Map(this.default_handle)
  reply_cache: { [key: string]: type.Reply } = {}

  constructor(
    handle: type.Handles,
    public client: Client,
  ) {
    this.set(handle)
  }

  set(handle: type.Handles) {
    for (const i of Array.isArray(handle) ? handle : [handle])
      for (const k of getAllProps(i)) if (typeof i[k] === "function") this.map.set(k, i[k].bind(i))
  }

  del(name: keyof type.Handle) {
    return this.map.delete(name)
  }

  clear() {
    this.map = new Map(this.default_handle)
  }

  data(req: type.Status) {
    this.client.logger.trace("接收", req)
    switch (req.code) {
      case type.EStatus.Request:
        if (this.reply_cache[req.id]) return this.client.send(this.reply_cache[req.id])
        return this.request(req, this.reply.bind(this, req))
      case type.EStatus.Response:
        return this.response(req)
      case type.EStatus.Async:
        return this.async(req)
      case type.EStatus.Error:
        return this.error(req)
      default:
        throw TypeError("不支持的数据类型")
    }
  }

  reply(req: type.Request, code: type.Reply["code"], data?: type.Response["data"]) {
    this.reply_cache[req.id] = { id: req.id, code, data } as type.Reply
    if (code !== type.EStatus.Async)
      setTimeout(() => delete this.reply_cache[req.id], this.client.timeout.idle)
    return this.client.send(this.reply_cache[req.id])
  }

  async request(
    req: type.Request,
    reply: (code: type.Reply["code"], data?: type.Response["data"]) => void,
  ) {
    try {
      let ret: type.Response["data"]
      if (this.map.has(req.name)) {
        this.client.logger.debug(
          `执行处理器 ${req.name}(${req.data === undefined ? "" : Loging(req.data)})`,
        )
        ret = (this.map.get(req.name) as type.Handle)(req.data, this.client)
      } else {
        this.client.logger.debug(
          `执行默认处理器 (${Loging(req.name)}${req.data === undefined ? "" : `, ${Loging(req.data)}`})`,
        )
        ret = (this.map.get("default") as type.HandleDefault)(req.name, req.data, this.client)
      }

      if (isPromise(ret)) {
        reply(type.EStatus.Async)
        ret = await ret
      }
      return reply(type.EStatus.Response, ret)
    } catch (err) {
      let error: type.Error["data"] = {
        name: "HandleError",
        message: `处理器 ${req.name} 错误：${err}`,
      }
      if (err instanceof Error) {
        Object.assign(error, err)
        error.error = err.stack
      } else if (err instanceof type.CError) {
        error = err.data
      } else {
        error.error = err
      }
      return reply(type.EStatus.Error, error)
    }
  }

  getCache(req: type.Base<type.EStatus>) {
    const cache = this.client.cache[req.id]
    if (!cache) throw makeError(`请求缓存 ${req.id} 不存在`, { req })
    clearTimeout(cache.timeout)
    return cache
  }

  response(req: type.Response) {
    const cache = this.getCache(req)
    cache.resolve(req.data)
  }

  async(req: type.Async) {
    const cache = this.getCache(req)
    cache.finally()
    cache.finally = () => delete this.client.cache[req.id]
    const time = req.time ? req.time * 1000 : this.client.timeout.wait
    const timeout = () => {
      if (cache.retry > this.client.timeout.retry)
        return cache.reject(makeError("等待异步响应超时", { cache, req, timeout: time }))
      cache.retry++
      this.client.logger.warn(`等待异步响应 ${req.id} 超时，重试${cache.retry}次`)
      cache.timeout = setTimeout(timeout, time)
      this.client.send(cache.data)
    }
    cache.timeout = setTimeout(timeout, time)
    this.client.cache[req.id] = cache
  }

  error(req: type.Error) {
    const cache = this.getCache(req)
    cache.reject(makeError(req.data.message, { ...req.data, request: cache.data }))
  }
}
