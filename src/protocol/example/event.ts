import { ulid } from "ulid"
import Client from "../../socket/client.js"
import { IMessage } from "./message.js"
import { IUser } from "./user.js"
import { IGroup } from "./group.js"
import { makeError } from "../../util/common.js"

/** 事件基类 */
export interface IEvent {
  /** 事件ID */
  id: string
  /** 事件类型 */
  type: string
  /** 事件场景 */
  scene: string
}

/** 消息事件 */
export interface IEMessage extends IEvent {
  type: "message"
  user: IUser
  message: IMessage
  /** 消息摘要 */
  summary: string
}

/** 用户消息事件 */
export interface IEMUser extends IEMessage {
  scene: "user"
  /** 如果是自己发送给用户，则存在该字段 */
  is_self?: true
}

/** 群消息事件 */
export interface IEMGroup extends IEMessage {
  scene: "group"
  group: IGroup
}

export default class Event {
  receive: { [key: string]: NodeJS.Timeout } = {}
  event = {
    "message.user": {
      id: ulid(),
      type: "message",
      scene: "user",
      user: { id: "example", name: "示例" },
      message: [{ type: "text", data: "测试" }],
      summary: "测试",
    },

    "message.group": {
      id: ulid(),
      type: "message",
      scene: "group",
      user: { id: "example", name: "示例" },
      group: { id: "example", name: "示例" },
      message: [{ type: "text", data: "测试" }],
      summary: "测试",
    },
  }

  receiveEvent(event: IEvent | IEvent[], client: Client) {
    for (const i of Array.isArray(event) ? event : [event]) {
      if (!(i.type in this.event))
        throw makeError("不存在该事件", { target: i })
      if (this.receive[i.type]) clearInterval(this.receive[i.type])
      this.receive[i.type] = setInterval(() => {
        client.request(`event.${i.type}`, (this.event as any)[i.type])
      }, 1e4)
    }
  }

  unreceiveEvent(event: IEvent | IEvent[]) {
    for (const i of Array.isArray(event) ? event : [event]) {
      clearInterval(this.receive[i.type])
      delete this.receive[i.type]
    }
  }
}