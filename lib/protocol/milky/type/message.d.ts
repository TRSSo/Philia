import type * as Struct from "./struct.js";
/** 消息段基类 */
export interface ASegment {
	/** 类型标识符 */
	type: string;
	/** 结构体 */
	data: object;
}
/** 文本消息段 */
export interface Text extends ASegment {
	type: "text";
	data: {
		/** 文本内容 */
		text: string;
	};
}
/** 提及（@）消息段 */
export interface Mention extends ASegment {
	type: "mention";
	data: {
		/** 提及的QQ号 */
		user_id: number;
	};
}
/** 提及全体（@全体成员）消息段 */
export interface MentionAll extends ASegment {
	type: "mention_all";
}
/** 表情消息段 */
export interface Face extends ASegment {
	type: "face";
	data: {
		/** 表情ID */
		face_id: string;
	};
}
/** 回复消息段 */
export interface Reply extends ASegment {
	type: "reply";
	data: {
		/** 被引用的消息序列号 */
		message_seq: number;
	};
}
/** 图片消息段 */
export interface IncomingImage extends ASegment {
	type: "image";
	data: {
		/** 资源ID */
		resource_id: string;
		/** 临时URL */
		temp_url: string;
		/** 图片预览文本 */
		summary?: string;
		/** 图片类型 */
		sub_type: "normal" | "sticker";
	};
}
/** 语音消息段 */
export interface IncomingRecord extends ASegment {
	type: "record";
	data: {
		/** 资源ID */
		resource_id: string;
		/** 临时URL */
		temp_url: string;
		/** 语音时长（秒） */
		duration: number;
	};
}
/** 视频消息段 */
export interface IncomingVideo extends ASegment {
	type: "video";
	data: {
		/** 资源ID */
		resource_id: string;
		/** 临时URL */
		temp_url: string;
	};
}
/** 合并转发消息段 */
export interface IncomingForward extends ASegment {
	type: "forward";
	data: {
		/** 合并转发ID */
		forward_id: string;
	};
}
/** 市场表情消息段 */
export interface IncomingMarketFace extends ASegment {
	type: "market_face";
	data: {
		/** 市场表情URL */
		url: string;
	};
}
/** 小程序消息段 */
export interface IncomingLightApp extends ASegment {
	type: "light_app";
	data: {
		/** 小程序名称 */
		app_name: string;
		/** 小程序JSON数据 */
		json_payload: string;
	};
}
/** XML 消息段 */
export interface IncomingXml extends ASegment {
	type: "xml";
	data: {
		/** 服务ID */
		service_id: number;
		/** XML数据 */
		xml_payload: string;
	};
}
/** 接收消息段*/
export type IncomingSegment = Text | Mention | MentionAll | Face | Reply | IncomingImage | IncomingRecord | IncomingVideo | IncomingForward | IncomingMarketFace | IncomingLightApp | IncomingXml;
/** 基础发送消息类型 */
export type IncomingMessageBase = Text | Mention | MentionAll | Reply | IncomingImage | IncomingRecord | IncomingVideo;
/** 扩展发送消息类型 */
export type IncomingMessageExtend = Face | IncomingForward | IncomingMarketFace | IncomingLightApp | IncomingXml;
export declare const IncomingExtendArray: IncomingMessageExtend["type"][];
/** 图片消息段 */
export interface OutgoingImage extends ASegment {
	type: "image";
	data: {
		/** 文件 URI，支持 file:// http(s):// base64:// 三种格式 */
		uri: string;
		/** 图片预览文本 */
		summary?: string;
		/** 图片类型 */
		sub_type: "normal" | "sticker";
	};
}
/** 语音消息段 */
export interface OutgoingRecord extends ASegment {
	type: "record";
	data: {
		/** 文件 URI，支持 file:// http(s):// base64:// 三种格式 */
		uri: string;
	};
}
/** 视频消息段 */
export interface OutgoingVideo extends ASegment {
	type: "video";
	data: {
		/** 文件 URI，支持 file:// http(s):// base64:// 三种格式 */
		uri: string;
		/** 封面图片 URI */
		thumb_uri?: string;
	};
}
/** 合并转发消息段 */
export interface OutgoingForward extends ASegment {
	type: "forward";
	data: {
		/** 合并转发 ID */
		messages: Struct.OutgoingForwardedMessage[];
	};
}
/** 发送消息段 */
export type OutgoingSegment = Text | Mention | MentionAll | Face | Reply | OutgoingImage | OutgoingRecord | OutgoingVideo | OutgoingForward;
/** 基础发送消息类型 */
export type OutgoingMessageBase = Text | Mention | MentionAll | Reply | OutgoingImage | OutgoingRecord | OutgoingVideo | OutgoingForward;
/** 扩展发送消息类型 */
export type OutgoingMessageExtend = Face;
export declare const OutgoingExtendArray: OutgoingMessageExtend["type"][];
