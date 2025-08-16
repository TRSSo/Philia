import { isPromise } from "node:util/types"
import { getAllProps, Loging, makeError, toJSON } from "#util"
import type Client from "./client.js"
import * as type from "./type.js"

export default class Handle {
  default_handle: [keyof type.HandleMap, type.HandleMap[keyof type.HandleMap]][] = [
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
    handle: type.HandleMap,
    public client: Client,
  ) {
    this.setMap(handle)
  }

  /**
   * 设置处理器
   * @param name 名称
   * @param handle 函数
   */
  set(...args: Parameters<typeof this.map.set>) {
    return this.map.set(...args)
  }

  /**
   * 设置处理器对象
   * @param handle \{ 名称: 函数 }
   */
  setMap(handle: type.HandleMap) {
    for (const i of getAllProps(handle))
      if (typeof handle[i] === "function") this.set(i, handle[i].bind(handle))
  }

  /**
   * 设置单次处理器
   * @param name 名称
   * @param handle 函数
   */
  setOnce(name: Parameters<typeof this.map.set>[0], handle: Parameters<typeof this.map.set>[1]) {
    return this.map.set(name, (...args) => {
      this.map.delete(name)
      return typeof handle === "function" ? handle(...args) : handle
    })
  }

  /**
   * 删除处理器
   * @param name 名称或名称数组
   */
  del(name: Parameters<typeof this.map.delete>[0] | Parameters<typeof this.map.delete>[0][]) {
    if (Array.isArray(name)) return name.map(this.map.delete.bind(this.map))
    return this.map.delete(name)
  }

  /** 清空处理器 */
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
      const handle = this.map.get(req.name)
      let ret: type.Response["data"]
      if (handle) {
        if (typeof handle === "function") {
          this.client.logger.debug(
            `执行处理器 ${req.name}(${req.data === undefined ? "" : Loging(req.data)})`,
          )
          ret = handle(req.data, this.client)
        } else {
          this.client.logger.debug(`得到值 ${req.name} => ${Loging(handle)}`)
          ret = handle
        }
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
        message: `处理器 ${req.name} 错误: ${err}`,
      }
      if (err instanceof Error) {
        Object.assign(error, err)
        error.error = err.stack
      } else if (err instanceof type.CError) {
        error = err.data
      } else {
        error.error = toJSON(err)
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
    const time = req.time ? req.time * 1e3 : this.client.timeout.wait
    this.client.setTimeout(cache, time)
    this.client.cache[req.id] = cache
  }

  error(req: type.Error) {
    const cache = this.getCache(req)
    cache.reject(makeError(req.data.message, { ...req.data, request: cache.data }))
  }
}
