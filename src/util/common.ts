import util from "node:util"
import { chalk } from "./logger.js"
import EventEmitter from "node:events"

/**
 * 生成错误对象并赋予一些参数
 * @param msg 错误信息
 * @param obj 错误参数
 * @returns 错误对象
 */
export function makeError(msg = "", obj = {}) {
  return Object.assign(Error(msg), obj)
}

/**
 * 按数组1的顺序查找数组2中存在的第一个值
 * @param array1 数组1
 * @param array2 数组2
 * @returns (数组1 ∩ 数组2)[0]
 */
export function findArrays<T>(array1: Array<T>, array2: Array<T>): T | void {
  return array1.find(i => array2.includes(i))
}

/**
 * 把对象转成字符串，处理对象不存在 toString 方法的情况
 * @param data 对象
 * @returns 字符串
 */
export function StringOrNull(data: object): string {
  if (typeof data === "object" && typeof data.toString !== "function") return "[object null]"
  return global.String(data)
}

/**
 * 传入二进制数据，如果符合 UTF-8 编码，转成字符串，否则转成 base64 或不转
 * @param data 二进制数据
 * @param base64 是否转成 base64
 * @returns 字符串
 */
export function StringOrBuffer(data: Buffer, base64 = false): string | Buffer {
  const string = StringOrNull(data)
  return string.includes("\ufffd")
    ? base64
      ? `base64://${data.toString("base64")}`
      : data
    : string
}

export function getCircularReplacer() {
  const ancestors: any[] = []
  return function (this: any, key: string, value: any): any {
    switch (typeof value) {
      case "function":
        return String(value)
      case "object":
        if (value === null) return null
        if (value instanceof Map || value instanceof Set) return Array.from(value)
        if (value instanceof Error) return value.stack
        if (value.type === "Buffer" && Array.isArray(value.data))
          try {
            return StringOrBuffer(Buffer.from(value), true)
          } catch {}
        break
      default:
        return value
    }
    while (ancestors.length > 0 && ancestors.at(-1) !== this) ancestors.pop()
    if (ancestors.includes(value)) return `[Circular ${StringOrNull(value)}]`
    ancestors.push(value)
    return value
  }
}

/**
 * 把任意类型转成字符串
 * @param data 任意类型
 * @param space JSON.stringify 的第三个参数
 * @returns 字符串
 */
export function String(data: any, space?: number | string): string {
  switch (typeof data) {
    case "string":
      return data
    case "function":
      return data.toString()
    case "object":
      if (data instanceof Error) return data.stack || StringOrNull(data)
      if (Buffer.isBuffer(data)) return StringOrBuffer(data, true) as string
  }

  try {
    return JSON.stringify(data, getCircularReplacer(), space) || StringOrNull(data)
  } catch {
    return StringOrNull(data)
  }
}

interface InspectOptions extends util.InspectOptions {
  /** 字符串是否直接返回 */
  string?: boolean
  /** 限制长度 */
  length?: number
}

/**
 * 把任意类型转成终端彩色编码字符串
 * @param data 任意类型
 * @param opts { @link util.InspectOptions } + { @link InspectOptions }
 * @returns 终端彩色编码字符串
 */
export function Loging(data: any, opts: InspectOptions = {}): string {
  if (opts.string && typeof data === "string") {
  } else if (!opts) data = StringOrNull(data)
  else
    data = util.inspect(data, {
      depth: 5,
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
    data = `${data.slice(0, length)}${chalk.gray(`... ${data.length - length} more characters`)}`
  return data
}

/**
 * 取任意类型的属性
 * @param data 任意类型
 * @param props 属性列表
 * @returns 属性列表
 */
export function getAllProps(data: any, props: Set<string> = new Set()): Set<string> {
  if ([Object.prototype, undefined, null].includes(data)) return props
  for (const i of Object.getOwnPropertyNames(data)) props.add(i)
  return getAllProps(Object.getPrototypeOf(data), props)
}

/**
 * 事件转 Promise
 * @param event 事件触发器
 * @param resolve 兑现事件名
 * @param reject 拒绝事件名
 * @param timeout 超时时间
 * @returns Promise
 */
export function promiseEvent(
  event: EventEmitter,
  resolve: string | symbol,
  reject?: string | symbol,
  timeout?: number,
) {
  let listener: {
    resolve: Parameters<ConstructorParameters<typeof Promise>[0]>[0]
    reject: Parameters<ConstructorParameters<typeof Promise>[0]>[1]
    timeout?: NodeJS.Timeout
  }
  return new Promise((...args) => {
    listener = { resolve: args[0], reject: args[1] }
    event.once(resolve, listener.resolve)
    if (reject) event.once(reject, listener.reject)
    if (timeout)
      listener.timeout = setTimeout(
        () => listener.reject(makeError("等待事件超时", { event, resolve, reject, timeout })),
        timeout,
      )
  }).finally(() => {
    event.off(resolve, listener.resolve)
    if (reject) event.off(reject, listener.reject)
    if (timeout) clearTimeout(listener.timeout)
  })
}
