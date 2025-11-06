import type { Client } from "#connect/common";
import * as Common from "#project/project/common.js";
import * as Philia from "#project/project/philia.js";
import type { BaseContext } from "./context.js";
import { EventHandle } from "./event.js";
import PluginManager from "./manager.js";
export interface IConfig extends Common.IConfig {
	/** 命令插件配置 */
	command: {
		/** 命令前缀 */
		prefix: string;
		/** 命令参数分隔符 */
		split: string;
	};
}
export declare class Project extends Common.Project {
	config: IConfig;
	philia: Philia.Project;
	plugin: PluginManager;
	event: EventHandle;
	ctx_map: Map<Client, BaseContext>;
	/**
	 * 创建应用端插件项目
	 * @param config 项目配置
	 * @param path 插件文件夹
	 */
	constructor(config: IConfig, path: string | string[]);
	static createConfig(name: IConfig["name"]): Promise<IConfig>;
	verifyConfig(): void;
	start(): Promise<void>;
	stop(): Promise<void>;
	connect(client: Client): Promise<void>;
	close(client: Client): void | Promise<void[]>;
}
