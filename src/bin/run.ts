import fs from "node:fs/promises"
import YAML from "yaml"
if (process.argv[2]) process.chdir(process.argv[2])
const config = YAML.parse(await fs.readFile("config.yml", "utf8"))
const project = new (await import(`../project/project/${config.name}.js`)).Project(config)
project.start()
