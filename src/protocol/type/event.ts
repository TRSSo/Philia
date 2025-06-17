import * as Contact from "./contact.js"
import * as IMessage from "./message.js"
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
  user: Contact.User | Contact.GroupMember
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
  message: IMessage.Message
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

/** 用户信息更改通知 */
export interface UserInfo extends ANotice {
  scene: "user_info"
  /** 更改后信息 */
  change: Partial<Contact.User>
}

/** 群信息更改通知 */
export interface GroupInfo extends ANotice {
  scene: "group_info"
  group: Contact.Group
  /** 更改后信息 */
  change: Partial<Contact.Group>
}

/** 群成员信息更改通知 */
export interface GroupMemberInfo extends ANotice {
  scene: "group_member_info"
  group: Contact.Group
  /** 被更改信息用户 */
  target: Contact.GroupMember
  /** 更改后信息 */
  change: Partial<Contact.GroupMember>
}

/** 机器人下线通知 */
export interface BotOffline extends ANotice {
  scene: "bot_offline"
  /** 下线原因 */
  reason: string
}

/** 撤回消息通知 */
export interface MessageRecall extends ANotice {
  scene: "user_message_recall" | "group_message_recall"
  /** 被撤回的用户，若无则撤回自己 */
  target?: Contact.User
  /** 撤回消息ID */
  message_id: Message["id"]
}

/** 戳一戳通知 */
export interface Poke extends ANotice {
  scene: "user_poke" | "group_poke"
  /** 被戳用户，若无则戳自己 */
  target?: Contact.User
}

/** 文件上传通知 */
export interface FileUpload extends ANotice {
  scene: "user_file_upload" | "group_file_upload"
  file: IMessage.AFile
}

/** 群精华消息通知 */
export interface GroupEssenceMessage extends ANotice {
  scene: "group_essence_message_add" | "group_essence_message_del"
  group: Contact.Group
  /** 设精消息ID */
  message_id: Message["id"]
}

/** 群成员出入通知 */
export interface GroupMember extends ANotice {
  scene: "group_member_add" | "group_member_del"
  group: Contact.Group
  /** 出入用户 */
  user: Contact.GroupMember
  /** 操作用户（同意入群或移出群） */
  operator?: Contact.GroupMember
  /** 入群邀请用户 */
  invitor?: Contact.GroupMember
}

export type Notice =
  | UserInfo
  | GroupInfo
  | GroupMemberInfo
  | BotOffline
  | MessageRecall
  | Poke
  | FileUpload
  | GroupEssenceMessage
  | GroupMember

/** 请求事件基类 */
export interface ARequest extends AEvent {
  type: "request"
  /** 申请理由 */
  reason: string
}
/** 加好友请求 */
export interface UserRequest extends ARequest {
  scene: "user"
}
/** 入群申请、邀请加群 */
export interface GroupRequest extends ARequest {
  scene: "group_add" | "group_invite"
  group: Contact.Group
}
export type Request = UserRequest | GroupRequest

export type Event = Message | Notice | Request
