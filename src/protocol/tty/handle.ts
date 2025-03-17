import Client from "./client.js"
import { IUser } from "../example/user.js"
import { IGroup } from "../example/group.js"
import { IMessage, IRSendMsg } from "../example/message.js"
import { Convert } from "./message.js"
import example from "../example/index.js"
import { type as SocketType } from "../../socket/index.js"
import { ulid } from "ulid"

export class Handle implements SocketType.OHandle {
  [key: string]: ((data: unknown) => unknown) | unknown;
  client: Client
  constructor(client: Client) {
    this.client = client
  }
  async sendUserMsg(data: { id: IUser["id"], data: IMessage }): Promise<IRSendMsg> {
    const message = await new Convert(this.client, data.data).convert()
    this.client.logger.info(`发送用户消息 [${data.id}] ${message}`)
    return { id: ulid(), time: Date.now()/1000 }
  }

  async sendGroupMsg(data: { id: IGroup["id"], data: IMessage }): Promise<IRSendMsg> {
    const message = await new Convert(this.client, data.data).convert()
    this.client.logger.info(`发送群消息 [${data.id}] ${message}`)
    return { id: ulid(), time: Date.now()/1000 }
  }
}

export default function (client: Client) {
  return [new Handle(client), ...example()]
}