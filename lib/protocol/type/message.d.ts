import type { IModeMatch } from "#util";
import type * as Contact from "./contact.js";
import type * as Event from "./event.js";
/** 消息基类 */
export interface AMessage {
  /** 消息类型 */
  type: string;
  /** 消息数据 */
  data: unknown;
  /** 平台原始字段 */
  raw?: any;
}
/** 文本消息 */
export interface Text extends AMessage {
  type: "text";
  /** 文本数据 */
  data: string;
  /** Markdown 数据，平台支持则转为 Markdown 消息 */
  markdown?: string;
  /** URL 数据，平台支持则转为链接消息 */
  url?: string;
}
/** 提及消息基类 */
export interface AMention extends AMessage {
  type: "mention";
  /** 提及目标类型 */
  data: string;
}
/** 提及用户消息 */
export interface UserMention extends AMention {
  data: "user";
  /** 用户ID */
  id: Contact.User["id"];
  /** 用户名 */
  name?: Contact.User["name"];
}
/** 提及全体成员消息 */
export interface AllMention extends AMention {
  data: "all";
}
/** 提及消息 */
export type Mention = UserMention | AllMention;
/** 回复消息 */
export interface Reply extends AMessage {
  type: "reply";
  /** 消息ID */
  data: string;
  /** 消息摘要 */
  summary?: string;
}
/** 文件消息基类 */
export interface AFile extends AMessage {
  /** 文件名 */
  name: string;
  /** 文件摘要 */
  summary?: string;
  /** 文件字节 */
  size?: number;
  /** 文件数据类型 */
  data: "id" | "binary" | "url" | "path";
  /** 文件ID（getFile(id) => {@link BinaryFile} | {@link URLFile}） */
  id?: string;
  /** 文件二进制或 base64:// */
  binary?: Buffer | string;
  /** 文件链接 https?:// */
  url?: string;
  /** 文件路径（请先判断是否位于同一系统） */
  path?: string;
}
/** ID文件消息 */
export interface IDFile extends AFile {
  data: "id";
  id: NonNullable<AFile["id"]>;
}
/** 二进制文件消息 */
export interface BinaryFile extends AFile {
  data: "binary";
  binary: NonNullable<AFile["binary"]>;
}
/** URL文件消息 */
export interface URLFile extends AFile {
  data: "url";
  url: NonNullable<AFile["url"]>;
}
/** 本地文件消息 */
export interface PathFile extends AFile {
  data: "path";
  path: NonNullable<AFile["path"]>;
}
/** 文件消息总类 */
export type IFile = IDFile | BinaryFile | URLFile | PathFile;
/** 文件消息 */
export type File = IFile & {
  type: "file";
};
/** 图片消息 */
export type Image = IFile & {
  type: "image";
};
/** 语音消息 */
export type Voice = IFile & {
  type: "voice";
};
/** 音频消息 */
export type Audio = IFile & {
  type: "audio";
};
/** 视频消息 */
export type Video = IFile & {
  type: "video";
};
/** 按钮基类 */
export interface AButton {
  /** 按钮上的文字 */
  text: string;
  /** 按钮点击后的文字 */
  clicked_text?: string;
  /** 谁能点按钮 */
  permission?: Contact.User["id"] | Contact.User["id"][];
  /** 平台额外字段，[平台名: 内容]，非目标平台忽略 */
  [key: string]: unknown;
}
/** 链接按钮 */
export interface ButtonLink extends AButton {
  link: string;
}
/** 输入按钮 */
export interface ButtonInput extends AButton {
  input: string;
  /** 是否直接发送 */
  send?: boolean;
}
/** 回调按钮 */
export interface ButtonCallback extends AButton {
  callback: string;
}
export type ButtonType = ButtonLink | ButtonInput | ButtonCallback;
/** 按钮消息 */
export interface Button extends AMessage {
  type: "button";
  /** 按钮[行][列] */
  data: ButtonType[][];
}
/** 扩展消息 */
export interface Extend extends AMessage {
  type: "extend";
  /** 扩展消息类型，目标平台不支持则忽略 */
  extend: string;
  data: unknown;
}
/** 平台消息，使用模式匹配平台名，不匹配则忽略 */
export interface Platform extends AMessage, IModeMatch {
  type: "platform";
  data: unknown;
}
/** 消息段 */
export type MessageSegment = Text | Mention | Reply | File | Image | Audio | Voice | Video | Button | Extend | Platform;
/** 消息 */
export type Message = string | MessageSegment | (string | MessageSegment)[];
/** 发送消息返回 */
export interface RSendMsg {
  /** 发送的消息ID */
  id: Event.Message["id"];
  /** 事件时间，Unix时间戳(秒) */
  time: Event.Message["time"];
  /** 文件ID（如果有发送文件） */
  file_id?: IDFile["id"][];
  /** 平台原始字段 */
  raw?: any;
}
/** 合并转发消息 */
export interface Forward {
  message: Message;
  /** 消息摘要（仅接收） */
  summary?: string;
  time?: number;
  user?: Partial<Contact.User>;
  group?: Partial<Contact.Group>;
}
