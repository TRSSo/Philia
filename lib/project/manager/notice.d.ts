import type { Client, type } from "#connect/common";
import type Manager from "./manager.js";
type HandleFn<T> = type.Handle<T, void | string>;
export default class NoticeManager {
	manager: Manager;
	notice_map: Map<string, {
		name: string;
		desc: string;
		input: boolean;
		handle?: HandleFn<void> | HandleFn<string>;
	}>;
	constructor(manager: Manager);
	/**
	 * 发布通知
	 * @param name 名称
	 * @param desc 描述
	 * @param handle 处理函数
	 * @param input 是否需要输入
	 */
	set(name: string, desc: string, handle?: HandleFn<void>, input?: false): void;
	set(name: string, desc: string, handle: HandleFn<string>, input: true): void;
	/** 查询通知数量 */
	count(): number;
	/** 列出所有通知 */
	list(): {
		id: string;
		name: string;
		desc: string;
		input: boolean;
	}[];
	/** 处理通知 */
	handle({ id, data }: {
		id: string;
		data?: string;
	}, client: Client): string | void | Promise<string | void> | undefined;
}
export {};
