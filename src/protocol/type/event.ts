import * as Contact from "./contact.js"
import { Message as IMessage } from "./message.js"
import { IModeMatch } from "#util"

/** 事件基类 */
export interface AEvent {
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
  /** 事件类型 */
  type: AEvent["type"]
  /** 事件处理函数 */
  handle: string
  /** 事件场景 */
  scene?: AEvent["scene"]
  /** 发起事件用户ID匹配 */
  uid?: IModeMatch
  /** 发起事件群ID匹配 */
  gid?: IModeMatch
}

/** 消息事件基类 */
export interface AMessage extends AEvent {
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
  user: Contact.GroupMember
  group: Contact.Group
}
export type Message = UserMessage | GroupMessage

/** 通知事件基类 */
export interface ANotice extends AEvent {
  type: "notice"
}
export type Notice = ANotice

/** 请求事件基类 */
export interface ARequest extends AEvent {
  type: "request"
  /** 申请理由 */
  reason: string
}
/** 加好友请求 */
export interface UserRequest extends ARequest {
  scene: "user"
  /** 申请用户 */
  user: Contact.User
}
/** 入群申请、邀请加群 */
export interface GroupRequest extends ARequest {
  scene: "group_add" | "group_invite"
  /** 申请用户 */
  user: Contact.GroupMember
  /** 申请群 */
  group: Contact.Group
}
export type Request = UserRequest | GroupRequest

export type Event = Message | Notice | Request
