import { Server as SocketServer, Socket } from "node:net"
import Path from "node:path"
import { ulid } from "ulid"
import { IHandle, IServerOptions } from "./types.js"
import OClient from "./client.js"
import { logger } from "../util/index.js"

export class Server {
  server: SocketServer
  sockets: Socket[] = []
  clients: Client[] = []
  meta = {
    id: ulid(),
    name: "Server",
  }
  handle: IHandle

  constructor(handle: IHandle = {}, opts: IServerOptions = {}, ...args: any[]) {
    this.handle = handle
    if (opts.server)
      this.server = opts.server
    else
      this.server = new SocketServer(...args)
        .on("connection", socket => new Client(handle, this, socket, opts))
  }

  listen(path: string, ...args: any[]) {
    if (process.platform === "win32")
      path = Path.join('\\\\?\\pipe', path)
    else
      path = `\0${path}`
    this.server.listen(path, ...args)
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
    end(this: Client) {
      this.closed = true
      logger.debug(`客户端 ${this.meta.remote?.id} 请求关闭`)
    },
    close(this: Client) {
      this.server.del(this)
      logger.debug(`客户端 ${this.meta.remote?.id} 已断开连接，剩余${this.server.length}个连接`)
    },
  }
}
export default Server

class Client extends OClient {
  server: Server
  constructor(handle: IHandle = {}, server: Server, socket: Socket, opts: IServerOptions = {}) {
    super(handle, { ...opts, socket })
    this.server = server
    Object.assign(this.meta.local, this.server.meta)
    Object.assign(this.listener, this.server.listener)
    this.onconnect().then(() => this.server.add(this))
  }
}