import fs from "node:fs/promises"
import path from "node:path"
import * as inquirer from "@inquirer/prompts"
import { ulid } from "ulid"
import type { Logger } from "#logger"
import * as Philia from "#project/project/philia.js"
import type * as Type from "#protocol/type"
import { sendInfo } from "#util/tui.js"
import Impl from "./impl.js"

export class Tui {
  path = path.join("project", "tty")
  impl!: Impl
  constructor(public logger: Logger) {}

  async main() {
    await fs.mkdir(this.path, { recursive: true })
    process.chdir(this.path)
    this.impl = new Impl(this.logger, await Philia.Project.createConfig())
    await this.impl.start()
    for (;;)
      try {
        if (this.impl.philia.clients.size === 0)
          this.logger.info("等待客户端连接中", this.impl.philia.config.path)
        else await this.send()
        await sendInfo()
      } catch (err) {
        this.logger.error("错误", err)
      }
  }

  async send() {
    switch (
      await inquirer.select({
        message: "Philia TTY",
        choices: [
          {
            name: "发消息",
            value: "sendMsg",
            description: "发消息",
          },
          {
            name: "退出",
            value: "exit",
            description: "退出",
          },
        ],
      })
    ) {
      case "sendMsg":
        return this.sendMsg()
      case "exit":
        process.exit()
    }
  }

  async sendMsg() {
    const answer = await inquirer.input({ message: "请输入消息:" })
    const event: Type.Event.Message = {
      id: ulid(),
      type: "message",
      time: Date.now() / 1000,
      scene: "user",
      user: this.impl.self,
      message: [{ type: "text", data: answer }],
      summary: answer,
    }
    this.impl.event_message_map.set(event.id, event)
    return this.impl.event_handle.handle(event)
  }
}
