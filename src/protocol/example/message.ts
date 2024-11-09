import { IGroup } from "./group.js"
import { IUser } from "./user.js"

/** 消息基类 */
export interface AMessage {
  /** 消息类型 */
  type: string
  /** 消息数据 */
  data: unknown
}

/** 文本消息 */
export interface IMSText extends AMessage {
  type: "text"
  /** 文本数据 */
  data: string
  /** Markdown 数据，仅支持 Markdown 时有效 */
  markdown?: string
}

/** 提及消息 */
export interface IMSMention extends AMessage {
  type: "mention"
  /** 提及用户 | 全体成员 */
  data: IUser["id"] | "all"
  /** 用户名 */
  name?: IUser["name"]
}

/** 回复消息 */
export interface IMSReply extends AMessage {
  type: "reply"
  /** 消息ID */
  data: string
  /** 消息内容 */
  text?: string
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
export interface IBLink extends AButton {
  link: string
}

/** 输入按钮 */
export interface IBInput extends AButton {
  input: string
  /** 是否直接发送 */
  send?: boolean
}

/** 回调按钮 */
export interface IBCallback extends AButton {
  callback: string
}

export type IButton = IBLink | IBInput | IBCallback

/** 按钮消息 */
export interface IMSButton extends AMessage {
  type: "button"
  data: IButton[][]
}

/** 合并转发消息 */
export interface IMSForward extends AMessage {
  type: "forward"
  /** 消息内容 */
  data: {
    message: IMessage
    time?: number
    user?: IUser
    group?: IGroup
  }[]
}

/** 扩展消息 */
export interface IMSExtend extends AMessage {
  type: "extend"
  /** 扩展消息类型，若目标平台不支持，则忽略该消息段 */
  extend: string
  /** 消息内容 */
  data: unknown
}

/** 平台消息 */
export interface IMSPlatform extends AMessage {
  type: "platform"
  /** 消息平台，若非目标平台，则忽略该消息段 */
  platform: string | string[]
  /** 匹配平台模式 */
  mode: "include" | "exclude" | "regexp"
  /** 消息内容 */
  data: unknown
}

/** 文件消息基类 */
export interface AMSFile extends AMessage {
  /** 文件名 */
  name: string
  /** 文件数据类型 */
  data: "id" | "binary" | "url" | "path"
  /** 文件 ID：可调用 getFile 接口 */
  id: string
  /** 文件二进制或 base64:// */
  binary?: Buffer | string
  /** 文件链接：https?:// */
  url?: string
  /** 文件路径：操作系统文件路径格式（使用此类型请先判断是否位于同一设备） */
  path?: string
}

/** 文件消息 */
export interface IMSFile extends AMSFile {
  type: "file"
}

/** 图片消息 */
export interface IMSImage extends AMSFile {
  type: "image"
}

/** 语音消息 */
export interface IMSVoice extends AMSFile {
  type: "voice"
}

/** 音频消息 */
export interface IMSAudio extends AMSFile {
  type: "audio"
}

/** 视频消息 */
export interface IMSVideo extends AMSFile {
  type: "video"
}

/** 消息段 */
export type IMessageSegment = IMSText | IMSMention | IMSReply | IMSButton | IMSExtend | IMSPlatform | IMSForward | IMSFile | IMSImage | IMSAudio | IMSVoice | IMSVideo
/** 消息 */
export type IMessage = IMSText["data"] | IMessageSegment | (IMSText["data"] | IMessageSegment)[]