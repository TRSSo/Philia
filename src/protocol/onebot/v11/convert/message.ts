import fs from "node:fs/promises"
import { ulid } from "ulid"
import type * as Philia from "#protocol/type"
import { modeMatch } from "#util"
import type Client from "../impl/client.js"
import * as OBv11 from "../type/index.js"

/** 消息转换器 */
export class OBv11toPhilia {
  /** 转换前的消息 */
  before: (string | OBv11.Message.MessageSegment)[]
  /** 转换后的消息 */
  after: Philia.Message.MessageSegment[] = []
  /** 消息摘要 */
  summary = ""

  /**
   * @param client 客户端
   * @param event 消息事件
   */
  constructor(
    public client: Client,
    public event: OBv11.Event.Message,
  ) {
    this.before = Array.isArray(event.message) ? event.message : [event.message]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i !== "object") this._text(i)
      else if (typeof this[(i as OBv11.Message.MessageBase).type] === "function")
        await this[(i as OBv11.Message.MessageBase).type](i as never)
      else if (OBv11.Message.ExtendArray.includes((i as OBv11.Message.MessageExtend).type))
        this.extend(i as OBv11.Message.MessageExtend)
      else this._text(i)
    }
    return this
  }

  extend(data: OBv11.Message.MessageExtend) {
    this.after.push({ type: "extend", extend: `OneBotv11.${data.type}`, data })
    this.summary += `[${data.type}: ${data}]`
  }

  _text(text: any, markdown?: string) {
    const ms: Philia.Message.Text = { type: "text", data: String(text) }
    if (!ms.data.length) return
    if (markdown) ms.markdown = markdown
    this.after.push(ms)
    this.summary += ms.data
  }

  text(ms: OBv11.Message.Text) {
    this._text(ms.data.text)
  }

  async at(ms: OBv11.Message.At) {
    let { qq, name = "" } = ms.data
    switch (qq) {
      case "user":
        qq = String(qq)
        if (!name) {
          let info: Philia.Contact.GroupMember
          if (this.event.message_type === "group")
            info = await this.client.handle.getGroupMemberInfo({
              id: String((this.event as OBv11.Event.GroupMessage).group_id),
              uid: qq,
            })
          info ??= (await this.client.handle.getUserInfo({
            id: qq,
          })) as Philia.Contact.GroupMember
          if (info) name = info.card || info.name
        }

        this.summary += `[提及: ${name}(${qq})]`
        this.after.push({ type: "mention", data: "user", id: qq, name })
        break
      case "all":
        this.summary += `[提及全体成员]`
        this.after.push({ type: "mention", data: "all" })
        break
    }
  }

  async _prepareFile<T extends Philia.Message.AFile>(ms: OBv11.Message.AFile) {
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

  async image(ms: OBv11.Message.Image) {
    this.after.push(await this._prepareFile<Philia.Message.Image>(ms))
    this.summary += "[图片]"
  }

  async record(ms: OBv11.Message.Record) {
    this.after.push(await this._prepareFile<Philia.Message.Voice>({ ...ms, type: "voice" }))
    this.summary += "[语音]"
  }

  async video(ms: OBv11.Message.Video) {
    this.after.push(await this._prepareFile<Philia.Message.Video>(ms))
    this.summary += "[视频]"
  }

  async forward(ms: OBv11.Message.Forward) {
    for (const i of await this.client.handle.getForwardMsg({ id: ms.data.id }))
      this.after.push(...(i.message as Philia.Message.MessageSegment[]))
  }

  reply(ms: OBv11.Message.Reply) {
    this.after.push({ type: "reply", data: ms.data.id, summary: ms.data.text })
    this.summary += `[提及: ${ms.data.text ? `${ms.data.text}(${ms.data.id})` : ms.data.id}]`
  }
}

export class PhiliaToOBv11 {
  before: (string | Philia.Message.MessageSegment)[]
  after: OBv11.Message.MessageSegment[] = []
  summary = ""
  constructor(
    public client: Client,
    public scene: Philia.Event.Message["scene"],
    public id: (Philia.Contact.User | Philia.Contact.Group)["id"],
    message: Philia.Message.Message,
  ) {
    this.before = Array.isArray(message) ? message : [message]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i === "object" && typeof this[i.type] === "function")
        await this[i.type](i as never)
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

  text(ms: Philia.Message.Text) {
    this._text(ms.data)
  }

  mention(ms: Philia.Message.Mention) {
    switch (ms.data) {
      case "user":
        this.after.push({
          type: "at",
          data: { qq: ms.id as string, name: ms.name },
        })
        this.summary += ms.name ? `@${ms.name}(${ms.id})` : `@${ms.id}`
        break
      case "all":
        this.after.push({ type: "at", data: { qq: "all" } })
        this.summary += `@全体成员`
        break
    }
  }

  reply(ms: Philia.Message.Reply) {
    this.after.push({ type: "reply", data: { id: ms.data, text: ms.summary } })
    this.summary += ms.summary ? `[回复: ${ms.summary}(${ms.data})]` : `[回复: ${ms.data}]`
  }

  extend(ms: Philia.Message.Extend) {
    if (!ms.extend.startsWith("OneBotv11.")) return
    const extend = ms.extend.replace("OneBotv11.", "") as OBv11.Message.MessageExtend["type"]
    if (OBv11.Message.ExtendArray.includes(extend)) {
      this.after.push(ms.data as OBv11.Message.MessageSegment)
      this.summary += `[${(ms.data as OBv11.Message.MessageSegment).type}: ${ms.data}]`
    }
  }

  platform(ms: Philia.Message.Platform) {
    this.summary += `[${ms.list}(${ms.mode}) 平台消息: ${ms.data}]`
    if (modeMatch(ms, "OneBotv11"))
      if (Array.isArray(ms.data)) this.after.push(...(ms.data as OBv11.Message.MessageSegment[]))
      else this.after.push(ms.data as OBv11.Message.MessageSegment)
  }

  _file(type: OBv11.Message.MessageBase["type"], ms: Philia.Message.AFile) {
    switch (ms.data) {
      case "id":
      case "path":
        this.after.push({
          type,
          data: { file: ms.id || ms.path },
        } as OBv11.Message.MessageBase)
        break
      case "binary":
        this.after.push({
          type,
          data: { file: ms.binary },
        } as OBv11.Message.MessageBase)
        break
      case "url":
        this.after.push({
          type,
          data: { file: ms.url },
        } as OBv11.Message.MessageBase)
        break
    }
  }

  async file(ms: Philia.Message.File) {
    await this.client.handle._sendFile({ scene: this.scene, id: this.id, data: ms })
    this.summary += ms.summary ?? `[文件: ${ms.name}]`
  }

  image(ms: Philia.Message.Image) {
    this._file("image", ms)
    this.summary += ms.summary ?? `[图片: ${ms.name}]`
  }

  voice(ms: Philia.Message.Voice) {
    this._file("record", ms)
    this.summary += ms.summary ?? `[语音: ${ms.name}]`
  }

  async audio(ms: Philia.Message.Audio) {
    await this.client.handle._sendFile({ scene: this.scene, id: this.id, data: ms })
    this.summary += ms.summary ?? `[音频: ${ms.name}]`
  }

  video(ms: Philia.Message.File) {
    this._file("video", ms)
    this.summary += ms.summary ?? `[视频: ${ms.name}]`
  }

  button() {}
}
