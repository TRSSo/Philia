import type Client from "./client.js";
export interface MetaInfo {
	id: string;
	name: string;
	version: number;
	encode: string[];
	verify: string[];
}
export interface Meta {
	local: MetaInfo;
	remote?: MetaInfo;
}
export interface Options {
	meta?: Partial<MetaInfo>;
	timeout?: {
		send?: number;
		wait?: number;
		idle?: number;
		retry?: number;
	};
	path?: string;
	compress?: boolean;
	connected_fn?(client: Client): void;
	closed_fn?(client: Client): void;
}
export interface ServerOptions extends Options {
	limit?: number;
}
export declare const enum ESocketStatus {
	New = 0,
	dle = 1,
	Send = 2,
	Close = 3
}
export declare const enum EStatus {
	Request = 0,
	Response = 1,
	Async = 2,
	Error = 3
}
export interface Base<T extends EStatus> {
	id: string;
	code: T;
}
export interface Request extends Base<EStatus.Request> {
	name: string;
	data?: unknown;
}
export interface Response extends Base<EStatus.Response> {
	data?: unknown;
}
export interface Async extends Base<EStatus.Async> {
	time?: number;
}
export interface Error extends Base<EStatus.Error> {
	data: {
		name: string;
		message: string;
		error?: string;
	};
}
export type Status = Request | Response | Async | Error;
export type Reply = Response | Async | Error;
export declare class CError {
	data: Error["data"];
	constructor(name: string, message: string, error?: object);
}
export interface Cache extends ReturnType<typeof Promise.withResolvers<Response["data"]>> {
	data: Request;
	retry: number;
	finally(): void;
	timeout?: NodeJS.Timeout;
}
export type HandleDefault = (name: Request["name"], data: Request["data"], client: Client) => Response["data"] | Promise<Response["data"]>;
export type Handle<T, U> = (data: T, client: Client) => U | Promise<U>;
export interface HandleMap {
	[key: Request["name"]]: Handle<Request["data"], Response["data"]> | undefined | string | number | boolean | object;
	default?: HandleDefault;
}
