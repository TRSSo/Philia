import type * as Common from "../project/common.js"
import * as Philia from "../project/Philia.js"
import API from "./api.js"
import type * as type from "./type.js"

export default class Manager {
  config: type.ManagerConfig = {
    start_project: true,
    philia: {
      name: "Philia",
      type: "Socket",
      role: "Server",
      path: "Manager",
    },
  }
  philia: Philia.Project
  handle = new API(this)

  constructor(
    public project: Common.Project,
    config: Common.IConfig,
  ) {
    Object.assign(this.config, config.manager)
    this.philia = new Philia.Project(
      this.config.philia,
      this.handle as unknown as ConstructorParameters<typeof Philia.Project>[1],
    )
  }

  start() {
    const ret: Promise<unknown>[] = [this.philia.start()]
    if (this.config.start_project) ret.push(this.project.start())
    return Promise.all(ret)
  }

  stop() {
    return Promise.all([this.project.stop(), this.philia.stop()])
  }
}
