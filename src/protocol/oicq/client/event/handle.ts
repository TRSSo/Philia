import { IEMGroup, IEMUser } from "../../../example/event.js";
import { Client } from "../client.js";
import { GroupMessage, PrivateMessage } from "../message/message.js";

export default class Handle {
  static event = ["message.user", "message.group"]
  client: Client
  constructor(client: Client) {
    this.client = client
  }

  async ["message.user"](raw: IEMUser) {
    const event = new PrivateMessage(this.client, raw)
    await event.parse()
    this.client.logger.info(`用户消息 [${event.nickname}(${event.user_id})] ${event.raw_message}`)
    this.client.em("message.private.friend", event)
  }

  async ["message.group"](raw: IEMGroup) {
    const event = new GroupMessage(this.client, raw)
    await event.parse()
    this.client.logger.info(`群消息 [${event.group_name}(${event.group_id}), ${event.nickname}(${event.user_id})] ${event.raw_message}`)
    this.client.em("message.group.normal", event)
  }
}