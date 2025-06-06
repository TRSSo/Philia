import Client from "./client.js"
import { Convert } from "./message.js"
import example from "#protocol/example"
import { Contact, Message } from "../type/index.js"
import { type as SocketType } from "#connect/common"
import { ulid } from "ulid"

export class Handle implements SocketType.OHandle {
  [key: string]: ((data: unknown) => unknown) | unknown
  client: Client
  constructor(client: Client) {
    this.client = client
  }

  async sendUserMsg(data: {
    id: Contact.User["id"]
    data: Message.Message
  }): Promise<Message.RSendMsg> {
    const message = await new Convert(this.client, data.data).convert()
    this.client.logger.info(`发送用户消息 [${data.id}] ${message}`)
    return { id: ulid(), time: Date.now() / 1000 }
  }

  async sendGroupMsg(data: {
    id: Contact.Group["id"]
    data: Message.Message
  }): Promise<Message.RSendMsg> {
    const message = await new Convert(this.client, data.data).convert()
    this.client.logger.info(`发送群消息 [${data.id}] ${message}`)
    return { id: ulid(), time: Date.now() / 1000 }
  }
}

export default function (client: Client) {
  return [new Handle(client), ...example()]
}
