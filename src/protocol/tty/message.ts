import fs from "node:fs/promises"
import path from "node:path"
import { ulid } from "ulid"
import { AMSFile, IMessage, IMessageSegment, IMSAudio, IMSButton, IMSExtend, IMSFile, IMSForward, IMSImage, IMSMention, IMSPlatform, IMSReply, IMSText, IMSVoice } from "../example/message.js"
import Client from "./client.js"
import { logger } from "../../util/logger.js"

export class Convert {
  client: Client
  message: (string | IMessageSegment)[]
  summary = ""

  constructor(client: Client, message: IMessage) {
    this.client = client
    this.message = Array.isArray(message) ? message : [message]
  }

  async convert(data: IMessage = this.message) {
    if (Array.isArray(data)) {
      for (const i of data)
        await this.convert(i)
    } else if (typeof data !== "object")
      this.text({ data } as IMSText)
    else if (typeof this[(data as IMessageSegment).type] === "function")
      await this[(data as IMessageSegment).type](data as never)
    else this.text({ data: JSON.stringify(data) } as IMSText)
    return this.summary
  }

  text(data: IMSText) {
    this.summary += data.data
  }

  mention(data: IMSMention) {
    this.summary += `[提及: ${data.name ? `${data.name}(${data.data})` : data.data}]`
  }

  reply(data: IMSReply) {
    this.summary += `[提及: ${data.text ? `${data.text}(${data.data})` : data.data}]`
  }

  button(data: IMSButton) {
    this.summary += `[按钮: ${JSON.stringify(data.data)}]`
  }

  extend(data: IMSExtend) {
    this.summary += `[扩展消息 ${data.extend}: ${JSON.stringify(data.data)}`
  }

  async platform(data: IMSPlatform) {
    const platform = Array.isArray(data.platform) ? data.platform : [data.platform]
    switch (data.mode) {
      case "exclude":
        if (!platform.includes("tty"))
          await this.convert(data.data as IMessage)
        break
      case "regexp":
        if (platform.some(i => new RegExp(i).test("tty")))
          await this.convert(data.data as IMessage)
        break
      default:
        if (platform.includes("tty"))
          await this.convert(data.data as IMessage)
    }
  }

  async forward(data: IMSForward) {
    for (const { message } of data.data)
      await this.convert(message)
  }

  async file(data: AMSFile, name = "文件"): Promise<void> {
    if (this.client.config.save) try { switch (data.data) {
      case "id":
        return this.file(await this.client.request("getFile", { id: data.id }) as IMSFile, name)
      case "binary": {
        const save_path = path.join(this.client.config.save.path, `${ulid()}-${data.name}`)
        if (typeof data.binary === "string")
          data.binary = Buffer.from(data.binary.replace("base64://", ""), "base64")
        await fs.writeFile(save_path, data.binary as Buffer)
        this.summary +=`[${name}: ${save_path}]`
        return
      } case "url":
        return this.file({
          name: data.name,
          data: "binary",
          binary: await (await fetch(data.url as string)).arrayBuffer(),
        } as IMSFile, name)
      case "path": {
        const save_path = path.join(this.client.config.save.path, `${ulid()}-${data.name}`)
        await fs.copyFile(data.path as string, save_path)
        this.summary +=`[${name}: ${save_path}]`
        return
      }
    }} catch (err) {
      logger.error(`${name}保存错误`, data, err)
    }
    this.summary +=`[${name}: ${data.name}]`
  }

  image(data: IMSImage) {
    return this.file(data, "图片")
  }

  audio(data: IMSAudio) {
    return this.file(data, "音频")
  }

  voice(data: IMSVoice) {
    return this.file(data, "语音")
  }

  video(data: IMSVoice) {
    return this.file(data, "视频")
  }
}