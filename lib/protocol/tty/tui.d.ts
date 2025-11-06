import { type Logger } from "#logger";
import type * as Philia from "#project/project/philia.js";
import Impl from "./impl.js";
export declare class Tui {
	config: Philia.IConfig;
	impl: Impl;
	logger: Logger;
	constructor(config: Philia.IConfig);
	main(): Promise<void>;
	send(): Promise<void>;
	sendMsg(): Promise<void>;
	setting(): Promise<void>;
}
