import fs from "node:fs/promises"
import path from "node:path"
import { ulid } from "ulid"
import type { Message } from "#protocol/type"
import { modeMatch } from "#util"
import type Client from "../client.js"

export default class PhiliaToTTY {
  message: (string | Message.MessageSegment)[]
  summary = ""

  constructor(
    public client: Client,
    message: Message.Message,
  ) {
    this.message = Array.isArray(message) ? message : [message]
  }

  async convert(message: Message.Message = this.message) {
    if (Array.isArray(message)) {
      for (const i of message) await this.convert(i)
    } else if (typeof message !== "object") this.text({ data: message } as Message.Text)
    else if (typeof this[(message as Message.MessageSegment).type] === "function")
      await this[(message as Message.MessageSegment).type](message as never)
    else this.text({ data: JSON.stringify(message) } as Message.Text)
    return this.summary
  }

  text(ms: Message.Text) {
    this.summary += ms.data
  }

  mention(ms: Message.Mention) {
    switch (ms.data) {
      case "user":
        this.summary += `[提及: ${ms.name ? `${ms.name}(${ms.id})` : ms.id}]`
        break
      case "all":
        this.summary += `[提及全体成员]`
        break
    }
  }

  reply(ms: Message.Reply) {
    this.summary += `[提及: ${ms.summary ? `${ms.summary}(${ms.data})` : ms.data}]`
  }

  button(ms: Message.Button) {
    this.summary += `[按钮: ${JSON.stringify(ms.data)}]`
  }

  extend(ms: Message.Extend) {
    this.summary += `[扩展消息 ${ms.extend}: ${JSON.stringify(ms.data)}`
  }

  async platform(ms: Message.Platform) {
    if (modeMatch(ms, "tty")) await this.convert(ms.data as Message.Message)
  }

  async file(ms: Message.AFile, name = "文件"): Promise<void> {
    if (!this.client.path) {
      this.summary += ms.summary ?? `[${name}: ${ms.name}]`
      return
    }
    try {
      switch (ms.data) {
        case "id":
          return this.file(await this.client.handle.getFile({ id: ms.id as string }))
        case "binary": {
          const save_path = path.join(this.client.path, "data", `${ulid()}-${ms.name || "Buffer"}`)
          if (typeof ms.binary === "string")
            ms.binary = Buffer.from(ms.binary.replace("base64://", ""), "base64")
          await fs.writeFile(save_path, ms.binary as Buffer)
          this.summary += `[${name}: ${save_path}]`
          return
        }
        case "url":
          return this.file(
            {
              name: ms.name || path.basename(new URL(ms.url as string).pathname),
              ms: "binary",
              binary: await (await fetch(ms.url as string)).arrayBuffer(),
            } as unknown as Message.File,
            name,
          )
        case "path": {
          const save_path = path.join(
            this.client.path,
            "data",
            `${ulid()}-${ms.name || path.basename(ms.path as string)}`,
          )
          await fs.copyFile(ms.path as string, save_path)
          this.summary += `[${name}: ${save_path}]`
          return
        }
      }
    } catch (err) {
      this.client.logger.error(`${name}保存错误`, ms, err)
    }
  }

  image(ms: Message.Image) {
    return this.file(ms, "图片")
  }

  audio(ms: Message.Audio) {
    return this.file(ms, "音频")
  }

  voice(ms: Message.Voice) {
    return this.file(ms, "语音")
  }

  video(ms: Message.Voice) {
    return this.file(ms, "视频")
  }
}
