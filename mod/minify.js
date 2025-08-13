import fs from "node:fs/promises"
import Path from "node:path"
import { minify } from "oxc-minify"
const indent = /^(( {4})+)/gm
async function handle(dir) {
  return (await fs.readdir(dir, { withFileTypes: true })).map(async file => {
    if (file.isDirectory()) return handle(Path.join(dir, file.name))
    const ext = Path.extname(file.name).toLowerCase(),
      path = Path.join(dir, file.name)
    let content = await fs.readFile(path, "utf8")
    switch (ext) {
      case ".js":
        content = minify(file.name, content).code
        break
      case ".ts":
        content = content.replace(indent, i => " ".repeat(i.length / 2))
        break
      default:
        return
    }
    return fs.writeFile(path, content, "utf8")
  })
}
process.argv.slice(2).map(handle)
