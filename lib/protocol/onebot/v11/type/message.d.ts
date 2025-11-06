/** 消息基类 */
export interface AMessage {
	/** 消息类型 */
	type: string;
	/** 消息数据 */
	data: {
		[key in string]?: unknown;
	};
}
/** 文本消息 */
export interface Text extends AMessage {
	type: "text";
	data: {
		text: string;
	};
}
/** QQ 表情消息 */
export interface Face extends AMessage {
	type: "face";
	data: {
		/** QQ 表情 ID 见 https://github.com/kyubotics/coolq-http-api/wiki/表情-CQ-码-ID-表 */
		id: string;
	};
}
/** 文件消息基类 */
export interface AFile extends AMessage {
	type: string;
	data: {
		/** 接收为文件名，发送支持路径(file://)、URL(http://)、Base64(base64://) */
		file: string;
		/** 以下仅接收 */
		url?: string;
		/** 以下仅发送 */
		cache?: "0" | "1";
		proxy?: "0" | "1";
		timeout?: string;
	};
}
/** 图片消息 */
export interface Image extends AFile {
	type: "image";
	data: {
		/** 闪照 */
		type?: "flash";
	} & AFile["data"];
}
/** 语音消息 */
export interface Record extends AFile {
	type: "record";
	data: {
		/** 变声 */
		magic?: "0" | "1";
	} & AFile["data"];
}
/** 视频消息 */
export interface Video extends AFile {
	type: "video";
}
/** \@ 消息 */
export interface At extends AMessage {
	type: "at";
	data: {
		/** QQ 号、全体成员 all */
		qq: string;
		name?: string;
	};
}
/** 戳一戳，仅发送 */
export interface Poke extends AMessage {
	type: "poke";
	data: {
		qq: string;
	};
}
/** 链接分享消息 */
export interface Share extends AMessage {
	type: "share";
	data: {
		url: string;
		title: string;
		/** 以下仅发送，描述 */
		content?: string;
		/** 图片链接 */
		image?: string;
	};
}
/** 音乐分享消息 */
export interface Music extends AMessage {
	type: "music";
	data: {
		/** 音乐类型 */
		type: "qq" | "163" | "xm" | "custom";
		/** 非自定义有效，音乐 ID */
		id?: string;
		/** 以下仅自定义有效，跳转链接 */
		url?: string;
		/** 音乐链接 */
		audio?: string;
		/** 音乐标题 */
		title?: string;
		/** 音乐描述 */
		content?: string;
		/** 音乐图片 */
		image?: string;
	};
}
/** 回复消息 */
export interface Reply extends AMessage {
	type: "reply";
	data: {
		/** 回复的消息 ID */
		id: string;
		/** 回复的消息内容 */
		text?: string;
	};
}
/** 合并转发消息 */
export interface Forward extends AMessage {
	type: "forward";
	data: {
		/** 合并转发 ID，需通过 get_forward_msg API 获取具体内容 */
		id: string;
	};
}
/** 合并转发节点 */
export interface ForwardNode {
	type: "node";
	data: {
		/** 转发的消息 ID */
		id?: string;
		/** 发送时间 */
		time?: number;
		/** 以下为自定义节点 */
		content?: Message;
		/** 以下为 OneBotv11 */
		user_id?: string;
		nickname?: string;
		/** 以下为 go-cqhttp */
		uin?: string;
		name?: string;
	};
}
/** XML 消息 */
export interface XML {
	type: "xml";
	data: {
		data: string;
	};
}
/** JSON 消息 */
export interface JSON {
	type: "json";
	data: {
		data: string;
	};
}
/** 基础消息类型 */
export type MessageBase = Text | Image | Record | Video | At | Reply | Forward;
/** 扩展消息类型 */
export type MessageExtend = Face | Poke | Share | Music | XML | JSON;
export declare const ExtendArray: MessageExtend["type"][];
/** 消息段 */
export type MessageSegment = Text | Face | Image | Record | Video | At | Poke | Share | Music | Reply | Forward | XML | JSON;
/** 消息 */
export type Message = string | MessageSegment | (string | MessageSegment)[];
