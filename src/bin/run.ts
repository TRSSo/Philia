import fs from "node:fs/promises"
import YAML from "yaml"
import type * as Project from "#project/project"

type ProjectType =
  | (typeof Project.server)[keyof typeof Project.server]
  | (typeof Project.client)[keyof typeof Project.client]

if (process.argv[2]) process.chdir(process.argv[2])
const config = YAML.parse(await fs.readFile("config.yml", "utf8"))
const project = new ((await import(`#project/project/${config.name}.js`)) as ProjectType).Project(
  config,
)
project.manager.start()
