import path from "node:path"
import { Client as SocketClient } from "../../socket/index.js"
import { logger } from "../../util/logger.js"
import handle from "./handle.js"

export default class Client {
  logger = logger
  socket: SocketClient
  request: SocketClient["request"]

  platform = { id: "tty", name: "终端" }
  config = {
    save: {
      path: path.join(process.cwd(), "data"),
    }
  }

  constructor(socket: string | SocketClient) {
    if (socket instanceof SocketClient) {
      socket.handle.set(handle(this))
      this.socket = socket
    } else {
      this.socket = new SocketClient(handle(this))
      this.socket.connect(socket)
    }
    this.request = this.socket.request.bind(this.socket)
  }
}