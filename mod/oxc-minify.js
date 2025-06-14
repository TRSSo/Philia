import { minify } from "oxc-minify"
import fs from "node:fs/promises"
import Path from "node:path"

async function dealJS(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true })
  return Promise.all(
    files.map(async file => {
      const path = Path.join(dir, file.name)
      if (file.isDirectory()) return dealJS(path)
      else if (Path.extname(file.name).toLowerCase() === ".js")
        return fs.writeFile(path, minify(file.name, await fs.readFile(path, "utf8")).code, "utf8")
    }),
  )
}

process.argv.slice(2).map(dealJS)
