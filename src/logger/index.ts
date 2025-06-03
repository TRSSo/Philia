import log4js from "log4js"
import { Loging } from "#util"
log4js.configure({
  appenders: {
    console: {
      type: "console",
      layout: {
        type: "pattern",
        pattern: "%[[%d{hh:mm:ss.SSS}][%4.4p]%]%m",
      },
    },
  },
  categories: {
    default: { appenders: ["console"], level: "trace" },
  },
})

const logger = log4js.getLogger()
const _log = logger._log.bind(logger)
logger._log = (level, args) =>
  _log(
    level,
    args.map((i: any) => Loging(i, { string: true })),
  )
export default logger
