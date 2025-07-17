import type * as Philia from "#protocol/type"
import { makeError } from "#util"
import type Client from "../server/client.js"
import type * as OBv11 from "../type/index.js"
import * as Message from "./message.js"

/** 事件转换器 */
export class OBv11toPhilia {
  event_map = new Map<Philia.Event.Request["id"], Philia.Event.Request>()

  constructor(public client: Client) {}

  convert(event: OBv11.Event.Event) {
    if (typeof this[event.post_type] === "function")
      return this[event.post_type](event as never) as Promise<Philia.Event.Event>
    throw makeError(`未知事件：${event.post_type}`, { event })
  }

  async message(data: OBv11.Event.Message) {
    const message = await new Message.OBv11toPhilia(this.client, data).convert()
    const event = {
      ...data,
      id: String(data.message_id),
      type: "message",
      scene: "user",
      message: message.after,
      summary: message.summary,
    } as unknown as Philia.Event.Message

    if (data.message_type === "group") {
      event.scene = "group"
      event.user = this.client.handle._convertGroupMemberInfo(String(data.group_id), data.sender)
      event.group = await this.client.handle.getGroupInfo({
        id: String(data.group_id),
      })
    } else {
      event.user = this.client.handle._convertUserInfo(data.sender)
    }
    return event
  }

  message_sent(data: OBv11.Event.Message) {
    return this.message(data)
  }

  notice(data: OBv11.Event.Notice) {
    /** TODO */
    return data
  }

  async request(data: OBv11.Event.Request) {
    const event = {
      id: data.flag,
      type: "request",
      scene: "user",
      time: data.time || Date.now() / 1000,
      user: await this.client.handle.getUserInfo({ id: String(data.user_id) }),
      state: "pending",
      reason: data.comment,
    } as Philia.Event.Request
    if (data.request_type === "group") {
      event.scene = `group_${data.sub_type}`
      event.group = await this.client.handle.getGroupInfo({
        id: String(data.group_id),
      })
      event.sub_type = data.sub_type
    }
    this.event_map.set(event.id, event)
    return event
  }

  meta_event(data: OBv11.Event.Meta) {
    /** TODO */
    return data
  }
}
/*
export class PhiliaToOBv11 {
  constructor(public client: Client) {}

  convert(event: Philia.Event.Event) {
    if (typeof this[event.type] !== "function") throw Error(`未知事件：${event.type}`)
    return this[event.type](event as never) as Promise<OBv11.Event.Event>
  }
}*/
