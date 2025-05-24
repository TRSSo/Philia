import * as Contact from "./contact.js"
import { Message as IMessage } from "./message.js"

/** 事件基类 */
export interface Event {
  /** 事件ID */
  id: string
  /** 事件类型 */
  type: string
  /** 事件场景 */
  scene: string
  /** 事件时间，Unix时间戳(秒) */
  time: number
  /** 发起事件用户 */
  user?: Contact.User
  /** 发起事件群 */
  group?: Contact.Group
  /** 平台额外字段 */
  [key: string]: unknown
}

export interface Handle {
  type: Event["type"]
  /** 事件处理函数，默认为 handleEvent.${type} */
  handle?: string
}

/** 消息事件基类 */
export interface AMessage extends Event {
  type: "message"
  user: Contact.User
  message: IMessage
  /** 消息摘要 */
  summary: string
}

/** 用户消息事件 */
export interface UserMessage extends AMessage {
  scene: "user"
  /** 如果是自己发送给用户，则存在该字段 */
  is_self?: true
}

/** 群消息事件 */
export interface GroupMessage extends AMessage {
  scene: "group"
  group: Contact.Group
}

export type Message = UserMessage | GroupMessage

/** 通知事件基类 */
export interface ANotice extends Event {
  type: "notice"
}

export type Notice = ANotice

/** 请求事件基类 */
export interface ARequest extends Event {
  type: "request"
}

export type Request = ARequest
