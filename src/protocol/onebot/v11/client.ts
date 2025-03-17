import { Client as SocketClient, createClient } from "../../../socket/index.js"
import { WebSocket, WebSocketServer } from "ws"
import Handle from "./handle.js"

export default class Client {
  socket: SocketClient
  handle = new Handle(this)
  ws?: WebSocket
  wss?: WebSocketServer
  constructor(path: string | number, socket: Parameters<typeof createClient>[0]) {
    if (typeof path === "string")
      this.connect(path)
    else
      this.listen(path)
    this.socket = createClient(socket, this.handle)
  }

  connect(path: string) {
    this.ws = new WebSocket(path)
  }

  listen(path: number) {
    const wss = new WebSocketServer({ port: path })
    wss.on("connection", (ws) => {
      this.ws = ws
    })
  }
}