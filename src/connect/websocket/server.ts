import type { IncomingMessage } from "node:http"
import { ulid } from "ulid"
import { type WebSocket, WebSocketServer } from "ws"
import type { Logger } from "#logger"
import { getSocketAddress, getSocketRemoteAddress, promiseEvent } from "#util"
import type { type } from "../common/index.js"
import OClient from "./client.js"

export interface ServerOptions extends type.ServerOptions {
  ws?: WebSocketServer | ConstructorParameters<typeof WebSocketServer>[0]
}

export class Server {
  ws!: WebSocketServer
  ws_opts?: ConstructorParameters<typeof WebSocketServer>[0]
  wss = new Set<WebSocket>()
  clients = new Set<Client>()
  meta = {
    id: ulid(),
    name: "Server",
  }
  limit?: number

  constructor(
    public logger: Logger,
    public handle: type.HandleMap = {},
    public opts: ServerOptions = {},
  ) {
    if (opts.limit) this.limit = opts.limit

    if (opts.ws instanceof WebSocketServer) this.ws = opts.ws
    else this.ws_opts = opts.ws
  }

  listen(port?: number, ...args: any[]) {
    if (port) this.ws_opts = { ...this.ws_opts, port }
    this.ws ??= new WebSocketServer(this.ws_opts, ...args)
    this.ws
      .on("listening", () => {
        this.logger.info("WebSocket 服务器已监听在", getSocketAddress(this.ws))
      })
      .on("connection", (ws, req) => {
        if (this.limit && this.wss.size >= this.limit) {
          this.logger.warn(`连接数已达上限，已断开1个连接，剩余${this.wss.size}个连接`)
          return ws.terminate()
        }
        new Client(this, ws, req)
      })
      .on("error", err => this.logger.error(err))
      .on("close", () => {
        this.logger.info(`WebSocket 服务器已关闭`)
      })
    return promiseEvent<this>(this.ws, "listening", "error")
  }

  add(client: Client) {
    this.wss.add(client.event)
    this.clients.add(client)
  }

  del(client: Client) {
    this.wss.delete(client.event)
    this.clients.delete(client)
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    connected(this: Client) {
      this.server.add(this)
      this.onconnected(`共${this.server.wss.size}个连接`)
      this.heartbeat()
    },
    close(this: Client) {
      this.server.del(this)
      this.onclose(`剩余${this.server.wss.size}个连接`)
    },
  }

  async close() {
    await Promise.allSettled([...this.clients].map(i => i.close()))
    this.ws.close()
    return promiseEvent<void>(this.ws, "close", "error")
  }
}
export default Server

class Client extends OClient {
  constructor(
    public server: Server,
    ws: WebSocket,
    req: IncomingMessage,
  ) {
    const address = getSocketRemoteAddress(req.socket)
    super(server.logger, server.handle, { ...server.opts, ws })
    Object.assign(this.meta.local, server.meta)

    for (const i in server.listener) this.listener[i] = server.listener[i].bind(this)
    this.onconnect().catch(err => {
      this.logger.error(...address, "连接错误", err)
      this.forceClose()
    })
  }
}
