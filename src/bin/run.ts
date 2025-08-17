import fs from "node:fs/promises"
import path from "node:path"
import YAML from "yaml"
import * as Project from "#project/project"
import type * as Common from "#project/project/common.js"

const dir = process.argv[process.argv[2] === "run" ? 3 : 2]
if (dir) process.chdir(dir)

const type = path.basename(path.dirname(process.cwd())).toLowerCase() as "impl" | "app"
const config: Common.IConfig = YAML.parse(await fs.readFile("config.yml", "utf8"))
const project = new (await Project[type][config.name]()).Project(config)
project.manager.start()
