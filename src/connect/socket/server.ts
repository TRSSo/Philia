import { Server as SocketServer, Socket } from "node:net"
import Path from "node:path"
import { ulid } from "ulid"
import OClient from "./client.js"
import { promiseEvent } from "#util"
import logger from "#logger"
import { type } from "../common/index.js"

export interface ServerOptions extends type.Options {
  socket?: SocketServer | ConstructorParameters<typeof SocketServer>[0]
  limit?: number
}

export class Server {
  logger = logger
  socket: SocketServer & { path?: string }
  sockets = new Set<Socket>()
  clients = new Set<Client>()
  meta = {
    id: ulid(),
    name: "Server",
  }
  path = ""
  handle: type.Handles
  limit?: number

  constructor(handle: type.Handles = {}, opts: ServerOptions = {}) {
    this.handle = handle
    if (opts.limit) this.limit = opts.limit
    if (opts.path) this.path = opts.path

    if (opts.socket instanceof SocketServer) this.socket = opts.socket
    else this.socket = new SocketServer(opts.socket)

    this.socket
      .on("listening", () => {
        this.logger.info(`Socket 服务器已监听路径 ${this.socket.path}`)
      })
      .on("connection", socket => {
        if (this.limit && this.sockets.size >= this.limit) {
          this.logger.warn(`连接数已达上限，已断开1个连接，剩余${this.sockets.size}个连接`)
          return socket.destroy()
        }
        new Client(this.handle, this, socket, opts)
      })
  }

  listen(path = this.path, ...args: any[]) {
    if (process.platform === "win32") this.socket.path = Path.join("\\\\?\\pipe", path)
    else this.socket.path = `\0${path}`
    this.socket.listen(this.socket.path, ...args)
    return promiseEvent(this.socket, "listening", "error") as Promise<this | Error>
  }

  add(client: Client) {
    this.sockets.add(client.socket)
    this.clients.add(client)
  }

  del(client: Client) {
    this.sockets.delete(client.socket)
    this.clients.delete(client)
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    close(this: Client) {
      this.onclose()
      this.server.del(this)
      this.logger.info(`${this.meta.remote?.id} 已断开连接，剩余${this.server.sockets.size}个连接`)
    },
  }

  async close() {
    await Promise.allSettled([...this.clients].map(i => i.close()))
    this.socket.close()
    return promiseEvent(this.socket, "close", "error")
  }
}
export default Server

class Client extends OClient {
  server: Server
  constructor(handle: type.Handles, server: Server, socket: Socket, opts: ServerOptions = {}) {
    super(handle, { ...opts, socket })
    this.server = server
    Object.defineProperty(this, "logger", {
      get() {
        return this.server.logger
      },
    })
    Object.assign(this.meta.local, server.meta)

    for (const i in server.listener) this.listener[i] = server.listener[i].bind(this)
    this.onconnect().then(() => {
      server.add(this)
      server.socket.emit("connected", this)
    })
  }
}
