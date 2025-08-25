import log4js from "log4js";
import type { LoggerLevelStr } from "#project/manager/type.js";
import { Loging } from "#util";
type hookFn = (name: string, level: log4js.Level, data: string[]) => void;
export type Logger = log4js.Logger & {
  setHook(fn?: hookFn): void;
  inspect: Parameters<typeof Loging>[1];
};
export declare const log4js_config: log4js.Configuration;
export declare function makeLogger(name?: string, level?: LoggerLevelStr, inspect?: Parameters<typeof Loging>[1], category_length?: number): Logger;
export declare function getLogger(name?: string): Logger;
export declare function closeStdout(): void;
export {};
