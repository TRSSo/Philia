import { Server as SocketServer, Socket } from "node:net"
import Path from "node:path"
import { ulid } from "ulid"
import { IHandle, IServerOptions } from "./types.js"
import OClient from "./client.js"
import { logger } from "../util/index.js"

export class Server {
  logger = logger
  socket: SocketServer
  sockets: Socket[] = []
  clients: Client[] = []
  meta = {
    id: ulid(),
    name: "Server",
  }
  path = ""
  handle: IHandle | IHandle[]
  limit?: number

  constructor(handle: IHandle | IHandle[] = {}, opts: IServerOptions = {}, ...args: any[]) {
    this.handle = handle
    if (opts.limit)
      this.limit = opts.limit

    if (opts.socket)
      this.socket = opts.socket
    else
      this.socket = new SocketServer(...args).on("connection", socket => {
        if (this.limit && this.sockets.length >= this.limit) {
          this.logger.warn(`连接数已达上限，已断开1个连接，剩余${this.length}个连接`)
          return socket.end()
        }
        new Client(this.handle, this, socket, opts)
      })
  }

  listen(path: string, ...args: any[]) {
    if (process.platform === "win32")
      this.path = Path.join("\\\\?\\pipe", path)
    else
      this.path = `\0${path}`
    this.socket.listen(this.path, ...args)
    return this
  }

  add(client: Client) {
    if (!this.sockets.includes(client.socket))
      this.sockets.push(client.socket)
    if (!this.clients.includes(client))
      this.clients.push(client)
  }

  del(client: Client) {
    if (this.sockets.includes(client.socket))
      this.sockets = this.sockets.filter(i => i !== client.socket)
    if (this.clients.includes(client))
      this.clients = this.clients.filter(i => i !== client)
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
  constructor(handle: IHandle | IHandle[], server: Server, socket: Socket, opts: IServerOptions = {}) {
    super(handle, { ...opts, socket })
    this.server = server
    Object.defineProperty(this, "logger", {
      get() { return this.server.logger },
    })
    Object.assign(this.meta.local, server.meta)

    for (const i in server.listener)
      this.listener[i] = server.listener[i].bind(this)
    this.onconnect().then(() => {
      server.add(this)
      server.socket.emit("connected", this)
    })
  }
}