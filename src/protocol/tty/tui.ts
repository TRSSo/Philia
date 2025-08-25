import fs from "node:fs/promises"
import * as inquirer from "@inquirer/prompts"
import { ulid } from "ulid"
import YAML from "yaml"
import { getLogger, type Logger } from "#logger"
import type * as Philia from "#project/project/philia.js"
import type * as Type from "#protocol/type"
import { clearLine, readLine } from "#util/tui.js"
import Impl from "./impl.js"

process.on("SIGINT", async () => {
  await fs.rm("config.yml", { force: true }).catch(() => {})
  process.exit()
})

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
        else if (this.impl.philia.clients.values().next().value!.open === false)
          this.logger.info("等待连接到服务端", this.impl.philia.config.path)
        else await this.send()
        await readLine()
        clearLine()
      } catch (err) {
        this.logger.error("错误", err)
      }
  }

  async send() {
    const choose = await inquirer.select({
      message: "Philia TTY",
      choices: [
        { name: "💬 发消息", value: "sendMsg" },
        { name: "⚙️ 设置", value: "setting" },
        { name: "🔚 退出", value: "exit" },
      ],
    } as const)
    if (choose === "exit") process.exit()
    return this[choose]()
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
    this.impl.event_handle.handle(event)
  }

  async setting() {
    for (;;) {
      switch (
        await inquirer.select({
          message: "请选择操作",
          choices: [
            { name: "💾 保存配置", value: "save" },
            ...(await fs
              .stat("config.yml")
              .then(() => [{ name: "🗑️ 删除配置", value: "delete" }])
              .catch(() => [])),
            { name: "🔙 返回", value: "back" },
          ],
        } as const)
      ) {
        case "save":
          await fs.writeFile("config.yml", YAML.stringify(this.config))
          break
        case "delete":
          await fs.rm("config.yml", { force: true })
          break
        case "back":
          return
      }
    }
  }
}
