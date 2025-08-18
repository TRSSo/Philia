import * as inquirer from "@inquirer/prompts"

export async function sendEnter(message = "按回车键继续") {
  if (!(await inquirer.confirm({ message }))) process.exit()
}

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

export type inquirerSelect<T> = Exclude<
  Parameters<typeof inquirer.select<T>>[0]["choices"][0],
  string
>[]

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
