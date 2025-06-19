import { WebSocketServer, WebSocket } from "ws"
import { ulid } from "ulid"
import OClient from "./client.js"
import { promiseEvent } from "#util"
import logger from "#logger"
import { type } from "../common/index.js"

export interface ServerOptions extends type.ServerOptions {
  ws?: WebSocketServer | ConstructorParameters<typeof WebSocketServer>[0]
}

export class Server {
  logger = logger
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
    public handle: type.Handles = {},
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
        new Client(this.handle, this, ws, this.opts)
      })
    return promiseEvent(this.ws, "listening", "error") as Promise<this | Error>
  }

  add(client: Client) {
    this.wss.add(client.ws)
    this.clients.add(client)
  }

  del(client: Client) {
    this.wss.delete(client.ws)
    this.clients.delete(client)
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    close(this: Client) {
      this.onclose()
      this.server.del(this)
      this.logger.info(`${this.meta.remote?.id} 已断开连接，剩余${this.server.wss.size}个连接`)
    },
  }

  async close() {
    await Promise.allSettled([...this.clients].map(i => i.close()))
    this.ws.close()
    return promiseEvent(this.ws, "close", "error")
  }
}
export default Server

class Client extends OClient {
  server: Server
  constructor(handle: type.Handles, server: Server, ws: WebSocket, opts: ServerOptions) {
    super(handle, { ...opts, ws })
    this.server = server
    this.logger = this.server.logger
    Object.assign(this.meta.local, server.meta)

    for (const i in server.listener) this.listener[i] = server.listener[i].bind(this)
    this.onconnect().then(() => {
      server.add(this)
      server.ws.emit("connected", this)
      opts.onconnected?.(this)
    })
  }
}
