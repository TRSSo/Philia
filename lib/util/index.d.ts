import type EventEmitter from "node:events";
import type { IncomingMessage } from "node:http";
import type { AddressInfo, Server, Socket } from "node:net";
import util from "node:util";
export declare const chalk: import("chalk").ChalkInstance;
/**
 * 生成错误对象并赋予一些参数
 * @param msg 错误信息
 * @param obj 错误参数
 * @returns 错误对象
 */
export declare function makeError(msg: string, ...obj: object[]): any;
/**
 * 按数组1的顺序查找数组2中存在的第一个值
 * @param array1 数组1
 * @param array2 数组2
 * @returns (数组1 ∩ 数组2)[0]
 */
export declare function findArrays<T>(array1: Array<T>, array2: Array<T>): T | undefined;
/**
 * 把对象转成字符串，处理对象不存在 toString 方法的情况
 * @param data 对象
 * @returns 字符串
 */
export declare function StringOrNull(data: object): string;
/**
 * 传入二进制数据，如果符合 UTF-8 编码，转成字符串，否则转成 base64 或不转
 * @param data 二进制数据
 * @param base64 是否转成 base64
 * @returns 字符串
 */
export declare function StringOrBuffer(data: Buffer, base64: true): string;
export declare function StringOrBuffer(data: Buffer, base64?: false): string | Buffer;
export declare function getCircularReplacer(): (this: any, _key: string, value: any) => any;
/**
 * 把任意类型转成字符串/JSON
 * @param data 任意类型
 * @param space JSON.stringify 的第三个参数
 * @returns 字符串
 */
export declare function toJSON(data: any, space?: Parameters<typeof JSON.stringify>[2]): string;
/**
 *  base64 http file 转为 Buffer
 * @param data 数据
 * @param opts.http 是否返回 http
 * @param opts.path 是否返回文件路径
 */
export declare function toBuffer(data: any, opts?: {
	http?: boolean;
	path?: boolean;
} & Parameters<typeof fetch>[1]): Promise<Buffer | string>;
interface InspectOptions extends util.InspectOptions {
	/** 字符串是否直接返回 */
	string?: boolean;
	/** 限制长度 */
	length?: number;
}
/**
 * 把任意类型转成终端彩色编码字符串
 * @param data 任意类型
 * @param opts { @link util.InspectOptions } + { @link InspectOptions }
 * @returns 终端彩色编码字符串
 */
export declare function Loging(data: any, opts?: InspectOptions): string;
/**
 * 取任意类型的属性
 * @param data 任意类型
 * @param props 属性列表
 * @returns 属性列表
 */
export declare function getAllProps(data: any, props?: Set<string>): Set<string>;
/**
 * 事件转 Promise
 * @param event 事件触发器
 * @param resolve 兑现事件名
 * @param reject 拒绝事件名
 * @param timeout 超时时间
 * @returns Promise
 */
export declare function promiseEvent<T>(event: EventEmitter, resolve: string | symbol, reject?: string | symbol, timeout?: number): Promise<T>;
/** A是否为B的子集 */
export declare function isSubObj<T extends object>(A: Partial<T>, B: T, length?: number, equal?: boolean): boolean;
/** A是否等于B */
export declare function isEqualObj<T extends object>(A: T, B: T, length?: number): boolean;
/** 匹配规则 */
export interface IModeMatch {
	/** 匹配模式
	 * include: 目标在匹配列表
	 * exclude: 目标不在匹配列表
	 * regexp : 目标符合匹配列表正则表达式
	 */
	mode: "include" | "exclude" | "regexp";
	/** 匹配列表 */
	list: string | string[];
}
/**
 * 模式匹配
 * @param rule 匹配规则
 * @param target 匹配目标
 * @returns 是否匹配
 */
export declare function modeMatch(rule: IModeMatch, target: string): boolean;
/**
 * 获取日期
 * @returns YYYY-MM-DD
 */
export declare function getDate(date?: Date): string;
/**
 * 获取时间
 * @returns hh:mm:ss.SSS
 */
export declare function getTime(date?: Date): string;
/**
 * 获取日期时间
 * @returns YYYY-MM-DD hh:mm:ss.SSS
 */
export declare function getDateTime(date?: Date): string;
/**
 * 获取时间差
 * @param time1 开始时间
 * @param time2 结束时间
 * @returns 时间差（D天h时m分s秒SSS）
 */
export declare function getTimeDiff(time1: number, time2?: number): string;
/** 获取代码目录 */
export declare function getCodeDir(): string;
/** 获取根目录 */
export declare function getRootDir(): string;
/** 获取项目目录 */
export declare function getProjectDir(...args: string[]): string;
/**
 * 获取 Socket 地址
 * @param socket Socket 对象
 * @returns 地址
 */
export declare function getSocketAddress(socket: {
	address: (Socket | Server)["address"];
}): string | AddressInfo;
/**
 * 获取 Socket 远程地址
 * @param socket Socket 对象
 * @returns [地址]
 */
export declare function getSocketRemoteAddress(socket: Socket): readonly [`undefined:${number}` | `${string}:undefined` | `${string}:${number}`];
/**
 * 获取 HTTP 请求信息文字
 * @param req 请求对象
 * @returns [对方信息，自身信息]
 */
export declare function getRequestInfo(req: IncomingMessage): readonly [`http://${string}undefined` | `http://${string}${string}`, `undefined:${number}` | `${string}:undefined` | `${string}:${number}`];
export {};
