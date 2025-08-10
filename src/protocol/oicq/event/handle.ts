import type { type as SocketType } from "#connect/common"
import type { Event } from "#protocol/type"
import type { Client } from "../app.js"
import { GroupMessage, PrivateMessage } from "../message/message.js"
import type * as types from "./types.js"

export default class Handle implements SocketType.HandleMap {
  [key: string]: SocketType.HandleMap[string]
  static event = [
    { type: "message", scene: "user" },
    { type: "message", scene: "group" },
  ].map(i => ({ ...i, handle: `${i.type}.${i.scene || ""}` }))
  constructor(public client: Client) {}

  async "message.user"(raw: Event.UserMessage) {
    const event: types.PrivateMessageEvent = new PrivateMessage(this.client, raw)
    await event.parse()
    this.client.logger.info(`用户消息 [${event.nickname}(${event.user_id})] ${event.raw_message}`)
    this.client.em("message.private.friend", event)
  }

  async "message.group"(raw: Event.GroupMessage) {
    const event: types.GroupMessageEvent = new GroupMessage(this.client, raw)
    await event.parse()
    this.client.logger.info(
      `群消息 [${event.group_name}(${event.group_id}), ${event.nickname}(${event.user_id})] ${event.raw_message}`,
    )
    this.client.em("message.group.normal", event)
  }
}
