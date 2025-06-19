import { Philia } from "#project/project"
import { Event } from "#protocol/common"
import * as Type from "#protocol/type"
import logger from "#logger"
import fs from "node:fs/promises"
import * as Convert from "./convert/index.js"

export default class Client {
  logger = logger
  handle = new Convert.API(this)
  philia: Philia.Project
  event_handle: Event.Handle

  path = process.cwd()
  self: Type.Contact.Self = { id: "tty", name: "终端" }
  user: Type.Contact.User = { id: "tty_user", name: "终端用户" }
  group: Type.Contact.Group = { id: "tty_group", name: "终端" }

  event_message_map = new Map<Type.Event.Message["id"], Type.Event.Message>()
  event_request_map = new Map<Type.Event.Request["id"], Type.Event.Request>()

  constructor(philia: Philia.IConfig) {
    this.philia = new Philia.Project(
      philia,
      this.handle as unknown as ConstructorParameters<typeof Philia.Project>[1],
    )
    this.event_handle = new Event.Handle(this.philia)
  }

  async start() {
    await Promise.all(["data", "temp"].map(i => fs.mkdir(i, { recursive: true })))
    return this.philia.start()
  }
}
