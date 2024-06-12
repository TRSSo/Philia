import util from "node:util"
import { chalk } from "./logger.js"

export function StringOrNull(data: object): string {
  if (typeof data === "object" && typeof data.toString !== "function")
    return "[object null]"
  return global.String(data)
}

export function StringOrBuffer(data: any, base64 = false): string | Buffer {
  const string = StringOrNull(data)
  return string.includes("\ufffd") ? (base64 ? `base64://${data.toString("base64")}` : data) : string
}

export function getCircularReplacer() {
  const ancestors: any[] = []
  return function (this: any, key: string, value: any): any {
    switch (typeof value) {
      case "function":
        return String(value)
      case "object":
        if (value === null)
          return null
        if (value instanceof Map || value instanceof Set)
          return Array.from(value)
        if (value instanceof Error)
          return value.stack
        if (value.type === "Buffer" && Array.isArray(value.data)) try {
          return StringOrBuffer(Buffer.from(value), true)
        } catch {}
        break
      default:
        return value
    }
    while (ancestors.length > 0 && ancestors.at(-1) !== this)
      ancestors.pop()
    if (ancestors.includes(value))
      return `[Circular ${StringOrNull(value)}]`
    ancestors.push(value)
    return value
  }
}

export function String(data: any, opts?: number | string): string {
  switch (typeof data) {
    case "string":
      return data
    case "function":
      return data.toString()
    case "object":
      if (data instanceof Error)
        return data.stack || StringOrNull(data)
      if (Buffer.isBuffer(data))
        return StringOrBuffer(data, true) as string
  }

  try {
    return JSON.stringify(data, getCircularReplacer(), opts) || StringOrNull(data)
  } catch (err) {
    return StringOrNull(data)
  }
}

interface InspectOptions extends util.InspectOptions {
  length?: number
}

export function Loging(data: any, opts: InspectOptions = {}): string {
  if (typeof data === "string") {}
  else if (!opts)
    data = StringOrNull(data)
  else data = util.inspect(data, {
    depth: 10,
    colors: true,
    showHidden: true,
    showProxy: true,
    getters: true,
    breakLength: 100,
    maxArrayLength: 100,
    maxStringLength: 1000,
    ...opts,
  })

  const length = opts.length || 10000
  if (data.length > length)
    data = `${data.slice(0, length)}${chalk.gray(`... ${data.length-length} more characters`)}`
  return data
}