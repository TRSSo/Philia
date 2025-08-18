import * as inquirer from "@inquirer/prompts"
import { ulid } from "ulid"
import { getLogger, type Logger } from "#logger"
import type * as Philia from "#project/project/philia.js"
import type * as Type from "#protocol/type"
import { sendEnter } from "#util/tui.js"
import Impl from "./impl.js"

export class Tui {
  impl!: Impl
  logger: Logger
  constructor(public config: Philia.IConfig) {
    this.logger = getLogger("TTY")
  }

  async main() {
    this.impl = new Impl(this.logger, this.config)
    await this.impl.start()
    for (;;)
      try {
        if (this.impl.philia.clients.size === 0)
          this.logger.info("等待客户端连接中", this.impl.philia.config.path)
        else await this.send()
        await sendEnter("按回车键继续")
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
      time: Date.now() / 1e3,
      scene: "user",
      user: this.impl.self,
      message: [{ type: "text", data: answer }],
      summary: answer,
    }
    this.impl.event_message_map.set(event.id, event)
    return this.impl.event_handle.handle(event)
  }
}
