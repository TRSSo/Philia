import path from "node:path"
import { createClient, Client as SocketClient } from "../../socket/index.js"
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
    },
  }

  constructor(socket: Parameters<typeof createClient>[0]) {
    this.socket = createClient(socket, handle(this))
    this.request = this.socket.request.bind(this.socket)
  }

  connect() {
    return this.socket.connect()
  }
}
