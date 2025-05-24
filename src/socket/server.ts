import { Server as SocketServer, Socket } from "node:net"
import Path from "node:path"
import { ulid } from "ulid"
import { IHandles, IServerOptions } from "./type.js"
import OClient from "./client.js"
import { promiseEvent, logger } from "../util/index.js"

export class Server {
  logger = logger
  socket: SocketServer & { path?: string }
  sockets: Socket[] = []
  clients: Client[] = []
  meta = {
    id: ulid(),
    name: "Server",
  }
  path = ""
  handle: IHandles
  limit?: number

  constructor(handle: IHandles = {}, opts: IServerOptions = {}) {
    this.handle = handle
    if (opts.limit) this.limit = opts.limit
    if (opts.path) this.path = opts.path

    if (opts.socket instanceof SocketServer) this.socket = opts.socket
    else
      this.socket = new SocketServer(opts.socket).on("connection", socket => {
        if (this.limit && this.sockets.length >= this.limit) {
          this.logger.warn(`连接数已达上限，已断开1个连接，剩余${this.length}个连接`)
          return socket.end()
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
    if (!this.sockets.includes(client.socket)) this.sockets.push(client.socket)
    if (!this.clients.includes(client)) this.clients.push(client)
  }

  del(client: Client) {
    if (this.sockets.includes(client.socket))
      this.sockets = this.sockets.filter(i => i !== client.socket)
    if (this.clients.includes(client)) this.clients = this.clients.filter(i => i !== client)
  }

  get length() {
    return this.clients.length
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    close(this: Client) {
      this.open = false
      this.server.del(this)
      this.logger.info(`${this.meta.remote?.id} 已断开连接，剩余${this.server.length}个连接`)
    },
  }
}
export default Server

class Client extends OClient {
  server: Server
  constructor(handle: IHandles, server: Server, socket: Socket, opts: IServerOptions = {}) {
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
