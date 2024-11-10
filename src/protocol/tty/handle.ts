import Client from "./client.js"
import { IUser } from "../example/user.js"
import { IGroup } from "../example/group.js"
import { IMessage, IRSendMsg } from "../example/message.js"
import { Convert } from "./message.js"
import example from "../example/index.js"
import { IHandle } from "../../socket/types.js"
import { ulid } from "ulid"

export const handles: { [key: string]: (event: any) => void } = {
  "sendUserMsg": async function(this: Client, data: { id: IUser["id"], data: IMessage }): Promise<IRSendMsg> {
    const message = await new Convert(this, data.data).convert()
    this.logger.info(`发送用户消息 [${data.id}] ${message}`)
    return { id: ulid(), time: Date.now()/1000 }
  },

  "sendGroupMsg": async function(this: Client, data: { id: IGroup["id"], data: IMessage }): Promise<IRSendMsg> {
    const message = await new Convert(this, data.data).convert()
    this.logger.info(`发送群消息 [${data.id}] ${message}`)
    return { id: ulid(), time: Date.now()/1000 }
  },
}

export default function (client: Client) {
  const handle: { [key: string]: (event: any) => void } = {}
  for (const i in handles)
    handle[i] = handles[i].bind(client)
  return [handle, ...example()] as IHandle[]
}