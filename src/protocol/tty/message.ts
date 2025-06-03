import fs from "node:fs/promises"
import path from "node:path"
import { ulid } from "ulid"
import { Message } from "../type/index.js"
import Client from "./client.js"
import logger from "#logger"
import { modeMatch } from "#util"

export class Convert {
  client: Client
  message: (string | Message.MessageSegment)[]
  summary = ""

  constructor(client: Client, message: Message.Message) {
    this.client = client
    this.message = Array.isArray(message) ? message : [message]
  }

  async convert(data: Message.Message = this.message) {
    if (Array.isArray(data)) {
      for (const i of data) await this.convert(i)
    } else if (typeof data !== "object") this.text({ data } as Message.Text)
    else if (typeof this[(data as Message.MessageSegment).type] === "function")
      await this[(data as Message.MessageSegment).type](data as never)
    else this.text({ data: JSON.stringify(data) } as Message.Text)
    return this.summary
  }

  text(data: Message.Text) {
    this.summary += data.data
  }

  mention(data: Message.Mention) {
    if (data.data === "all") return (this.summary += `[提及全体成员]`)
    this.summary += `[提及: ${data.name ? `${data.name}(${data.id})` : data.id}]`
  }

  reply(data: Message.Reply) {
    this.summary += `[提及: ${data.summary ? `${data.summary}(${data.data})` : data.data}]`
  }

  button(data: Message.Button) {
    this.summary += `[按钮: ${JSON.stringify(data.data)}]`
  }

  extend(data: Message.Extend) {
    this.summary += `[扩展消息 ${data.extend}: ${JSON.stringify(data.data)}`
  }

  async platform(data: Message.Platform) {
    if (modeMatch(data, "tty")) await this.convert(data.data as Message.Message)
  }

  async file(data: Message.AFile, name = "文件"): Promise<void> {
    if (this.client.config.save)
      try {
        switch (data.data) {
          case "id":
            return this.file(
              (await this.client.request("getFile", {
                id: data.id,
              })) as Message.File,
              name,
            )
          case "binary": {
            const save_path = path.join(this.client.config.save.path, `${ulid()}-${data.name}`)
            if (typeof data.binary === "string")
              data.binary = Buffer.from(data.binary.replace("base64://", ""), "base64")
            await fs.writeFile(save_path, data.binary as Buffer)
            this.summary += `[${name}: ${save_path}]`
            return
          }
          case "url":
            return this.file(
              {
                name: data.name,
                data: "binary",
                binary: await (await fetch(data.url as string)).arrayBuffer(),
              } as unknown as Message.File,
              name,
            )
          case "path": {
            const save_path = path.join(this.client.config.save.path, `${ulid()}-${data.name}`)
            await fs.copyFile(data.path as string, save_path)
            this.summary += `[${name}: ${save_path}]`
            return
          }
        }
      } catch (err) {
        logger.error(`${name}保存错误`, data, err)
      }
    this.summary += `[${name}: ${data.name}]`
  }

  image(data: Message.Image) {
    return this.file(data, "图片")
  }

  audio(data: Message.Audio) {
    return this.file(data, "音频")
  }

  voice(data: Message.Voice) {
    return this.file(data, "语音")
  }

  video(data: Message.Voice) {
    return this.file(data, "视频")
  }
}
