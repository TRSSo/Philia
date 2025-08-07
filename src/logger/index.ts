import log4js from "log4js"
import type { LoggerLevelStr } from "#project/manager/type.js"
import { chalk, Loging } from "#util"

type hookFn = (name: string, level: log4js.Level, data: string[]) => void
let hook: hookFn | undefined
export type Logger = log4js.Logger & {
  setHook(fn?: hookFn): void
  inspect: Parameters<typeof Loging>[1]
}
const _log = Symbol("_log")
const logger_map = new Map<string, Logger & { [_log]: log4js.Logger["_log"] }>()

export const log4js_config: log4js.Configuration = {
  appenders: {
    stdout: {
      type: "stdout",
      layout: {
        type: "pattern",
        pattern: "%[[%d{hh:mm:ss.SSS}][%4.4p]%]%c %m",
      },
    },
    dateFile_default: {
      type: "dateFile",
      filename: `log/default.INFO`,
      pattern: "yyyy-MM-dd.log",
      numBackups: 180,
      alwaysIncludePattern: true,
      layout: {
        type: "pattern",
        pattern: "%[[%d{hh:mm:ss.SSS}][%4.4p]%] %m",
      },
      compress: true,
    },
  },
  categories: {
    default: { appenders: ["stdout", "dateFile_default"], level: "ALL" },
  },
}

export function makeLogger(
  name = "default",
  level: LoggerLevelStr = "INFO",
  inspect: Parameters<typeof Loging>[1] = { string: true },
  category_length = 10,
): Logger {
  const level_num = log4js.levels.getLevel(level).level
  let logger = logger_map.get(name)!
  if (!logger) {
    logger = Object.create(null)
    logger._log = function (level, args) {
      args = args.map((i: any) => Loging(i, this.inspect))
      hook?.(name, level, args)
      return level.level >= level_num && this[_log](level, args)
    }
    logger.setHook =
      name === "default"
        ? fn => (hook = fn)
        : function (this: typeof logger, fn) {
            this._log = fn
              ? function (this: typeof logger, level, args) {
                  args = args.map((i: any) => Loging(i, this.inspect))
                  fn(name, level, args)
                  return level.level >= level_num && this[_log](level, args)
                }
              : function (this: typeof logger, level, args) {
                  return (
                    level.level >= level_num &&
                    this[_log](
                      level,
                      args.map((i: any) => Loging(i, this.inspect)),
                    )
                  )
                }
          }
    logger_map.set(name, logger)
  }

  const appender = `dateFile_${name}`
  log4js_config.appenders[appender] = {
    ...log4js_config.appenders.dateFile_default,
    filename: `log/${name}-${level}`,
  }

  const length = (category_length - name.length) / 2
  if (length > 0) name = `${" ".repeat(Math.ceil(length))}${name}${" ".repeat(Math.floor(length))}`
  else if (length < 0) name = `${name.slice(0, category_length - 1)}.`
  name = chalk.blue(`[${name}]`)

  log4js_config.categories[name] = { appenders: ["stdout", appender], level: "ALL" }
  log4js.configure(log4js_config)

  Object.setPrototypeOf(logger, log4js.getLogger(name))
  logger[_log] = Object.getPrototypeOf(logger)._log
  logger.inspect = inspect
  return logger
}

export function getLogger(name = "default"): Logger {
  return logger_map.get(name) ?? makeLogger(name)
}
