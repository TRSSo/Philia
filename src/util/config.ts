import fs from "node:fs/promises"
import YAML from "yaml"
const map = new Map()

/**
 * 创建配置文件
 * @param name 配置文件名
 * @param config 配置文件默认值
 * @param keep 保持不变的配置
 * @param opts.replacer 配置文本替换函数
 */
export default async function makeConfig<T extends object>(
  name: string,
  config: T,
  keep: Partial<T> = {},
  opts: { replacer?: (data: string) => string | Promise<string> } = {},
): Promise<{ config: T; configSave: () => Promise<void> }> {
  if (map.has(name)) return map.get(name)

  const configFile = `${name}.yaml`
  const configSave =
    typeof opts.replacer === "function"
      ? async () =>
          fs.writeFile(
            configFile,
            await (opts.replacer as typeof opts.replacer)(YAML.stringify(config)),
            "utf8",
          )
      : () => fs.writeFile(configFile, YAML.stringify(config), "utf8")

  const ret = { config, configSave }
  map.set(name, ret)

  let configData
  try {
    configData = YAML.parse(await fs.readFile(configFile, "utf8"))
    Object.assign(config, configData)
  } catch {}
  Object.assign(config, keep)

  if (YAML.stringify(config) != YAML.stringify(configData)) await configSave()
  return ret
}
