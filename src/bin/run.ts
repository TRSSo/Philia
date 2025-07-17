import fs from "node:fs/promises"
import YAML from "yaml"
import { Server } from "#project/manager"

if (process.argv[2]) process.chdir(process.argv[2])
const config = YAML.parse(await fs.readFile("config.yml", "utf8"))
const project = new (await import(`#project/project/${config.name}.js`)).Project(config)
const manager = new Server(project, config)
manager.start()
