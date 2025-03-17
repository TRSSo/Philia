import * as inquirer from "@inquirer/prompts"
import Client from "./client.js"
import { ulid } from "ulid"
import Server from "../../socket/server.js"
import { logger } from "../../util/logger.js"

export class Tui {
  logger = logger
  client = {} as Client
  server?: Server

  constructor() {
    this.main()
  }

  async main() {
    while (true) try {
      if (this.client.socket?.open)
        await this.start()
      else
        await this.connect()
      await inquirer.input({ message: "" })
    } catch (err) {
      this.logger.error("错误", err)
    }
  }

  async connect() {
    if (this.server) {
      this.logger.info("等待客户端连接中", this.server.path)
      return new Promise(resolve => (this.server as Server).socket.once("connected", resolve))
    }

    switch (await inquirer.select({
      message: "欢迎使用 TRSS Bot TTY",
      choices: [
        {
          name: "客户端",
          value: "client",
          description: "连接到服务端",
        },
        {
          name: "服务端",
          value: "server",
          description: "启动服务端",
        },
        {
          name: "退出",
          value: "exit",
          description: "退出",
        },
      ],
    })) {
      case "client": {
        const answer = await inquirer.input({ message: "请输入服务端地址" })
        if (!answer) break
        this.client = new Client(answer)
        return this.client.connect()
      } case "server": {
        const answer = await inquirer.input({ message: "请输入服务端地址" })
        if (!answer) break
        this.server = new Server(undefined, { limit: 1, path: answer })
        this.server.socket.on("connected", client => this.client = new Client(client))
        return this.server.listen()
      } case "exit":
        process.exit()
    }
  }

  async start() {
    switch (await inquirer.select({
      message: "TRSS Bot TTY",
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
    })) {
      case "sendMsg":
        return this.sendMsg()
      case "exit":
        process.exit()
    }
  }

  async sendMsg() {
    const answer = await inquirer.input({ message: "请输入消息" })
    return this.client.request("message.user", {
      id: ulid(),
      type: "message",
      scene: "user",
      user: this.client.platform,
      message: [{ type: "text", data: answer }],
      summary: answer,
    })
  }
}