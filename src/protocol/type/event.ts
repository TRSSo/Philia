import type { IModeMatch } from "#util"
import type * as Contact from "./contact.js"
import type * as IMessage from "./message.js"

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
  /** 发起事件群 */
  group?: Contact.Group
  /** 平台原始字段 */
  raw?: any
}

export interface AUserEvent extends AEvent {
  /** 发起事件用户 */
  user: Contact.User
}

export interface AGroupEvent extends AEvent {
  /** 发起事件群成员 */
  user: Contact.GroupMember
  /** 发起事件群 */
  group: Contact.Group
}

export interface Handle {
  /** 事件类型 */
  type: Event["type"]
  /** 事件处理函数 */
  handle: string
  /** 事件场景 */
  scene?: Event["scene"]
  /** 发起事件用户ID匹配 */
  uid?: IModeMatch
  /** 发起事件群ID匹配 */
  gid?: IModeMatch
}

/** 消息事件基类 */
export interface AMessage {
  /** 消息段 */
  message: IMessage.MessageSegment[]
  /** 消息摘要 */
  summary: string
}
/** 用户消息事件 */
export interface UserMessage extends AUserEvent, AMessage {
  type: "message"
  scene: "user"
  /** 是否是自己发送给用户 */
  is_self?: true
}
/** 群消息事件 */
export interface GroupMessage extends AGroupEvent, AMessage {
  type: "message"
  scene: "group"
}
export type Message = UserMessage | GroupMessage

/** 通知事件基类 */
export interface AUserNotice extends AUserEvent {
  type: "notice"
}
/** 群通知事件基类 */
export interface AGroupNotice extends AGroupEvent {
  type: "notice"
}

/** 用户信息更改通知 */
export interface UserInfo extends AUserNotice {
  scene: "user_info"
  /** 更改后信息 */
  change: Partial<Contact.User>
}

/** 群信息更改通知 */
export interface GroupInfo extends AGroupNotice {
  scene: "group_info"
  /** 更改后信息 */
  change: Partial<Contact.Group>
}

/** 群成员信息更改通知 */
export interface GroupMemberInfo extends AGroupNotice {
  scene: "group_member_info"
  /** 被更改信息用户 */
  target: Contact.GroupMember
  /** 更改后信息 */
  change: Partial<Contact.GroupMember>
}

/** 机器人下线通知 */
export interface BotOffline extends AUserNotice {
  scene: "bot_offline"
  /** 下线原因 */
  reason: string
}

/** 撤回消息通知 */
export interface UserMessageRecall extends AUserNotice {
  scene: "user_message_recall"
  /** 撤回消息ID */
  message_id: Message["id"]
  /** 是否自己撤回 */
  is_self?: true
}

/** 撤回消息通知 */
export interface GroupMessageRecall extends AGroupNotice {
  scene: "group_message_recall"
  /** 撤回消息ID */
  message_id: Message["id"]
  /** 被撤回的用户，若无则撤回自己 */
  target?: Contact.User
}

/** 用户戳一戳通知 */
export interface UserPoke extends AUserNotice {
  scene: "user_poke"
  /** 是否自己发出的戳一戳 */
  is_self?: true
  /** 是否戳自己 */
  is_self_target?: true
}

/** 群戳一戳通知 */
export interface GroupPoke extends AGroupNotice {
  scene: "group_poke"
  /** 被戳用户，若无则用户戳用户自己 */
  target?: Contact.GroupMember
}

/** 用户文件上传 */
export interface UserFileUpload extends AUserNotice {
  scene: "user_file_upload"
  /** 是否自己发出的文件 */
  is_self?: true
  /** 文件消息段 */
  file: IMessage.File
}

/** 群文件上传 */
export interface GroupFileUpload extends AGroupNotice {
  scene: "group_file_upload"
  /** 文件消息段 */
  file: IMessage.File
}

/** 群精华消息通知 */
export interface GroupEssenceMessage extends AGroupNotice {
  scene: "group_essence_message_add" | "group_essence_message_del"
  /** 设精消息ID */
  message_id: Message["id"]
}

/** 群成员出入通知 */
export interface GroupMember extends AGroupNotice {
  scene: "group_member_add" | "group_member_del"
  /** 操作用户（同意入群或移出群） */
  operator?: Contact.GroupMember
  /** 入群邀请用户 */
  invitor?: Contact.GroupMember
}

/** 消息回应类型 */
export interface MessageReactionType {
  type: "face"
  id: string
}

/** 用户消息回应 */
export interface UserMessageReaction extends AUserNotice {
  scene: "user_message_reaction_add" | "user_message_reaction_del"
  /** 消息ID */
  message_id: Message["id"]
  /** 回应数据 */
  data: MessageReactionType
}

/** 群消息回应 */
export interface GroupMessageReaction extends AGroupNotice {
  scene: "group_message_reaction_add" | "group_message_reaction_del"
  /** 消息ID */
  message_id: Message["id"]
  /** 回应数据 */
  data: MessageReactionType
}

export type Notice =
  | UserInfo
  | GroupInfo
  | GroupMemberInfo
  | BotOffline
  | UserMessageRecall
  | GroupMessageRecall
  | UserPoke
  | GroupPoke
  | UserFileUpload
  | GroupFileUpload
  | GroupEssenceMessage
  | GroupMember

/** 请求事件基类 */
export interface ARequest extends AUserEvent {
  type: "request"
  /** 请求状态 */
  state: "pending" | "accepted" | "rejected" | "ignored"
  /** 请求理由 */
  reason?: string
}
/** 加好友请求 */
export interface UserRequest extends ARequest {
  scene: "user_add"
}
/** 入群申请、邀请加群 */
export interface GroupRequest extends ARequest {
  scene: "group_add" | "group_invite"
  group: Contact.Group
  /** 被邀请用户，若无则自己申请 */
  target?: Contact.User
}
export type Request = UserRequest | GroupRequest

export type Event = Message | Notice | Request
