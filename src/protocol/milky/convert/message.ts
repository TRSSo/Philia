import * as Milky from "../type/index.js"
import * as Philia from "#protocol/type"
import Client from "../client.js"
import * as Common from "./common.js"
import { ulid } from "ulid"
import { modeMatch } from "#util"

/** 消息转换器 */
export class MilkyToPhilia {
  /** 转换前的消息 */
  before: (string | Milky.Message.IncomingSegment)[]
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
    public event: Milky.Struct.IncomingMessage,
  ) {
    this.before = Array.isArray(event.segments) ? event.segments : [event.segments]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i !== "object") this._text(i)
      else if (typeof this[(i as Milky.Message.IncomingMessageBase).type] === "function")
        await this[(i as Milky.Message.IncomingMessageBase).type](i as never)
      else if (
        Milky.Message.IncomingExtendArray.includes((i as Milky.Message.IncomingMessageExtend).type)
      )
        this.extend(i as Milky.Message.IncomingMessageExtend)
      else this._text(i)
    }
    return this
  }

  extend(data: Milky.Message.IncomingMessageExtend) {
    this.after.push({ type: "extend", extend: `Milky.${data.type}`, data })
    this.summary += `[${data.type}: ${data}]`
  }

  _text(text: any, markdown?: string) {
    text = String(text)
    if (!text.length) return
    this.after.push({ type: "text", data: text, markdown })
    this.summary += text
  }

  text(ms: Milky.Message.Text) {
    this._text(ms.data.text)
  }

  mention(ms: Milky.Message.Mention) {
    this.after.push({ type: "mention", data: "user", id: String(ms.data.user_id) })
    this.summary += `@${ms.data.user_id}`
  }

  mention_all() {
    this.after.push({ type: "mention", data: "all" })
    this.summary += `@全体成员`
  }

  reply(ms: Milky.Message.IncomingReply) {
    this.after.push({
      type: "reply",
      data: Common.encodeMessageID(
        this.event.message_scene,
        this.event.peer_id,
        ms.data.message_seq,
      ),
    })
  }

  image(ms: Milky.Message.IncomingImage) {
    this.after.push({
      type: "image",
      name: ulid(),
      data: ms.data.temp_url ? "url" : "id",
      url: ms.data.temp_url,
      id: Common.encodeFileID(Common.FileScene.Resource, ms.data.resource_id),
      summary: ms.data.summary,
      sub_type: ms.data.sub_type,
    })
  }

  record(ms: Milky.Message.IncomingRecord) {
    this.after.push({
      type: "voice",
      name: ulid(),
      data: ms.data.temp_url ? "url" : "id",
      url: ms.data.temp_url,
      id: Common.encodeFileID(Common.FileScene.Resource, ms.data.resource_id),
      duration: ms.data.duration,
    })
  }

  video(ms: Milky.Message.IncomingVideo) {
    this.after.push({
      type: "video",
      name: ulid(),
      data: ms.data.temp_url ? "url" : "id",
      url: ms.data.temp_url,
      id: Common.encodeFileID(Common.FileScene.Resource, ms.data.resource_id),
    })
  }
}

export class PhiliaToMilky {
  before: (string | Philia.Message.MessageSegment)[]
  after: Milky.Message.OutgoingSegment[] = []
  summary = ""
  file_id?: string[]

  constructor(
    public client: Client,
    public event: Philia.Event.Message,
  ) {
    this.before = Array.isArray(event.message) ? event.message : [event.message]
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
        this.after.push({ type: "mention", data: { user_id: Number(ms.id) } })
        this.summary += `[提及：${ms.id}]`
        break
      case "all":
        this.after.push({ type: "mention_all", data: {} })
        this.summary += `[提及全体成员]`
        break
    }
  }

  reply(ms: Philia.Message.Reply) {
    const { message_seq } = Common.decodeMessageID(ms.data)
    this.after.push({ type: "reply", data: { message_seq } })
    this.summary += ms.summary ? `[回复: ${ms.summary}(${ms.data})]` : `[回复: ${ms.data}]`
  }

  extend(ms: Philia.Message.Extend) {
    if (!ms.extend.startsWith("Milky.")) return
    const extend = ms.extend.replace("Milky.", "") as Milky.Message.OutgoingMessageExtend["type"]
    if (Milky.Message.OutgoingExtendArray.includes(extend)) {
      this.after.push(ms.data as Milky.Message.OutgoingSegment)
      this.summary += `[${(ms.data as Milky.Message.OutgoingSegment).type}: ${ms.data}]`
    }
  }

  platform(ms: Philia.Message.Platform) {
    this.summary += `[${ms.list}(${ms.mode}) 平台消息: ${ms.data}]`
    if (modeMatch(ms, "Milky"))
      if (Array.isArray(ms.data)) this.after.push(...(ms.data as Milky.Message.OutgoingSegment[]))
      else this.after.push(ms.data as Milky.Message.OutgoingSegment)
  }

  async _file<T extends Milky.Message.OutgoingMessageBase>(
    type: T["type"],
    ms: Philia.Message.AFile,
  ) {
    let ret: T
    switch (ms.data) {
      case "id":
        ret = {
          type,
          data: { uri: (await this.client.handle.getFile({ id: ms.id as string })).url },
        } as T
        break
      case "path":
        ret = { type, data: { uri: ms.path } } as T
        break
      case "binary":
        ret = {
          type,
          data: {
            uri: Buffer.isBuffer(ms.binary)
              ? `base64://${ms.binary.toString("base64")}`
              : ms.binary,
          },
        } as T
        break
      case "url":
        ret = { type, data: { uri: ms.url } } as T
        break
    }
    this.after.push(ret)
    return ret
  }

  async file(ms: Philia.Message.File | Philia.Message.Audio) {
    const ret = await this.client.handle._sendFile({
      scene: this.event.scene,
      id: this.event.scene === "user" ? this.event.user.id : this.event.group.id,
      data: ms,
    })
    this.file_id ??= []
    this.file_id.push(ret)
    this.summary += ms.summary ?? `[文件: ${ms.name}]`
  }

  async image(ms: Philia.Message.Image) {
    const ret = await this._file<Milky.Message.OutgoingImage>("image", ms)
    if (ms.summary) ret.data.summary = ms.summary
    ret.data.sub_type = ms.sub_type === "sticker" ? "sticker" : "normal"
    this.summary += ms.summary ?? `[图片: ${ms.name}]`
  }

  async voice(ms: Philia.Message.Voice) {
    await this._file<Milky.Message.OutgoingRecord>("record", ms)
    this.summary += ms.summary ?? `[语音: ${ms.name}]`
  }

  audio(ms: Philia.Message.Audio) {
    return this.file({ ...ms, summary: ms.summary ?? `[音频: ${ms.name}]` })
  }

  async video(ms: Philia.Message.File) {
    const ret = await this._file<Milky.Message.OutgoingVideo>("video", ms)
    if (ms.thumb_uri) ret.data.thumb_uri = ms.thumb_uri as string
    this.summary += ms.summary ?? `[视频: ${ms.name}]`
  }

  button() {}
}
