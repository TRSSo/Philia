import { Client as SocketClient } from "#connect/socket"
import { WebSocket } from "ws"
import { promiseEvent, String } from "#util"
import logger from "#logger"
import Protocol from "./protocol.js"
import { ulid } from "ulid"
import { createAPI, Event } from "#protocol/common"
import { API } from "../type/index.js"
import { API as APIConvert } from "../convert/index.js"

export default class Client {
  logger = logger
  socket: SocketClient
  ws: WebSocket
  path?: string

  api = createAPI<API.ClientAPI>(this)
  handle = new APIConvert.PhiliaToOBv11(this)
  protocol = new Protocol(this)
  event_handle: Event.Handle

  cache: {
    [id: string]: {
      request: API.Request<string>
      resolve: Parameters<ConstructorParameters<typeof Promise>[0]>[0]
      reject: Parameters<ConstructorParameters<typeof Promise>[0]>[1]
      error: Error
      timeout: NodeJS.Timeout
    }
  } = {}
  queue: string[] = []
  timeout = 6e4

  get open() {
    return this.ws.readyState === WebSocket.OPEN
  }

  constructor(
    socket: Parameters<typeof SocketClient.create>[0],
    ws: string | WebSocket,
    opts?: ConstructorParameters<typeof WebSocket>[2],
  ) {
    this.socket = SocketClient.create(
      socket,
      this.handle as unknown as Parameters<typeof SocketClient.create>[1],
    )
    this.event_handle = new Event.Handle(this.socket)
    if (ws instanceof WebSocket) {
      this.ws = ws
    } else {
      this.path = ws
      this.logger.info(`WebSocket 正在连接 ${ws}`)
      this.ws = new WebSocket(ws, opts)
    }
    this.listener()
  }

  listener() {
    this.ws.onerror = err => {
      this.logger.error("WebSocket 错误", err)
    }
    this.ws.onclose = event => {
      this.logger.info(`WebSocket 已断开 ${event.reason}(${event.code})`)
    }
    this.ws.onmessage = this.message.bind(this)
  }

  close() {
    this.ws.close()
    return promiseEvent(this.ws, "close", "error")
  }

  message(event: WebSocket.MessageEvent) {
    try {
      const data = JSON.parse(event.data.toString())
      this.logger.debug("WebSocket 消息", data)
      this.protocol.handle(data)
    } catch (err) {
      this.logger.error("WebSocket 消息解析错误", event, err)
    }
  }

  sendQueue(): void {
    if (this.queue.length === 0 || !this.open) return
    const data = this.cache[this.queue.shift() as string]?.request
    if (data) {
      this.logger.debug("WebSocket 发送", data)
      this.ws.send(JSON.stringify(data))
    }
    return this.sendQueue()
  }

  request<T extends string>(action: T, params: API.API[T]["request"] = {}) {
    const echo = ulid()
    const request: API.Request<T> = { action, params, echo }
    this.logger.debug("WebSocket 请求", request)
    if (this.open) (this.ws as WebSocket).send(String(request))
    else this.queue.push(echo)
    const error = Error()
    return new Promise<API.API[T]["response"]>(
      (resolve, reject) =>
        (this.cache[echo] = {
          request,
          resolve,
          reject,
          error,
          timeout: setTimeout(() => {
            reject(Object.assign(error, request, { timeout: this.timeout }))
            delete this.cache[echo]
            logger.error("WebSocket 请求超时", request)
            this.close()
          }, this.timeout),
        }),
    )
  }
}
