import fs from "node:fs/promises"
import Path from "node:path"
import * as inquirer from "@inquirer/prompts"
import YAML from "yaml"
import * as Philia from "#project/project/philia.js"
import Tui from "#protocol/tty"

const path = Path.join("Project", "TTY")
await fs.mkdir(path, { recursive: true })
process.chdir(path)
let config: Philia.IConfig = YAML.parse(await fs.readFile("config.yml", "utf8").catch(() => ""))
if (!config) {
  config = await Philia.Project.createConfig("App")
  if (await inquirer.confirm({ message: "是否保存配置?" }))
    await fs.writeFile("config.yml", YAML.stringify(config))
}
new Tui(config).main()
