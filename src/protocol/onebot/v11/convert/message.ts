import { Message as PhiliaMessage, Event as PhiliaEvent } from "../../../type/index.js"
import { Message as OBv11Message } from "../type/index.js"
import { ulid } from "ulid"
import fs from "node:fs/promises"
import Client from "../server/client.js"
import * as OBv11Event from "../type/event.js"

/** 消息转换器 */
export class OBv11toPhilia {
  /** 客户端 */
  client: Client
  /** 消息事件 */
  event: OBv11Event.Message
  /** 转换前的消息 */
  before: (string | OBv11Message.MessageSegment)[]
  /** 转换后的消息 */
  after: PhiliaMessage.MessageSegment[] = []
  /** 消息摘要 */
  summary = ""

  constructor(client: Client, event: OBv11Event.Message) {
    this.client = client
    this.event = event
    this.before = Array.isArray(event.message) ? event.message : [event.message]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i !== "object") this._text(i)
      else if (typeof this[(i as OBv11Message.MessageBase).type] === "function")
        await this[(i as OBv11Message.MessageBase).type](i as any)
      else if (OBv11Message.ExtendArray.includes((i as OBv11Message.MessageExtend).type))
        this.extend(i as OBv11Message.MessageExtend)
      else this._text(i)
    }
    return this
  }

  extend(data: OBv11Message.MessageExtend) {
    this.after.push({ type: "extend", extend: `OneBotv11.${data.type}`, data })
    this.summary += `[${data.type}: ${data}]`
  }

  _text(text: any, markdown?: string) {
    text = String(text)
    if (!text.length) return
    this.after.push({ type: "text", data: text, markdown })
    this.summary += text
  }

  text(ms: OBv11Message.Text) {
    this._text(ms.data.text)
  }

  async at(ms: OBv11Message.At) {
    let { qq, name = "" } = ms.data
    if (qq === "all") {
      this.summary += `[提及全体成员]`
      this.after.push({ type: "mention", data: "all" })
      return
    }

    qq = String(qq)
    if (!name) {
      let info: PhiliaEvent.GroupMessage["user"]
      if (this.event.message_type === "group")
        info = await this.client.handle.getGroupMemberInfo({
          id: String((this.event as OBv11Event.GroupMessage).group_id),
          uid: qq,
        })
      info ??= await this.client.handle.getUserInfo({ id: qq })
      if (info) name = info.card || info.name
    }

    this.summary += `[提及: ${name}(${qq})]`
    this.after.push({ type: "mention", data: "user", id: qq, name })
  }

  async _prepareFile<T extends PhiliaMessage.AFile>(ms: OBv11Message.AFile) {
    const data: T = {
      type: ms.type,
      id: ulid(),
      data: "binary",
      name: (ms as unknown as { name: string }).name,
    } as T

    if (ms.data.url) {
      data.data = "url"
      data.url = ms.data.url
      data.name = ms.data.file
    } else if (Buffer.isBuffer(ms.data.file)) {
      data.binary = ms.data.file
    } else if (ms.data.file.startsWith("base64://")) {
      data.binary = Buffer.from(ms.data.file.replace("base64://", ""), "base64")
    } else if (ms.data.file.match(/^https?:\/\//)) {
      data.data = "url"
      data.url = ms.data.file
    } else {
      const file = ms.data.file.replace(/^file:\/\//, "")
      if (await fs.stat(file).catch(() => false)) {
        data.binary = await fs.readFile(file)
      } else {
        data.data = "path"
        data.path = file
      }
    }
    return data
  }

  async image(ms: OBv11Message.Image) {
    this.after.push(await this._prepareFile<PhiliaMessage.Image>(ms))
    this.summary += "[图片]"
  }

  async record(ms: OBv11Message.Record) {
    this.after.push(await this._prepareFile<PhiliaMessage.Voice>({ ...ms, type: "voice" }))
    this.summary += "[语音]"
  }

  async video(ms: OBv11Message.Video) {
    this.after.push(await this._prepareFile<PhiliaMessage.Video>(ms))
    this.summary += "[视频]"
  }

  async forward(ms: OBv11Message.Forward) {
    for (const i of await this.client.handle.getForwardMsg({ id: ms.data.id }))
      this.after.push(...(i.message as PhiliaMessage.MessageSegment[]))
  }

  reply(ms: OBv11Message.Reply) {
    this.after.push({ type: "reply", data: ms.data.id, text: ms.data.text })
  }
}

const Extends = OBv11Message.ExtendArray.map(i => `OneBotv11.${i}`)

/** 消息解析器 */
export class PhiliaToOBv11 {
  client: Client
  event: PhiliaEvent.Message
  before: (string | PhiliaMessage.MessageSegment)[]
  after: OBv11Message.MessageSegment[] = []
  summary = ""
  constructor(client: Client, event: PhiliaEvent.Message) {
    this.client = client
    this.event = event
    this.before = Array.isArray(event.message) ? event.message : [event.message]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i === "object" && typeof this[i.type] === "function") await this[i.type](i as any)
      else this._text(i)
    }
    return this
  }

  _text(text: any) {
    text = String(text)
    if (!text.length) return
    this.after.push({ type: "text", data: { text } })
    this.summary += text
  }

  text(ms: PhiliaMessage.Text) {
    this._text(ms.data)
  }

  mention(ms: PhiliaMessage.Mention) {
    if (ms.data === "all") {
      this.after.push({ type: "at", data: { qq: "all" } })
      this.summary += `@全体成员`
      return
    }
    this.after.push({ type: "at", data: { qq: ms.id as string, name: ms.name } })
    this.summary += ms.name ? `@${ms.name}(${ms.id})` : `@${ms.id}`
  }

  reply(ms: PhiliaMessage.Reply) {
    this.after.push({ type: "reply", data: { id: ms.data, text: ms.text } })
    this.summary += ms.text ? `[回复: ${ms.text}(${ms.data})]` : `[回复: ${ms.data}]`
  }

  extend(ms: PhiliaMessage.Extend) {
    if (Extends.includes(ms.extend)) {
      this.after.push(ms.data as OBv11Message.MessageSegment)
      this.summary += `[${(ms.data as OBv11Message.MessageSegment).type}: ${ms.data}]`
    }
  }

  platform(ms: PhiliaMessage.Platform) {
    this.summary += `[${ms.platform}(${ms.mode}) 平台消息: ${ms.data}]`
    switch (ms.mode) {
      case "include":
        if (Array.isArray(ms.platform) ? ms.platform.includes("OICQ") : ms.platform === "OICQ")
          return this.after.push(ms.data as OBv11Message.MessageSegment)
        break
      case "exclude":
        if (Array.isArray(ms.platform) ? !ms.platform.includes("OICQ") : ms.platform !== "OICQ")
          return this.after.push(ms.data as OBv11Message.MessageSegment)
        break
      case "regexp":
        if (new RegExp(ms.platform as string).test("OICQ"))
          return this.after.push(ms.data as OBv11Message.MessageSegment)
        break
    }
  }

  _file(type: OBv11Message.MessageBase["type"], ms: PhiliaMessage.AFile) {
    switch (ms.data) {
      case "id":
      case "path":
        this.after.push({
          type,
          data: { file: ms.id || ms.path },
        } as OBv11Message.MessageBase)
        break
      case "binary":
        this.after.push({
          type,
          data: { file: ms.binary },
        } as OBv11Message.MessageBase)
        break
      case "url":
        this.after.push({
          type,
          data: { file: ms.url },
        } as OBv11Message.MessageBase)
        break
    }
  }

  async file(ms: PhiliaMessage.File) {
    await this.client.handle._sendFile({
      scene: this.event.scene,
      id: this.event.scene === "user" ? this.event.user.id : this.event.group.id,
      data: ms,
    })
    this.summary += "[文件]"
  }

  image(ms: PhiliaMessage.Image) {
    this._file("image", ms)
    this.summary += "[图片]"
  }

  voice(ms: PhiliaMessage.Voice) {
    this._file("record", ms)
    this.summary += "[语音]"
  }

  async audio(ms: PhiliaMessage.Audio) {
    await this.client.handle._sendFile({
      scene: this.event.scene,
      id: this.event.scene === "user" ? this.event.user.id : this.event.group.id,
      data: ms,
    })
    this.summary += "[音频]"
  }

  video(ms: PhiliaMessage.File) {
    this._file("video", ms)
    this.summary += "[视频]"
  }

  button() {}
}
