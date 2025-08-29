import { type Socket, Server as SocketServer } from "node:net"
import os from "node:os"
import Path from "node:path"
import { ulid } from "ulid"
import type { Logger } from "#logger"
import { getSocketAddress, getSocketRemoteAddress, promiseEvent } from "#util"
import type { type } from "../common/index.js"
import OClient from "./client.js"

export interface ServerOptions extends type.ServerOptions {
  socket?: SocketServer | ConstructorParameters<typeof SocketServer>[0]
}

export class Server {
  socket: SocketServer
  sockets = new Set<Socket>()
  clients = new Set<Client>()
  meta = {
    id: ulid(),
    name: "Server",
  }
  path = ""
  limit?: number

  constructor(
    public logger: Logger,
    public handle: type.HandleMap = {},
    public opts: ServerOptions = {},
  ) {
    if (opts.limit) this.limit = opts.limit
    if (opts.path) this.path = opts.path

    if (opts.socket instanceof SocketServer) this.socket = opts.socket
    else this.socket = new SocketServer(opts.socket)

    this.socket
      .on("listening", () => {
        this.logger.info("Socket 服务器已监听在", getSocketAddress(this.socket))
      })
      .on("connection", socket => {
        if (this.limit && this.sockets.size >= this.limit) {
          this.logger.warn(`连接数已达上限，已断开1个连接，剩余${this.sockets.size}个连接`)
          return socket.destroy()
        }
        new Client(this, socket)
      })
      .on("error", err => this.logger.error(err))
      .on("close", () => {
        this.logger.info(`Socket 服务器已关闭`)
      })
  }

  listen(path = this.path, ...args: any[]) {
    if (path.startsWith("tcp://")) {
      const [host, port] = path.slice(6).split(":")
      this.socket.listen(Number(port), host)
      return
    }

    path = Path.resolve(path)
    switch (os.type()) {
      case "Linux":
        path = `\0${path}`
        break
      case "Windows_NT":
        path = Path.join("\\\\?\\pipe", path)
        break
    }
    this.socket.listen(path, ...args)
    return promiseEvent<this>(this.socket, "listening", "error")
  }

  add(client: Client) {
    this.sockets.add(client.event)
    this.clients.add(client)
  }

  del(client: Client) {
    this.sockets.delete(client.event)
    this.clients.delete(client)
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    connected(this: Client) {
      this.server.add(this)
      this.onconnected(`共${this.server.sockets.size}个连接`)
    },
    close(this: Client) {
      this.server.del(this)
      this.onclose(`剩余${this.server.sockets.size}个连接`)
    },
  }

  async close() {
    await Promise.allSettled([...this.clients].map(i => i.close()))
    this.socket.close()
    return promiseEvent<void>(this.socket, "close", "error")
  }
}
export default Server

class Client extends OClient {
  constructor(
    public server: Server,
    socket: Socket,
  ) {
    const address = getSocketRemoteAddress(socket)
    super(server.logger, server.handle, { ...server.opts, socket })
    this.logger = this.server.logger
    Object.assign(this.meta.local, server.meta)

    for (const i in server.listener) this.listener[i] = server.listener[i].bind(this)
    this.onconnect().catch(err => {
      this.logger.error(...address, "连接错误", err)
      this.forceClose()
    })
  }
}
