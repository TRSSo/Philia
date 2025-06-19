import * as inquirer from "@inquirer/prompts"
import Client from "./client.js"
import { ulid } from "ulid"
import logger from "#logger"
import { Philia } from "#project/project"
import * as Type from "#protocol/type"
import { continueTui } from "#util/tui.js"
import path from "node:path"
import fs from "node:fs/promises"

export class Tui {
  logger = logger
  path = path.join("project", "tty")
  client!: Client

  async main() {
    await fs.mkdir(this.path, { recursive: true })
    process.chdir(this.path)
    this.client = new Client(await Philia.Project.createConfig())
    await this.client.start()
    while (true)
      try {
        if (this.client.philia.clients.size === 0)
          this.logger.info("等待客户端连接中", this.client.philia.config.path)
        else await this.send()
        await continueTui()
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
    const answer = await inquirer.input({ message: "请输入消息" })
    const event: Type.Event.Message = {
      id: ulid(),
      type: "message",
      time: Date.now() / 1000,
      scene: "user",
      user: this.client.self,
      message: [{ type: "text", data: answer }],
      summary: answer,
    }
    this.client.event_message_map.set(event.id, event)
    return this.client.event_handle.handle(event)
  }
}
