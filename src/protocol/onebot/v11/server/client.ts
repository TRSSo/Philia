import { ulid } from "ulid"
import { WebSocket } from "ws"
import logger from "#logger"
import { Philia } from "#project/project"
import { createAPI, Event } from "#protocol/common"
import { makeError, promiseEvent, toJSON } from "#util"
import * as Convert from "../convert/index.js"
import type { API } from "../type/index.js"
import Protocol from "./protocol.js"

export default class Client {
  logger = logger
  philia: Philia.Project
  ws: WebSocket
  path?: string

  api = createAPI<API.ClientAPI>(this)
  handle = new Convert.API.PhiliaToOBv11(this)
  protocol = new Protocol(this)
  event_handle: Event.Handle

  cache = new Map<
    string,
    ReturnType<typeof Promise.withResolvers<API.ResponseOK<string>["data"]>> & {
      request: API.Request<string>
      timeout: NodeJS.Timeout
    }
  >()
  queue: string[] = []
  timeout = 6e4

  get open() {
    return this.ws.readyState === WebSocket.OPEN
  }

  constructor(
    philia: Philia.IConfig,
    ws: string | WebSocket,
    opts?: ConstructorParameters<typeof WebSocket>[2],
  ) {
    this.philia = new Philia.Project(
      philia,
      this.handle as unknown as ConstructorParameters<typeof Philia.Project>[1],
    )
    this.event_handle = new Event.Handle(this.philia)
    if (ws instanceof WebSocket) {
      this.ws = ws
      this.philia.start()
    } else {
      this.path = ws
      this.logger.info(`WebSocket 正在连接 ${ws}`)
      this.ws = new WebSocket(ws, opts)
      this.ws.onopen = async () => {
        this.logger.info(`WebSocket 已连接 ${ws}`)
        await this.philia.start()
        this.sendQueue()
      }
    }
    this.listener()
  }

  listener() {
    this.ws.onerror = err => {
      this.logger.error("WebSocket 错误", err)
    }
    this.ws.onclose = event => {
      this.logger.info(`WebSocket 已断开 ${event.reason}(${event.code})`)
      this.philia.stop()
    }
    this.ws.onmessage = this.message.bind(this)
  }

  close() {
    this.ws.close()
    return promiseEvent<void>(this.ws, "close", "error")
  }

  async message(event: WebSocket.MessageEvent) {
    try {
      const data = JSON.parse(event.data.toString())
      this.logger.trace("WebSocket 消息", data)
      await this.protocol.handle(data)
    } catch (err) {
      this.logger.error("WebSocket 消息解析错误", event.data, err)
    }
  }

  sendQueue(): undefined {
    if (this.queue.length === 0 || !this.open) return
    const data = this.cache.get(this.queue.shift() as string)?.request
    if (data) {
      this.logger.trace("WebSocket 发送", data)
      this.ws.send(JSON.stringify(data))
    }
    return this.sendQueue()
  }

  request<T extends string>(action: T, params: API.Request<T>["params"] = {}) {
    const echo = ulid()
    const request: API.Request<T> = { action, params, echo }
    this.logger.trace("WebSocket 请求", request)
    if (this.open) this.ws.send(toJSON(request))
    else this.queue.push(echo)
    const { promise, resolve, reject } = Promise.withResolvers<API.ResponseOK<string>["data"]>()
    this.cache.set(echo, {
      promise,
      resolve,
      reject,
      request,
      timeout: setTimeout(() => {
        reject(makeError("WebSocket 请求超时", request, { timeout: this.timeout }))
        logger.error("WebSocket 请求超时", request)
        this.close()
      }, this.timeout),
    })
    return promise
      .catch((error: API.ResponseFailed) => {
        throw makeError(error.msg || error.wording, request, { error })
      })
      .finally(() => {
        clearTimeout(this.cache.get(echo)?.timeout)
        this.cache.delete(echo)
      })
  }
}
