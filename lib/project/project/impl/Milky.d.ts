import { Impl } from "#protocol/milky";
import * as Common from "../common.js";
export interface IConfig extends Common.IConfig {
  server: string | URL;
}
export declare class Project extends Common.Project {
  config: IConfig;
  impl: Impl;
  constructor(config: IConfig);
  static createConfig(name: IConfig["name"]): Promise<IConfig>;
  verifyConfig(): void;
  start(): Promise<void> | Promise<Event>;
  stop(): Promise<void | Event>;
}
