import fs from "node:fs/promises"
import Path from "node:path"
import { getRootDir } from "#util"
import type * as Common from "./common.js"

export type type = {
  [key: string]: () => Promise<{
    Project: (new (
      ...args: ConstructorParameters<typeof Common.Project>
    ) => Common.Project) &
      typeof Common.Project
  }>
}

export const impl = {
  Milky: () => import("./impl/Milky.js"),
  OneBotv11: () => import("./impl/OneBotv11.js"),
} as unknown as type

export const app = {} as type

const path = Path.join(getRootDir(), "plugin")
for (const i of await fs.readdir(path, { withFileTypes: true }).catch(() => [])) {
  console.log(i)
  if (!i.isDirectory()) continue
  for (const j of await fs
    .readdir(Path.join(path, i.name, "lib"), { withFileTypes: true })
    .catch(() => [])) {
    if (!j.isFile()) continue
    if (j.name === "impl.js") impl[i.name] = () => import(`#root/plugin/${i.name}/lib/impl.js`)
    if (j.name === "app.js") app[i.name] = () => import(`#root/plugin/${i.name}/lib/app.js`)
  }
}
