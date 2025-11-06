import type { type as SocketType } from "#connect/common";
import type { Event } from "#protocol/type";
import type { Client } from "../app.js";
export default class Handle implements SocketType.HandleMap {
	client: Client;
	[key: string]: SocketType.HandleMap[string];
	static event: ({
		handle: string;
		type: "message";
		scene: "user";
	} | {
		handle: string;
		type: "message";
		scene: "group";
	})[];
	constructor(client: Client);
	"message.user"(raw: Event.UserMessage): Promise<void>;
	"message.group"(raw: Event.GroupMessage): Promise<void>;
}
