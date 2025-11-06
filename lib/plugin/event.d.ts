import type { Client } from "#connect/common";
import type { Event } from "#protocol/type";
import type { Project } from "./app.js";
import { type BaseContext, type ContextHookPlugin } from "./context.js";
export declare const HOOK: string;
export declare const MIDDLEWARE: string;
export declare const EVENT: string;
export declare const COMMAND: string;
export declare class EventHandle {
	project: Project;
	hooks: Set<ContextHookPlugin<any>>;
	constructor(project: Project);
	handle<T extends Event.Event>(event: T, client: Client): void | Promise<boolean>;
	hook<T extends Event.Event>(event: T, base_ctx: BaseContext): Promise<boolean>;
	middleware<T extends Event.Event>(event: T, base_ctx: BaseContext): Promise<boolean>;
	event<T extends Event.Event>(event: T, base_ctx: BaseContext): Promise<boolean>;
	command<T extends Event.Message>(event: T, base_ctx: BaseContext): Promise<boolean>;
}
