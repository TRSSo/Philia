import type * as Philia from "#protocol/type";
import type { Client } from "../app.js";
import type { Contactable } from "../contact/contactable.js";
import type { MessageRet } from "../event/types.js";
import { type AtElem, type BaseMessageElem, type Button, type ButtonElem, type ExtendMessageElem, type FileElem, type ForwardNode, type ImageElem, type MarkdownElem, type MessageElem, type PlatformElem, type PttElem, type Quotable, type ReplyElem, type Sendable, type TextElem, type VideoElem } from "./elements.js";
/** 消息转换器 */
export declare class OICQtoPhilia {
  protected readonly c: Contactable;
  /** 转换前的消息 */
  before: (string | MessageElem)[];
  /** 转换后的消息 */
  after: Philia.Message.MessageSegment[];
  /** 长度(字符) */
  length: number;
  /** 预览文字 */
  brief: string;
  /** 是否已发出 */
  response?: MessageRet;
  constructor(c: Contactable, content: Sendable, source?: Quotable);
  convert(): Promise<Philia.Message.MessageSegment[]>;
  extend(data: ExtendMessageElem): void;
  platform(data: PlatformElem): void;
  _text(text: any, markdown?: string): void;
  text(ms: TextElem): void;
  at(ms: AtElem): void;
  _prepareFile<T extends Philia.Message.AFile>(ms: {
    type: string;
    file: string | Buffer;
    fid?: string;
  }): Promise<T>;
  file(ms: FileElem): Promise<void>;
  image(ms: ImageElem): Promise<void>;
  record(ms: PttElem): Promise<void>;
  video(ms: VideoElem): Promise<void>;
  node(ms: ForwardNode): Promise<void>;
  markdown(ms: MarkdownElem): void;
  _button(ms: Button): Philia.Message.ButtonType;
  button(ms: ButtonElem): void;
  reply(ms: ReplyElem): void;
  quote(ms: Quotable): void;
}
export declare class PhiliaToOICQ {
  protected readonly c: Client;
  before: (string | Philia.Message.MessageSegment)[];
  after: MessageElem[];
  brief: string;
  content: string;
  /** 引用回复 */
  source?: Quotable;
  atme: boolean;
  atall: boolean;
  constructor(c: Client, message: Philia.Message.Message);
  convert(): Promise<void>;
  text(ms: Philia.Message.Text): void;
  mention(ms: Philia.Message.Mention): void;
  reply(ms: Philia.Message.Reply): Promise<void>;
  _button(button: Philia.Message.ButtonType): any;
  button(ms: Philia.Message.Button): void;
  extend(ms: Philia.Message.Extend): void;
  platform(ms: Philia.Message.Platform): void;
  _file(type: BaseMessageElem["type"], ms: Philia.Message.AFile): Promise<void>;
  file(ms: Philia.Message.File): Promise<void>;
  image(ms: Philia.Message.Image): Promise<void>;
  voice(ms: Philia.Message.Voice): Promise<void>;
  audio(ms: Philia.Message.Audio): Promise<void>;
  video(ms: Philia.Message.File): Promise<void>;
}
