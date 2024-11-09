import Client from "./client.js"
import { IUser } from "../example/user.js"
import { IGroup } from "../example/group.js"
import { IMessage } from "../example/message.js"
import { Convert } from "./message.js"
import example from "../example/index.js"
import { IHandle } from "../../socket/types.js"

export const handles: { [key: string]: (event: any) => void } = {
  "sendUserMsg": async function(this: Client, data: { id: IUser["id"], data: IMessage }) {
    const message = await new Convert(this, data.data).convert()
    this.logger.info(`用户消息 [${data.id}] ${message}`)
  },

  "sendGroupMsg": async function(this: Client, data: { id: IGroup["id"], data: IMessage }) {
    const message = await new Convert(this, data.data).convert()
    this.logger.info(`群消息 [${data.id}] ${message}`)
  },
}

export default function (client: Client) {
  const handle: { [key: string]: (event: any) => void } = {}
  for (const i in handles)
    handle[i] = handles[i].bind(client)
  return [handle, ...example()] as IHandle[]
}