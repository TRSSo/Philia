import type { IncomingMessage } from "node:http"
import { type WebSocket, WebSocketServer } from "ws"
import type { Logger } from "#logger"
import type * as Philia from "#project/project/philia.js"
import { promiseEvent } from "#util"
import Client from "./client.js"

export default class Server {
  philia: Philia.IConfig
  wss: WebSocketServer
  clients: Map<string, Client> = new Map()

  constructor(
    public logger: Logger,
    philia: Philia.IConfig,
    path: number,
    opts?: ConstructorParameters<typeof WebSocketServer>[0],
  ) {
    this.philia = philia
    this.wss = new WebSocketServer({ ...opts, port: path })
      .on("listening", () => {
        this.logger.info(`WebSocket 服务器已监听端口 ${path}`)
      })
      .on("connection", this.connected.bind(this))
      .on("error", err => this.logger.error(err))
      .on("close", () => {
        this.logger.info(`WebSocket 服务器已关闭`)
      })
  }

  async connected(ws: WebSocket, req: IncomingMessage) {
    this.logger.info("WebSocket 已连接")
    const id = req.headers["x-self-id"] as string
    if (!id) return ws.terminate()

    const client = this.clients.get(id)
    if (client?.open) {
      this.logger.warn(`WebSocket 客户端 ${id} 已存在`)
      return ws.terminate()
    }

    this.clients.set(id, new Client(this.logger, this.philia, ws))
  }

  close() {
    for (const i of this.clients.values()) i.close()
    this.wss.close()
    return promiseEvent<void>(this.wss, "close", "error")
  }
}
