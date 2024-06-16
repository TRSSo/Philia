import { IUser } from "./user.js"

/** 消息基类 */
export interface IMS {
  /** 消息类型 */
  type: string
  /** 消息数据 */
  data: string | object
}

/** 文本消息 */
export interface IMSText extends IMS {
  type: "text"
  /** 文本数据 */
  data: string
  /** Markdown 数据，仅支持 Markdown 时有效 */
  markdown?: string
}

/** 提及消息 */
export interface IMSMention extends IMS {
  type: "mention"
  /** 提及用户 | 全体成员 */
  data: IUser["id"] | "all"
}

/** 回复消息 */
export interface IMSReply extends IMS {
  type: "reply"
  /** 消息ID */
  data: string
}

/** 文件消息基类 */
export interface AMSFile extends IMS {
  /** 文件数据：二进制或 base64:// 或 id:// (调用ID获取文件接口) */
  data: Buffer | string
  /** 文件链接：https?:// */
  url?: string
  /** 文件路径：操作系统文件路径格式 */
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
export type IMessageSegment = IMSText["data"] | IMSText | IMSMention | IMSReply | IMSFile | IMSImage | IMSAudio | IMSVoice | IMSVideo
/** 消息 */
export type IMessage = IMessageSegment | IMessageSegment[]