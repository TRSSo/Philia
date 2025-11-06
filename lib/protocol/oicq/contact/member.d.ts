import { User } from "./friend.js";
import type { GroupEventMap } from "./group.js";
import type { MemberInfo } from "./types.js";
type Client = import("../app.js").Client;
/** 群员事件(= {@link GroupEventMap}) */
export type MemberEventMap = GroupEventMap;
/** @ts-expect-error ts(2415) 群员 */
export declare class Member extends User {
	readonly gid: string;
	private _info?;
	static as(this: Client, gid: string, uid: string, strict?: boolean): Member;
	/** 群员资料 */
	get info(): MemberInfo | undefined;
	/** {@link gid} 的别名 */
	get group_id(): string;
	/** 名片 */
	get card(): string | undefined;
	/** 头衔 */
	get title(): string | undefined;
	/** 是否是我的好友 */
	get is_friend(): boolean;
	/** 是否是群主 */
	get is_owner(): boolean;
	/** 是否是管理员 */
	get is_admin(): boolean;
	/** 禁言剩余时间 */
	get mute_left(): number;
	/** 返回所在群的实例 */
	get group(): import("./group.js").Group;
	protected constructor(c: Client, gid: string, uid: string, _info?: MemberInfo | undefined);
	/** 强制刷新群员资料 */
	renew(): Promise<MemberInfo>;
	/**
	 * 设置/取消管理员
	 * @param yes 是否设为管理员
	 */
	setAdmin(yes?: boolean): Promise<void>;
	/**
	 * 设置头衔
	 * @param title 头衔名
	 * @param duration 持续时间，默认`-1`，表示永久
	 */
	setTitle(title?: string, duration?: number): Promise<void>;
	/**
	 * 修改名片
	 * @param card 名片
	 */
	setCard(card?: string): Promise<void>;
	/**
	 * 踢出群
	 * @param _msg @todo 未知参数
	 * @param block 是否屏蔽群员
	 */
	kick(_msg?: string, block?: boolean): Promise<void>;
	/**
	 * 禁言
	 * @param duration 禁言时长（秒），默认`1800`
	 */
	mute(duration?: number): Promise<void>;
	/** 戳一戳 */
	poke(): Promise<void>;
	/**
	 * 是否屏蔽该群成员消息
	 * @param yes
	 */
	setScreenMsg(yes?: boolean): Promise<void>;
}
export {};
