import { isPromise } from "util/types"
import { makeError, Loging, getAllProps } from "#util"
import * as type from "./type.js"
import Client from "./client.js"

export default class Handle {
  client: Client
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
  reply_cache: { [key: string]: type.Base<type.EStatus> } = {}

  constructor(handle: type.Handles, client: Client) {
    this.client = client
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

  data(req: type.Base<type.EStatus>) {
    this.client.logger.trace("接收", req)
    switch (req.code) {
      case type.EStatus.Request:
        if (this.reply_cache[req.id]) return this.client.write(this.reply_cache[req.id])
        return this.request(req as type.Request, this.reply.bind(this, req as type.Request))
      case type.EStatus.Receive:
        return this.receive(req as type.Receive)
      case type.EStatus.Async:
        return this.async(req as type.Async)
      case type.EStatus.Error:
        return this.error(req as type.Error)
      default:
        throw makeError("不支持的数据类型")
    }
  }

  reply(req: type.Request, code: type.EStatus, data?: type.Base<type.EStatus>["data"]) {
    this.reply_cache[req.id] = { id: req.id, code, data }
    setTimeout(() => delete this.reply_cache[req.id], this.client.timeout.idle)
    return this.client.write(this.reply_cache[req.id])
  }

  async request(
    req: type.Request,
    reply: (code: type.EStatus, data?: type.Base<type.EStatus>["data"]) => void,
  ) {
    try {
      let ret: type.Receive["data"]
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
      return reply(type.EStatus.Receive, ret)
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

  receive(req: type.Receive) {
    const cache = this.getCache(req)
    cache.resolve(req.data)
  }

  async(req: type.Async) {
    const cache = this.getCache(req)
    cache.finally()
    cache.finally = () => delete this.client.cache[req.id]
    cache.timeout = setTimeout(
      () =>
        cache.reject(
          makeError("等待异步返回超时", {
            cache,
            req,
            timeout: this.client.timeout.wait,
          }),
        ),
      this.client.timeout.wait,
    )
    this.client.cache[req.id] = cache
  }

  error(req: type.Error) {
    const cache = this.getCache(req)
    cache.reject(makeError(req.data.message, { ...req.data, request: cache.data }))
  }
}
