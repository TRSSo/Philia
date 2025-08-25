import { type Logger } from "#logger";
import { Manager, type type as ManagerType } from "../manager/index.js";
import * as Philia from "./philia.js";
export interface IConfig {
  /** 项目名 */
  name: string;
  /** 项目 Philia 端配置 */
  philia: Philia.IConfig;
  /** 日志配置 */
  logger?: ManagerType.LoggerConfig;
  /** 项目管理器配置 */
  manager?: ManagerType.ManagerConfig;
}
export declare abstract class Project {
  config: IConfig;
  logger: Logger;
  manager: Manager;
  constructor(config: IConfig);
  verifyPhiliaConfig(): void;
  /** 创建配置文件，静态方法 */
  static createConfig(name: IConfig["name"]): Promise<IConfig>;
  /** 验证配置 */
  abstract verifyConfig(): void;
  /** 启动项目 */
  abstract start(): Promise<unknown>;
  /** 停止项目 */
  abstract stop(): Promise<unknown>;
}
