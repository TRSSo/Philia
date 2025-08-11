import type EventEmitter from "node:events"
import fs from "node:fs/promises"
import path from "node:path"
import util from "node:util"
import { Chalk } from "chalk"
export const chalk = new Chalk({ level: 3 })

/**
 * 生成错误对象并赋予一些参数
 * @param msg 错误信息
 * @param obj 错误参数
 * @returns 错误对象
 */
export function makeError(msg: string, ...obj: object[]) {
  return Object.assign(Error(msg), ...obj)
}

/**
 * 按数组1的顺序查找数组2中存在的第一个值
 * @param array1 数组1
 * @param array2 数组2
 * @returns (数组1 ∩ 数组2)[0]
 */
export function findArrays<T>(array1: Array<T>, array2: Array<T>): T | undefined {
  return array1.find(i => array2.includes(i))
}

/**
 * 把对象转成字符串，处理对象不存在 toString 方法的情况
 * @param data 对象
 * @returns 字符串
 */
export function StringOrNull(data: object): string {
  if (typeof data === "object" && typeof data.toString !== "function") return "[object null]"
  return String(data)
}

/**
 * 传入二进制数据，如果符合 UTF-8 编码，转成字符串，否则转成 base64 或不转
 * @param data 二进制数据
 * @param base64 是否转成 base64
 * @returns 字符串
 */
export function StringOrBuffer(data: Buffer, base64: true): string
export function StringOrBuffer(data: Buffer, base64?: false): string | Buffer
export function StringOrBuffer(data: Buffer, base64 = false): string | Buffer {
  const string = String(data)
  return string.includes("\ufffd")
    ? base64
      ? `base64://${data.toString("base64")}`
      : data
    : string
}

export function getCircularReplacer() {
  const ancestors: any[] = []
  return function (this: any, _key: string, value: any): any {
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
 * 把任意类型转成字符串/JSON
 * @param data 任意类型
 * @param space JSON.stringify 的第三个参数
 * @returns 字符串
 */
export function toJSON(data: any, space?: Parameters<typeof JSON.stringify>[2]): string {
  switch (typeof data) {
    case "string":
      return data
    case "function":
      return String(data)
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

/**
 *  base64 http file 转为 Buffer
 * @param data 数据
 * @param opts.http 是否返回 http
 * @param opts.path 是否返回文件路径
 */
export async function toBuffer(
  data: any,
  opts: { http?: boolean; path?: boolean } & Parameters<typeof fetch>[1] = {},
): Promise<Buffer | string> {
  if (Buffer.isBuffer(data)) return data
  data = String(data)
  if (data.startsWith("base64://")) {
    data = Buffer.from(data.replace("base64://", ""), "base64")
  } else if (data.match(/^https?:\/\//)) {
    if (opts.http) return data
    data = Buffer.from(await (await fetch(data, opts)).arrayBuffer())
  } else {
    const file = data.replace(/^file:\/\//, "")
    if (await fs.stat(file).catch(() => false)) {
      if (opts.path) return `file://${path.resolve(file)}`
      return fs.readFile(file)
    }
  }
  throw makeError("数据转换失败", { data })
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
export function promiseEvent<T>(
  event: EventEmitter,
  resolve: string | symbol,
  reject?: string | symbol,
  timeout?: number,
) {
  const listener: ReturnType<typeof Promise.withResolvers<T>> & {
    timeout?: NodeJS.Timeout
  } = Promise.withResolvers<T>()
  event.once(resolve, listener.resolve)
  if (reject) event.once(reject, listener.reject)
  if (timeout)
    listener.timeout = setTimeout(
      () => listener.reject(makeError("等待事件超时", { event, resolve, reject, timeout })),
      timeout,
    )
  return listener.promise.finally(() => {
    event.off(resolve, listener.resolve)
    if (reject) event.off(reject, listener.reject)
    if (timeout) clearTimeout(listener.timeout)
  })
}

/** A是否为B的子集 */
export function isSubObj<T extends object>(A: Partial<T>, B: T, length = 1, equal = false) {
  if (length === 0) return false
  for (const i in A) {
    if (A[i] === undefined || A[i] === B[i]) continue
    if (typeof A[i] === "object" && A[i] !== null && typeof B[i] === "object" && B[i] !== null) {
      if (!(equal ? isEqualObj : isSubObj)(A[i], B[i], length - 1)) return false
    } else return false
  }
  return true
}

/** A是否等于B */
export function isEqualObj<T extends object>(A: T, B: T, length?: number) {
  if (Object.keys(A).length !== Object.keys(B).length) return false
  return isSubObj(A, B, length, true)
}

/** 匹配规则 */
export interface IModeMatch {
  /** 匹配模式
   * include: 目标在匹配列表
   * exclude: 目标不在匹配列表
   * regexp : 目标符合匹配列表正则表达式
   */
  mode: "include" | "exclude" | "regexp"
  /** 匹配列表 */
  list: string | string[]
}

/**
 * 模式匹配
 * @param rule 匹配规则
 * @param target 匹配目标
 * @returns 是否匹配
 */
export function modeMatch(rule: IModeMatch, target: string) {
  const list = Array.isArray(rule.list) ? rule.list : [rule.list]
  switch (rule.mode) {
    case "exclude":
      return !list.includes(target)
    case "regexp":
      return new RegExp(list.join("|")).test(target)
    default:
      return list.includes(target)
  }
}

/**
 * 获取日期
 * @returns YYYY-MM-DD
 */
export function getDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * 获取时间
 * @returns hh:mm:ss.SSS
 */
export function getTime(date = new Date()) {
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0")
  return `${hour}:${minute}:${second}.${milliseconds}`
}

/**
 * 获取日期时间
 * @returns YYYY-MM-DD hh:mm:ss.SSS
 */
export function getDateTime(date = new Date()) {
  return `${getDate(date)} ${getTime(date)}`
}

/**
 * 获取时间差
 * @param time1 开始时间
 * @param time2 结束时间
 * @returns 时间差（D天h时m分s秒SSS）
 */
export function getTimeDiff(time1: number, time2 = Date.now()) {
  let time = time2 - time1
  const ms = time % 1000
  time = Math.floor(time / 1000)
  const sec = time % 60
  time = Math.floor(time / 60)
  const min = time % 60
  time = Math.floor(time / 60)
  const hour = time % 24
  time = Math.floor(time / 24)

  let ret = ""
  if (time) ret += `${time}天`
  if (hour) ret += `${hour}时`
  if (min) ret += `${min}分`
  if (sec) ret += `${sec}秒`
  if (ms) ret += ms
  return ret || "0秒"
}

/** 获取代码根目录 */
export function getCodeDir() {
  return path.relative(process.cwd(), path.dirname(import.meta.dirname))
}

/** 获取项目根目录 */
export function getRootDir() {
  return path.relative(process.cwd(), path.dirname(path.dirname(import.meta.dirname)))
}
