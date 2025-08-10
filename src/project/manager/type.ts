import type { Loging } from "#util"
import type * as Philia from "../project/philia.js"

export enum LoggerLevel {
  ALL,
  TRACE,
  DEBUG,
  INFO,
  WARN,
  ERROR,
  FATAL,
  MARK,
  OFF,
}
export type LoggerLevelStr = keyof typeof LoggerLevel
export const LoggerLevelColor = {
  TRACE: "blue" as const,
  DEBUG: "cyan" as const,
  INFO: "green" as const,
  WARN: "yellow" as const,
  ERROR: "red" as const,
  FATAL: "magenta" as const,
  MARK: "grey" as const,
}

/** 日志事件 */
export interface LoggerEvent {
  /** 日志名 */
  name: string
  /** 时间戳（毫秒） */
  time: number
  /** 日志等级 */
  level: LoggerLevel
  /** 日志数据 */
  data: string[]
}

/** 日志设置 */
export interface LoggerConfig {
  /** 日志等级 */
  level?: LoggerLevelStr
  /** 日志格式化参数 */
  inspect?: Parameters<typeof Loging>[1]
}

export interface ManagerConfig {
  logger: LoggerConfig & { max_lines: number }
  /** 进程管理监听端口 */
  philia: Philia.IConfig & { role: "Server" }
}
