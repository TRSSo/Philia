import type * as Common from "./common.js";
export type type = {
	[key: string]: () => Promise<{
		Project: (new (...args: ConstructorParameters<typeof Common.Project>) => Common.Project) & typeof Common.Project;
	}>;
};
export declare const impl: type;
export declare const app: type;
