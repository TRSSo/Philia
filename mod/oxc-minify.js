import fs from "node:fs/promises"
import Path from "node:path"
import { minify } from "oxc-minify"

function dealJS(dir) {
  return fs.readdir(dir, { withFileTypes: true }).then(i =>
    i.map(file => {
      if (file.isDirectory()) return dealJS(Path.join(dir, file.name))
      else if (Path.extname(file.name).toLowerCase() === ".js") {
        const path = Path.join(dir, file.name)
        return fs
          .readFile(path, "utf8")
          .then(i => fs.writeFile(path, minify(file.name, i).code, "utf8"))
      }
    }),
  )
}

process.argv.slice(2).map(dealJS)
