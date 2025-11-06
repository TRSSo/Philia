import type { FriendDecreaseEvent, FriendIncreaseEvent, FriendPokeEvent, FriendRecallEvent, FriendRequestEvent, GroupInviteEvent, PrivateMessageEvent } from "../event/types.js";
import { PrivateMessage } from "../message/index.js";
import { Contactable } from "./contactable.js";
import type { FriendInfo } from "./types.js";
type Client = import("../app.js").Client;
/** 用户 */
export declare class User extends Contactable {
	readonly uid: string;
	private _info?;
	/** `this.uid`的别名 */
	get user_id(): string;
	static as(this: Client, uid: string, strict?: boolean): User;
	protected constructor(c: Client, uid: string, _info?: FriendInfo | undefined);
	/** 返回作为好友的实例 */
	asFriend(strict?: boolean): User;
	/** 返回作为某群群员的实例 */
	asMember(gid: string, strict?: boolean): import("./member.js").Member;
	/**
	 * 获取头像url
	 * @param size 头像大小，默认`0`
	 * @returns 头像的url地址
	 */
	getAvatarUrl(size?: 0 | 40 | 100 | 140): string;
	/**
	 * 点赞，支持陌生人点赞
	 * @param times 点赞次数，默认1次
	 */
	thumbUp(times?: number): Promise<void>;
	/** 查看资料 */
	getSimpleInfo(): Promise<FriendInfo | undefined>;
	/**
	 * 获取`time`往前的`cnt`条聊天记录
	 * @param time 默认当前时间，为时间戳的分钟数（`Date.now() / 1000`）
	 * @param cnt 聊天记录条数，默认`20`
	 * @returns 私聊消息列表，服务器记录不足`cnt`条则返回能获取到的最多消息记录
	 */
	getChatHistory(time?: number, count?: number): Promise<PrivateMessage[]>;
	/**
	 * 标记`time`之前为已读
	 * @param time 默认当前时间，为时间戳的分钟数（`Date.now() / 1000`）
	 */
	markRead(time?: number): Promise<void>;
	/**
	 * 回添双向好友
	 * @param seq 申请消息序号
	 * @param mark 好友备注
	 */
	addFriendBack(seq: number, remark?: string): Promise<void>;
	/**
	 * 处理好友申请
	 * @param seq 申请消息序号
	 * @param result 是否同意
	 * @param remark 好友备注
	 * @param block 是否屏蔽来自此用户的申请
	 */
	setFriendReq(seq: number, result?: boolean, remark?: string, block?: boolean): Promise<void>;
	/**
	 * 处理入群申请
	 * @param gid 群号
	 * @param seq 申请消息序号
	 * @param result 是否同意
	 * @param reason 若拒绝，拒绝的原因
	 * @param block 是否屏蔽来自此用户的申请
	 */
	setGroupReq(gid: string, seq: number, result?: boolean, reason?: string, block?: boolean): Promise<void>;
	/**
	 * 处理群邀请
	 * @param gid 群号
	 * @param seq 申请消息序号
	 * @param result 是否同意
	 * @param block 是否屏蔽来自此群的邀请
	 */
	setGroupInvite(gid: string, seq: number, result?: boolean, block?: boolean): Promise<void>;
	/** 好友 */
	/** 好友资料 */
	get info(): FriendInfo | undefined;
	/** 昵称 */
	get nickname(): string | undefined;
	/** 性别 */
	get sex(): import("./types.js").Gender | undefined;
	/** 备注 */
	get remark(): string | undefined;
	/** 分组id */
	get class_id(): number | undefined;
	/** 分组名 */
	get class_name(): string | 0 | undefined;
	/** 设置分组(注意：如果分组id不存在也会成功) */
	setClass(name: number): Promise<void>;
	/** 戳一戳 */
	poke(self?: boolean): Promise<void>;
	/**
	 * 删除好友
	 * @param block 屏蔽此好友的申请，默认为`true`
	 */
	delete(block?: boolean): Promise<void>;
	/**
	 * 查找机器人与这个人的共群
	 * @returns
	 */
	searchSameGroup(): Promise<{
		groupName: string;
		Group_Id: string;
		id: string;
		name: string;
		avatar?: string;
		remark?: string;
		whole_mute?: boolean;
	}[]>;
	/**
	 * 发送离线文件
	 * @param file `string`表示从该本地文件路径获取，`Buffer`表示直接发送这段内容
	 * @param name 对方看到的文件名，`file`为`Buffer`时，若留空则自动以md5命名
	 * @returns 文件ID
	 */
	sendFile(file: string | Buffer, name?: string): Promise<string>;
}
/** 私聊消息事件 */
export interface PrivateMessageEventMap {
	message(event: PrivateMessageEvent): void;
	/** 好友的消息 */
	"message.friend"(event: PrivateMessageEvent): void;
	/** 群临时对话 */
	"message.group"(event: PrivateMessageEvent): void;
	/** 其他途径 */
	"message.other"(event: PrivateMessageEvent): void;
	/** 我的设备 */
	"message.self"(event: PrivateMessageEvent): void;
}
/** 好友通知事件 */
export interface FriendNoticeEventMap {
	notice(event: FriendIncreaseEvent | FriendDecreaseEvent | FriendRecallEvent | FriendPokeEvent): void;
	/** 新增好友 */
	"notice.increase"(event: FriendIncreaseEvent): void;
	/** 好友减少 */
	"notice.decrease"(event: FriendDecreaseEvent): void;
	/** 撤回消息 */
	"notice.recall"(event: FriendRecallEvent): void;
	/** 戳一戳 */
	"notice.poke"(event: FriendPokeEvent): void;
}
/** 好友申请事件 */
export interface FriendRequestEventMap {
	request(event: FriendRequestEvent): void;
	/** 群邀请 */
	"request.invite"(event: GroupInviteEvent): void;
	/** 添加好友 */
	"request.add"(event: FriendRequestEvent): void;
	/** 单向好友 */
	"request.single"(event: FriendRequestEvent): void;
}
/** 所有的好友事件 */
export interface FriendEventMap extends PrivateMessageEventMap, FriendNoticeEventMap, FriendRequestEventMap {
}
export declare const Friend: typeof User;
export type Friend = User;
export {};
