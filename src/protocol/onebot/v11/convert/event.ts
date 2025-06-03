import { Event as OBv11Event } from "../type/index.js"
import { Event as PhiliaEvent } from "#protocol/type"
import Client from "../server/client.js"
import * as MessageConvert from "./message.js"

/** 事件转换器 */
export class OBv11toPhilia {
  /** 客户端 */
  client: Client
  event_map = new Map<PhiliaEvent.Request["id"], PhiliaEvent.Request>()

  constructor(client: Client) {
    this.client = client
  }

  convert(event: OBv11Event.Event) {
    if (typeof this[event.post_type] !== "function") throw Error(`未知事件：${event.post_type}`)
    return this[event.post_type](event as any) as Promise<PhiliaEvent.Event>
  }

  async message(data: OBv11Event.Message) {
    const message = await new MessageConvert.OBv11toPhilia(this.client, data).convert()
    const event = {
      id: String(data.message_id),
      type: "message",
      time: data.time || Date.now() / 1000,
      scene: "user",
      user: {
        avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${data.sender.user_id}`,
        ...data.sender,
        id: String(data.sender.user_id),
        name: data.sender.nickname,
      },
      message: message.after,
      summary: message.summary,
    } as PhiliaEvent.Message

    if (data.message_type === "group") {
      event.scene = "group"
      event.group = await this.client.handle.getGroupInfo({ id: String(data.group_id) })
    }
    return event
  }

  message_sent(data: OBv11Event.Message) {
    return this.message(data)
  }

  notice(data: OBv11Event.Notice) {
    /** TODO */
    return data
  }

  async request(data: OBv11Event.Request) {
    const event = {
      id: data.flag,
      type: "request",
      scene: "user",
      time: data.time || Date.now() / 1000,
      user: await this.client.handle.getUserInfo({ id: String(data.user_id) }),
      reason: data.comment,
    } as PhiliaEvent.Request
    if (data.request_type === "group") {
      event.scene = `group_${data.sub_type}`
      event.group = await this.client.handle.getGroupInfo({ id: String(data.group_id) })
      event.sub_type = data.sub_type
    }
    this.event_map.set(event.id, event)
    return event
  }

  meta_event(data: OBv11Event.Meta) {
    /** TODO */
    return data
  }
}
/*
export class PhiliaToOBv11 {
  client: Client

  constructor(client: Client) {
    this.client = client
  }

  convert(event: PhiliaEvent.Event) {
    if (typeof this[event.type] !== "function") throw Error(`未知事件：${event.type}`)
    return this[event.type](event as any) as Promise<OBv11Event.Event>
  }
}*/
