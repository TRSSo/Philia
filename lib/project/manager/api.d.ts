import type { Client } from "#connect/common";
import type Manager from "./manager.js";
export default function API(manager: Manager): {
	stop(): void;
	closeConsole(): void;
	getLog: (opts: {
		level: import("./type.js").LoggerLevel;
		time?: number;
		lines?: number;
	}) => import("./type.js").LoggerEvent[];
	followLog: (data: Parameters<typeof manager.logger_manager.follow>[0]) => ReturnType<typeof manager.logger_manager.follow>;
	unfollowLog: (_: undefined, client: Client) => void;
	countNotice: () => number;
	listNotice: () => {
		id: string;
		name: string;
		desc: string;
		input: boolean;
	}[];
	handleNotice: ({ id, data }: {
		id: string;
		data?: string;
	}, client: Client) => string | void | Promise<string | void> | undefined;
};
