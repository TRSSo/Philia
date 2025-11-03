import { Impl } from "#protocol/onebot/v11";
import * as Common from "../common.js";
export interface IConfig extends Common.IConfig {
  server: {
    type: "ws" | "ws-reverse";
    path: string | number;
  };
}
export declare class Project extends Common.Project {
  config: IConfig;
  server?: Impl.Server;
  client?: Impl.Client;
  static createConfig(name: IConfig["name"]): Promise<IConfig>;
  verifyConfig(): void;
  start(): Promise<unknown>;
  stop(): Promise<void | undefined>;
}
