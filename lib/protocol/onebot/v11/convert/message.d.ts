import type * as Philia from "#protocol/type";
import type Client from "../impl/client.js";
import * as OBv11 from "../type/index.js";
/** 消息转换器 */
export declare class OBv11toPhilia {
	client: Client;
	event: OBv11.Event.Message;
	/** 转换前的消息 */
	before: (string | OBv11.Message.MessageSegment)[];
	/** 转换后的消息 */
	after: Philia.Message.MessageSegment[];
	/** 消息摘要 */
	summary: string;
	/**
	 * @param client 客户端
	 * @param event 消息事件
	 */
	constructor(client: Client, event: OBv11.Event.Message);
	convert(): Promise<this>;
	extend(data: OBv11.Message.MessageExtend): void;
	_text(text: any, markdown?: string): void;
	text(ms: OBv11.Message.Text): void;
	at(ms: OBv11.Message.At): Promise<void>;
	_prepareFile<T extends Philia.Message.AFile>(ms: OBv11.Message.AFile): Promise<T>;
	image(ms: OBv11.Message.Image): Promise<void>;
	record(ms: OBv11.Message.Record): Promise<void>;
	video(ms: OBv11.Message.Video): Promise<void>;
	forward(ms: OBv11.Message.Forward): Promise<void>;
	reply(ms: OBv11.Message.Reply): void;
}
export declare class PhiliaToOBv11 {
	client: Client;
	scene: Philia.Event.Message["scene"];
	id: (Philia.Contact.User | Philia.Contact.Group)["id"];
	before: (string | Philia.Message.MessageSegment)[];
	after: OBv11.Message.MessageSegment[];
	summary: string;
	constructor(client: Client, scene: Philia.Event.Message["scene"], id: (Philia.Contact.User | Philia.Contact.Group)["id"], message: Philia.Message.Message);
	convert(): Promise<this>;
	_text(text: any): void;
	text(ms: Philia.Message.Text): void;
	mention(ms: Philia.Message.Mention): void;
	reply(ms: Philia.Message.Reply): void;
	extend(ms: Philia.Message.Extend): void;
	platform(ms: Philia.Message.Platform): void;
	_file(type: OBv11.Message.MessageBase["type"], ms: Philia.Message.AFile): void;
	file(ms: Philia.Message.File): Promise<void>;
	image(ms: Philia.Message.Image): void;
	voice(ms: Philia.Message.Voice): void;
	audio(ms: Philia.Message.Audio): Promise<void>;
	video(ms: Philia.Message.File): void;
	button(): void;
}
