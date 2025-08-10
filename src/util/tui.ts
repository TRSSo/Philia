import * as inquirer from "@inquirer/prompts"

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

export function selectArray<T>(
  value: T[],
  opts?: { name?: string; desc?: string }[],
): Exclude<Parameters<typeof inquirer.select<T>>[0]["choices"][0], string>[] {
  return value.map(
    opts
      ? (value, i) => ({
          name: `${i + 1}. ${opts[i].name ?? value}`,
          value,
          description: opts[i].desc,
        })
      : (value, i) => ({ name: `${i + 1}. ${value}`, value }),
  )
}
