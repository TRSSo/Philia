import { User as IUser, Group as IGroup } from "./contact.js"
import * as Event from "./event.js"
import { IModeMatch } from "#util"

/** 消息基类 */
export interface AMessage {
  /** 消息类型 */
  type: string
  /** 消息数据 */
  data: unknown
}

/** 文本消息 */
export interface Text extends AMessage {
  type: "text"
  /** 文本数据 */
  data: string
  /** Markdown 数据，仅支持 Markdown 时有效 */
  markdown?: string
  /** URL 数据，发送链接消息时使用 */
  url?: string
}

/** 提及消息 */
export interface Mention extends AMessage {
  type: "mention"
  /** 提及目标 */
  data: "user" | "all"
  /** 提及目标ID */
  id?: IUser["id"]
  /** 用户名 */
  name?: IUser["name"]
}

/** 回复消息 */
export interface Reply extends AMessage {
  type: "reply"
  /** 消息ID */
  data: string
  /** 消息摘要 */
  summary?: string
}

/** 文件消息基类 */
export interface AFile extends AMessage {
  /** 文件名 */
  name: string
  /** 文件数据类型 */
  data: "id" | "binary" | "url" | "path"
  /** 文件 ID（调用 getFile 接口获取） */
  id?: string
  /** 文件二进制或 base64:// */
  binary?: Buffer | string
  /** 文件链接 https?:// */
  url?: string
  /** 文件路径（请先判断是否位于同一系统） */
  path?: string
}

/** 文件消息 */
export interface File extends AFile {
  type: "file"
}
/** 图片消息 */
export interface Image extends AFile {
  type: "image"
}
/** 语音消息 */
export interface Voice extends AFile {
  type: "voice"
}
/** 音频消息 */
export interface Audio extends AFile {
  type: "audio"
}
/** 视频消息 */
export interface Video extends AFile {
  type: "video"
}

/** 按钮基类 */
export interface AButton {
  /** 按钮上的文字 */
  text: string
  /** 按钮点击后的文字 */
  clicked_text?: string
  /** 谁能点按钮 */
  permission?: IUser["id"] | IUser["id"][]
  /** 平台额外字段，[平台名: 内容]，非目标平台忽略该字段 */
  [key: string]: unknown
}

/** 链接按钮 */
export interface ButtonLink extends AButton {
  link: string
}

/** 输入按钮 */
export interface ButtonInput extends AButton {
  input: string
  /** 是否直接发送 */
  send?: boolean
}

/** 回调按钮 */
export interface ButtonCallback extends AButton {
  callback: string
}

export type ButtonType = ButtonLink | ButtonInput | ButtonCallback

/** 按钮消息 */
export interface Button extends AMessage {
  type: "button"
  data: ButtonType[][]
}

/** 合并转发消息 */
export interface Forward {
  message: Message
  time?: number
  user?: IUser
  group?: IGroup
}

/** 扩展消息 */
export interface Extend extends AMessage {
  type: "extend"
  /** 扩展消息类型，若目标平台不支持，则忽略该消息段 */
  extend: string
  data: unknown
}

/** 平台消息，使用模式匹配平台名，不匹配则忽略 */
export interface Platform extends AMessage, IModeMatch {
  type: "platform"
  data: unknown
}

/** 消息段 */
export type MessageSegment =
  | Text
  | Mention
  | Reply
  | Button
  | Extend
  | Platform
  | File
  | Image
  | Audio
  | Voice
  | Video
/** 消息 */
export type Message = string | MessageSegment | (string | MessageSegment)[]

/** 发送消息返回 */
export interface RSendMsg {
  /** 发送的消息ID */
  id: Event.Message["id"]
  /** 事件时间，Unix时间戳(秒) */
  time: Event.Message["time"]
  /** 平台额外字段 */
  [key: string]: unknown
}
