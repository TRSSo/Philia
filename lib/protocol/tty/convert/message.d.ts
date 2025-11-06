import type { Message } from "#protocol/type";
import type Impl from "../impl.js";
export default class PhiliaToTTY {
	impl: Impl;
	message: (string | Message.MessageSegment)[];
	summary: string;
	constructor(impl: Impl, message: Message.Message);
	convert(message?: Message.Message): Promise<string>;
	text(ms: Message.Text): void;
	mention(ms: Message.Mention): void;
	reply(ms: Message.Reply): void;
	button(ms: Message.Button): void;
	extend(ms: Message.Extend): void;
	platform(ms: Message.Platform): Promise<void>;
	file(ms: Message.AFile, name?: string): Promise<void>;
	image(ms: Message.Image): Promise<void>;
	audio(ms: Message.Audio): Promise<void>;
	voice(ms: Message.Voice): Promise<void>;
	video(ms: Message.Voice): Promise<void>;
}
