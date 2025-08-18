import fs from "node:fs/promises"
import Path from "node:path"
import { getLogger } from "#logger"
import Tui from "#protocol/tty"

const path = Path.join("Project", "TTY")
await fs.mkdir(path, { recursive: true })
process.chdir(path)
new Tui(getLogger("TTY")).main()
