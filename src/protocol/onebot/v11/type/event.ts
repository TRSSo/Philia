import type { MessageSegment } from "./message.js"

export interface AEvent {
  /** 事件发生的unix时间戳 */
  time: number
  /** 收到事件的机器人的 QQ 号 */
  self_id: number
  /** 表示该上报的类型, 消息, 消息发送, 请求, 通知, 或元事件 */
  post_type: "message" | "message_sent" | "request" | "notice" | "meta_event"
}

export interface EventMap {
  message: Message
  message_sent: Message
  request: Request
  notice: Notice
  meta_event: Meta
}

export interface Sender {
  user_id: number
  nickname: string
  avatar?: string
  sex: "male" | "female" | "unknown"
  age: number
}
export interface GroupSender extends Sender {
  card: string
  area: string
  level: string
  role: "owner" | "admin" | "member"
  title: string
}

export interface AMessage extends AEvent {
  post_type: "message" | "message_sent"
  message_type: string
  sub_type: string
  message_id: number
  message_seq?: number
  user_id: number
  message: MessageSegment[]
  raw_message: string
  font: number
}
export interface UserMessage extends AMessage {
  message_type: "private"
  sub_type: "friend" | "group"
  sender: Sender
  target_id: number
  temp_source?: number
}
export interface GroupMessage extends AMessage {
  message_type: "group"
  sub_type: "normal" | "notice"
  group_id: number
  sender: GroupSender
}
export type Message = UserMessage | GroupMessage

export interface ANotice extends AEvent {
  post_type: "notice"
  notice_type: string
  user_id: number
}
export interface UserRecallNotice extends ANotice {
  notice_type: "friend_recall"
  message_id: number
}
export interface GroupRecallNotice extends ANotice {
  notice_type: "group_recall"
  message_id: number
  group_id: number
  operator_id: number
}
export type Notice = UserRecallNotice | GroupRecallNotice

export interface ARequest extends AEvent {
  post_type: "request"
  request_type: string
  user_id: number
  comment: string
  flag: string
}
export interface AddUserRequest extends ARequest {
  request_type: "friend"
}
export interface AddGroupRequest extends ARequest {
  request_type: "group"
  group_id: number
  sub_type: "invite" | "add"
}
export type Request = AddUserRequest | AddGroupRequest

export interface AMeta extends AEvent {
  post_type: "meta_event"
  meta_event_type: "heartbeat" | "lifecycle"
}
export interface HeartbeatMeta extends AMeta {
  meta_event_type: "heartbeat"
  status: {
    [key: string]: unknown
    online: boolean
    good: boolean
  }
  interval: number
}
export interface LifecycleMeta extends AMeta {
  meta_event_type: "lifecycle"
  sub_type: "enable" | "disable" | "connect"
}
export type Meta = HeartbeatMeta | LifecycleMeta

export type Event = Message | Notice | Request | Meta
