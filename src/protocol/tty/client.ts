import path from "node:path"
import { Client as SocketClient } from "#connect/socket"
import logger from "#logger"
import handle from "./handle.js"

export default class Client {
  logger = logger
  socket: SocketClient
  request: SocketClient["request"]

  platform = { id: "tty", name: "终端" }
  config = {
    save: {
      path: path.join(process.cwd(), "data"),
    },
  }

  constructor(socket: Parameters<typeof SocketClient.create>[0]) {
    this.socket = SocketClient.create(socket, handle(this))
    this.request = this.socket.request.bind(this.socket)
  }

  connect() {
    return this.socket.connect()
  }
}
