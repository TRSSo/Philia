import { Philia } from "#project/project"
import { WebSocket, WebSocketServer } from "ws"
import { promiseEvent } from "#util"
import logger from "#logger"
import { IncomingMessage } from "node:http"
import Client from "./client.js"

export default class Server {
  logger = logger
  philia: Philia.IConfig
  wss: WebSocketServer
  clients: Map<string, Client> = new Map()

  constructor(
    philia: Philia.IConfig,
    path: number,
    opts?: ConstructorParameters<typeof WebSocketServer>[0],
  ) {
    this.philia = philia
    this.wss = new WebSocketServer({ ...opts, port: path })
      .on("listening", () => {
        this.logger.info(`WebSocket 服务器已监听端口 ${path}`)
      })
      .on("close", () => {
        this.logger.info(`WebSocket 服务器已关闭`)
      })
      .on("connection", this.connected.bind(this))
  }

  connected(ws: WebSocket, req: IncomingMessage) {
    this.logger.info("WebSocket 已连接")
    const id = req.headers["x-self-id"] as string
    if (!id) return ws.terminate()

    if (this.clients.has(id)) {
      const client = this.clients.get(id) as Client
      if (client.open) {
        this.logger.warn(`WebSocket 客户端 ${id} 已存在`)
        ws.terminate()
      } else {
        client.ws = ws
        client.queue = Object.keys(client.cache)
        client.sendQueue()
      }
    } else {
      this.clients.set(id, new Client(this.philia, ws))
    }
  }

  close() {
    for (const i of this.clients.values()) i.close()
    this.wss.close()
    return promiseEvent(this.wss, "close", "error")
  }
}
