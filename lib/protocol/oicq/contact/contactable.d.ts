import type * as Philia from "#protocol/type";
import type { MessageRet } from "../event/types.js";
import { type FileIDElem, type Forwardable, type ForwardNode, GroupMessage, type ImageElem, type Message, type PttElem, type Quotable, type Sendable, type VideoElem } from "../message/index.js";
type Client = import("../app.js").Client;
/** 所有用户和群的基类 */
export declare abstract class Contactable {
	protected readonly c: Client;
	/** 对方QQ号 */
	protected uid?: string;
	/** 对方群号 */
	protected gid?: string;
	get target(): string;
	get dm(): boolean;
	get scene(): "user" | "group";
	/** 返回所属的客户端对象 */
	get client(): import("../app.js").Client;
	protected constructor(c: Client);
	get [Symbol.unscopables](): {
		c: boolean;
	};
	/** 发送网址分享 */
	shareUrl(content: any, config?: any): Promise<MessageRet>;
	/** 发送音乐分享 */
	shareMusic(platform: string, id: string): Promise<MessageRet>;
	/** 上传一批图片以备发送(无数量限制)，理论上传一次所有群和好友都能发 */
	uploadImages(images: ImageElem[]): Promise<FileIDElem[]>;
	uploadImage(elem: ImageElem): Promise<FileIDElem>;
	/** 上传一个视频以备发送(理论上传一次所有群和好友都能发) */
	uploadVideo(elem: VideoElem): Promise<FileIDElem>;
	/** 上传一个语音以备发送(理论上传一次所有群和好友都能发) */
	uploadPtt(elem: PttElem, transcoding?: boolean, brief?: string): Promise<FileIDElem>;
	/**
	 * 制作一条合并转发消息以备发送（制作一次可以到处发）
	 * 需要注意的是，好友图片和群图片的内部格式不一样，对着群制作的转发消息中的图片，发给好友可能会裂图，反过来也一样
	 * 支持4层套娃转发（PC仅显示3层）
	 */
	makeForwardMsg(msglist: Forwardable[] | Forwardable): ForwardNode;
	/** 下载并解析合并转发 */
	getForwardMsg(id: string): Promise<GroupMessage[]>;
	/** 获取视频下载地址 */
	getVideoUrl(fid: string): Promise<string | undefined>;
	/**
	 * 发送一条消息
	 * @param content 消息内容
	 * @param source 引用回复的消息
	 */
	sendMsg(content: Sendable, source?: Quotable): Promise<MessageRet>;
	sendForwardMsg(node: ForwardNode["data"]): Promise<MessageRet>;
	/**
	 * 撤回消息
	 * @param message_id 消息id
	 */
	recallMsg(message_id: string): Promise<boolean>;
	/**
	 * 撤回消息
	 * @param message 私聊消息对象
	 */
	recallMsg(message: Message): Promise<boolean>;
	/** 转发消息 */
	forwardMsg(mid: string): Promise<Philia.Message.RSendMsg>;
	/**
	 * 获取文件信息
	 * @param id 文件消息ID
	 */
	getFileInfo(id: string): Promise<Philia.Message.BinaryFile | Philia.Message.URLFile>;
	/**
	 * 获取离线文件下载地址
	 * @param fid 文件消息ID
	 */
	getFileUrl(fid: string): Promise<string | undefined>;
	/**
	 * 撤回离线文件
	 * @param fid 文件消息ID
	 */
	recallFile(fid: string): Promise<boolean>;
	/**
	 * 转发离线文件
	 * @param fid 文件消息ID
	 * @returns 转发成功后新文件的消息ID
	 */
	forwardFile(fid: string): Promise<MessageRet>;
	/** 设置群名 */
	setName(name: string): Promise<void>;
	/** 设置备注 */
	setRemark(remark: string): Promise<void>;
	/** 设置群头像 */
	setAvatar(avatar: ImageElem["file"]): Promise<void>;
}
export {};
