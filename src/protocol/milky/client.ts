import logger from "#logger"
import { Philia } from "#project/project"
import { createAPI, Event } from "#protocol/common"
import { makeError } from "#util"
import { API } from "./type/index.js"
import * as Convert from "./convert/index.js"

export default class Client {
  logger = logger
  philia: Philia.Project

  url: URL
  ws!: WebSocket
  timeout = 6e4

  api = createAPI<API.ClientAPI>(this)
  handle = new Convert.API(this)
  event = new Convert.Event(this)
  event_handle: Event.Handle

  constructor(philia: Philia.IConfig, url: string | URL) {
    this.philia = new Philia.Project(
      philia,
      this.handle as unknown as ConstructorParameters<typeof Philia.Project>[1],
    )
    this.event_handle = new Event.Handle(this.philia)
    this.url = url instanceof URL ? url : new URL(url)
  }

  start() {
    const url = new URL(this.url)
    url.pathname += "event"
    this.ws = new WebSocket(url)
    this.logger.info(`WebSocket 正在连接 ${this.ws.url}`)
    this.ws.onopen = () => {
      this.logger.info(`WebSocket 已连接 ${this.ws.url}`)
      this.philia.start()
    }
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
    return this.ws.close()
  }

  async message(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data.toString())
      this.logger.trace("WebSocket 消息", data)
      this.event_handle.handle(await this.event.convert(data))
    } catch (err) {
      this.logger.error("WebSocket 消息解析错误", event, err)
    }
  }

  async request<T extends string>(name: T, data: API.Request<T> = {}) {
    const url = new URL(this.url)
    url.pathname += `api/${name}`
    this.logger.trace("HTTP 请求", name, data)
    const res: API.Response<T> = await (
      await fetch(url, {
        method: "POST",
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.timeout),
      })
    ).json()
    this.logger.trace("HTTP 返回", name, res)
    if (res.retcode !== 0) {
      throw makeError((res as API.ResponseFailed).message, {
        request: { name, data },
        response: res,
      })
    }
    return (res as API.ResponseOK<T>).data
  }
}
