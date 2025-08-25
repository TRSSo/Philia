import type * as Philia from "#protocol/type";
import type Impl from "../impl.js";
import * as Milky from "../type/index.js";
/** 消息转换器 */
export declare class MilkyToPhilia {
  impl: Impl;
  event: Milky.Struct.IncomingMessage;
  /** 转换前的消息 */
  before: (string | Milky.Message.IncomingSegment)[];
  /** 转换后的消息 */
  after: Philia.Message.MessageSegment[];
  /** 消息摘要 */
  summary: string;
  /**
   * @param client 客户端
   * @param event 消息事件
   */
  constructor(impl: Impl, event: Milky.Struct.IncomingMessage);
  convert(): Promise<this>;
  extend(data: Milky.Message.IncomingMessageExtend): void;
  _text(text: any, markdown?: string): void;
  text(ms: Milky.Message.Text): void;
  mention(ms: Milky.Message.Mention): void;
  mention_all(): void;
  reply(ms: Milky.Message.Reply): void;
  image(ms: Milky.Message.IncomingImage): void;
  record(ms: Milky.Message.IncomingRecord): void;
  video(ms: Milky.Message.IncomingVideo): void;
}
export declare class PhiliaToMilky {
  impl: Impl;
  scene: Philia.Event.Message["scene"];
  id: (Philia.Contact.User | Philia.Contact.Group)["id"];
  before: (string | Philia.Message.MessageSegment)[];
  after: Milky.Message.OutgoingSegment[];
  summary: string;
  file_id?: string[];
  constructor(impl: Impl, scene: Philia.Event.Message["scene"], id: (Philia.Contact.User | Philia.Contact.Group)["id"], message: Philia.Message.Message);
  convert(): Promise<this>;
  _text(text: any): void;
  text(ms: Philia.Message.Text): void;
  mention(ms: Philia.Message.Mention): void;
  reply(ms: Philia.Message.Reply): void;
  extend(ms: Philia.Message.Extend): void;
  platform(ms: Philia.Message.Platform): void;
  _file<T extends Milky.Message.OutgoingMessageBase>(type: T["type"], ms: Philia.Message.AFile): Promise<T>;
  file(ms: Philia.Message.File | Philia.Message.Audio): Promise<void>;
  image(ms: Philia.Message.Image): Promise<void>;
  voice(ms: Philia.Message.Voice): Promise<void>;
  audio(ms: Philia.Message.Audio): Promise<void>;
  video(ms: Philia.Message.File): Promise<void>;
  button(): void;
}
