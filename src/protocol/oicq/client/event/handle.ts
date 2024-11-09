import { IEMGroup, IEMUser } from "../../../example/event.js";
import { Client } from "../client.js";
import { GroupMessage, PrivateMessage } from "../message/message.js";

export default {
  "message.user": async function(this: Client, raw: IEMUser) {
    const event = new PrivateMessage(this, raw)
    await event.parse()
    this.logger.info(`用户消息 [${event.nickname}(${event.user_id})] ${event.raw_message}`)
    this.em("message.private.friend", event)
  },

  "message.group": async function(this: Client, raw: IEMGroup) {
    const event = new GroupMessage(this, raw)
    await event.parse()
    this.logger.info(`群消息 [${event.group_name}(${event.group_id}), ${event.nickname}(${event.user_id})] ${event.raw_message}`)
    this.em("message.group.normal", event)
  },
}