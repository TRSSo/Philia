import { ulid } from "ulid"
import { type WebSocket, WebSocketServer } from "ws"
import type { Logger } from "#logger"
import { promiseEvent } from "#util"
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
        this.logger.info(`WebSocket 服务器已监听端口 ${port}`)
      })
      .on("connection", ws => {
        if (this.limit && this.wss.size >= this.limit) {
          this.logger.warn(`连接数已达上限，已断开1个连接，剩余${this.wss.size}个连接`)
          return ws.terminate()
        }
        new Client(this.logger, this.handle, this, ws, this.opts)
      })
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
      this.logger.info("已连接", this.meta.remote, `共${this.server.wss.size}个连接`)
      this.onconnected()
      this.heartbeat()
    },
    close(this: Client) {
      this.onclose()
      this.server.del(this)
      this.logger.info(`${this.meta.remote?.id} 已断开连接，剩余${this.server.wss.size}个连接`)
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
  server: Server
  constructor(
    logger: Logger,
    handle: type.HandleMap,
    server: Server,
    ws: WebSocket,
    opts: ServerOptions,
  ) {
    super(logger, handle, { ...opts, ws })
    this.server = server
    this.logger = this.server.logger
    Object.assign(this.meta.local, server.meta)

    for (const i in server.listener) this.listener[i] = server.listener[i].bind(this)
    this.onconnect().then(() => {
      server.add(this)
      server.ws.emit("connected", this)
    })
  }
}
