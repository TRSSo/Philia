import schedule from "node-schedule";
import { type Logger } from "#logger";
import type { Project } from "./app.js";
import type { GlobalContext } from "./context.js";
import type * as type from "./type.js";
export type Plugin = type.Plugin & {
	logger: Logger;
};
/** 插件管理器 */
export default class PluginManager {
	project: Project;
	loaded: boolean;
	path: string[];
	ctx: GlobalContext;
	command: (type.Command & {
		plugin: Plugin;
	})[];
	middleware: (type.Middleware & {
		plugin: Plugin;
	})[];
	event: (type.Event & {
		plugin: Plugin;
	})[];
	schedule: (type.Schedule & {
		job: schedule.Job;
	})[];
	start: (Plugin & {
		start: NonNullable<Plugin["start"]>;
	})[];
	stop: (Plugin & {
		stop: NonNullable<Plugin["stop"]>;
	})[];
	connect: (Plugin & {
		connect: NonNullable<Plugin["connect"]>;
	})[];
	close: (Plugin & {
		close: NonNullable<Plugin["close"]>;
	})[];
	constructor(project: Project, path: string | string[]);
	load(): Promise<void>;
	readdir(path: string): Promise<Plugin[]>;
	import(file: string): Promise<Plugin[]>;
	makeLogger(logger: Logger, name: string): Logger;
	execSchedule(plugin: Plugin, schedule: type.Schedule): Promise<void>;
	exec<T extends string, U extends Plugin & {
		[_ in T]: (...args: any[]) => unknown;
	}>(error_message: string, name: T, array: U[], ...args: Parameters<U[T]>): Promise<void[]>;
	execStart(): Promise<void[]>;
	execStop(): Promise<void[]>;
	execConnect(...args: Parameters<(typeof this.connect)[0]["connect"]>): Promise<void[]>;
	execClose(...args: Parameters<(typeof this.close)[0]["close"]>): Promise<void[]>;
}
