import type { Loging } from "#util";
import type * as Philia from "../project/philia.js";
export declare enum LoggerLevel {
  ALL = 0,
  TRACE = 1,
  DEBUG = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5,
  FATAL = 6,
  MARK = 7,
  OFF = 8
}
export type LoggerLevelStr = keyof typeof LoggerLevel;
export declare const LoggerLevelColor: {
  TRACE: "blue";
  DEBUG: "cyan";
  INFO: "green";
  WARN: "yellow";
  ERROR: "red";
  FATAL: "magenta";
  MARK: "grey";
};
/** 日志事件 */
export interface LoggerEvent {
  /** 日志名 */
  name: string;
  /** 时间戳（毫秒） */
  time: number;
  /** 日志等级 */
  level: LoggerLevel;
  /** 日志数据 */
  data: string[];
}
/** 日志设置 */
export interface LoggerConfig {
  /** 日志等级 */
  level?: LoggerLevelStr;
  /** 日志格式化参数 */
  inspect?: Parameters<typeof Loging>[1];
}
export interface ManagerConfig {
  logger: LoggerConfig & {
    max_lines: number;
  };
  /** 进程管理监听端口 */
  philia: Philia.IConfig & {
    role: "Server";
  };
}
