import child_process from "node:child_process"
import fss from "node:fs"
import stream from "node:stream/promises"
import zlib from "node:zlib"
import * as inquirer from "@inquirer/prompts"
import { promiseEvent } from "./index.js"

/** 不显示提示的读取输入 */
export function readLine() {
  process.stdin.resume()
  return promiseEvent<Buffer>(process.stdin, "data")
}

/** 显示一个按回车键继续的提示 */
export async function sendEnter(message = "按回车键继续") {
  if (!(await inquirer.confirm({ message }))) process.exit()
}

/** 显示一个返回和退出的选项框 */
export async function sendInfo(message = "请选择操作") {
  if (
    (await inquirer.select({
      message,
      choices: [
        { name: "🔙 返回", value: "back" },
        { name: "🔚 退出", value: "exit" },
      ],
    } as const)) === "exit"
  )
    process.exit()
}

/** 清除上一行 */
export function clearLine() {
  process.stdout.write("\x1b[1A\r\x1b[2K")
}

export type inquirerSelect<T> = Exclude<
  Parameters<typeof inquirer.select<T>>[0]["choices"][0],
  string
>[]

/**
 * 选项框标序
 * @param value 数值或[数值, 名称] 数组
 * @param desc 描述数组
 */
export function selectArray<T>(
  value: (readonly [T, string])[],
  desc?: string[],
): { name: string; value: T; description?: string }[]
export function selectArray<T>(
  value: T[],
  desc?: string[],
): { name: string; value: T; description?: string }[]
export function selectArray<T>(value: (readonly [T, string])[] | T[], desc?: string[]) {
  const pad = String(value.length + 1).length
  const fn = (Array.isArray(value[0])
    ? ([value, name]: [T, string], i: number) => ({
        name: `${String(i + 1).padStart(pad)}. ${name}`,
        value,
      })
    : (value: T, i: number) => ({
        name: `${String(i + 1).padStart(pad)}. ${value}`,
        value,
      })) as unknown as (v: (typeof value)[0], i: number) => ReturnType<typeof selectArray<T>>[0]
  return value.map(
    desc
      ? (value, i) => ({
          ...fn(value, i),
          description: desc[i],
        })
      : fn,
  )
}

/**
 * 读取zstd文本并使用less显示
 * @param file 文件路径
 */
export async function lessZstd(file: string) {
  const p = child_process.spawn("less", ["-RM"], { stdio: ["pipe", "inherit", "inherit"] })
  try {
    process.stdin.pipe(p.stdin)
    await Promise.all([
      stream.pipeline(fss.createReadStream(file), zlib.createZstdDecompress(), p.stdin),
      promiseEvent(p, "close", "error"),
    ])
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      await stream.pipeline(
        fss.createReadStream(file),
        zlib.createZstdDecompress(),
        process.stdout,
        { end: false },
      )
      await sendInfo()
    }
  } finally {
    p.kill()
  }
}

/**
 * 读取文本并使用less显示
 * @param file 文件路径
 * @param follow 是否跟踪更新
 */
export async function less(file: string, follow: boolean) {
  const p = child_process.spawn("less", [`-RM${follow ? "+F" : ""}`, file], { stdio: "inherit" })
  try {
    await promiseEvent(p, "close", "error")
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      await stream.pipeline(fss.createReadStream(file), process.stdout, { end: false })
      await sendInfo()
    }
  } finally {
    p.kill()
  }
}
