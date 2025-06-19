import {
  AtElem,
  Quotable,
  TextElem,
  ImageElem,
  ReplyElem,
  PttElem,
  Sendable,
  VideoElem,
  FileElem,
  ForwardNode,
  MarkdownElem,
  ButtonElem,
  Button,
  BaseMessageElem,
  ExtendMessageElem,
  ExtendArray,
  PlatformElem,
  MessageElem,
  segment,
} from "./elements.js"
import { lock } from "../common.js"
import * as Philia from "#protocol/type"
import { Contactable } from "../contact/contactable.js"
import { MemberInfo } from "../contact/types.js"
import { Message } from "./message.js"
import { Client } from "../client.js"
import fs from "node:fs/promises"
import { MessageRet } from "../event/types.js"
import { modeMatch } from "#util"

/** 消息转换器 */
export class OICQtoPhilia {
  /** 转换前的消息 */
  before: (string | MessageElem)[]
  /** 转换后的消息 */
  after: Philia.Message.MessageSegment[] = []
  /** 长度(字符) */
  length = 0
  /** 预览文字 */
  brief = ""
  /** 是否已发出 */
  response?: MessageRet

  constructor(
    protected readonly c: Contactable,
    content: Sendable,
    source?: Quotable,
  ) {
    lock(this, "c")
    if (source) this.quote(source)
    this.before = Array.isArray(content) ? content : [content]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i !== "object") this._text(i)
      else if (typeof this[(i as BaseMessageElem).type] === "function")
        await this[(i as BaseMessageElem).type](i as never)
      else if (ExtendArray.includes((i as ExtendMessageElem).type))
        this.extend(i as ExtendMessageElem)
      else this._text(i)
    }
    return this.after
  }

  extend(data: ExtendMessageElem) {
    this.after.push({ type: "extend", extend: `OICQ.${data.type}`, data })
    this.brief += `[${data.type}: ${data}]`
  }

  platform(data: PlatformElem) {
    this.after.push(data)
    this.brief += `[${data.type}: ${data.list} ${data}]`
  }

  _text(text: any, markdown?: string) {
    text = String(text)
    if (!text.length) return
    this.after.push({ type: "text", data: text, markdown })
    this.length += text.length
    this.brief += text
  }

  text(ms: TextElem) {
    this._text(ms.text, ms.markdown)
  }

  at(ms: AtElem) {
    let { qq, text = "" } = ms
    switch (qq) {
      case "user":
        qq = String(qq)
        if (!text) {
          let info
          if (!this.c.dm && this.c.target) info = this.c.client.gml.get(this.c.target)?.get(qq)
          info ??= this.c.client.fl.get(qq)
          if (info) text = (info as MemberInfo).card || info.nickname
        }

        if (ms.dummy) return this._text(`@${text}`)
        this.brief += `[提及: ${text}(${qq})]`
        this.after.push({ type: "mention", data: "user", id: qq, name: text })
        break
      case "all":
        this.brief += `[提及全体成员]`
        this.after.push({ type: "mention", data: "all" })
        break
    }
  }

  async _prepareFile<T extends Philia.Message.AFile>(ms: {
    type: string
    file: string | Buffer
    fid?: string
  }) {
    const data = {
      ...ms,
      data: "binary",
    } as unknown as T

    if (ms.fid) {
      data.data = "id"
      data.id = ms.fid
    } else if (Buffer.isBuffer(ms.file)) {
      data.binary = ms.file
    } else if (ms.file.startsWith("base64://")) {
      data.binary = Buffer.from(ms.file.replace("base64://", ""), "base64")
    } else if (ms.file.match(/^https?:\/\//)) {
      data.data = "url"
      data.url = ms.file
    } else {
      const file = ms.file.replace(/^file:\/\//, "")
      if (await fs.stat(file).catch(() => false)) {
        data.binary = await fs.readFile(file)
      } else {
        data.data = "path"
        data.path = file
      }
    }
    return data
  }

  async file(ms: FileElem) {
    this.after.push(await this._prepareFile<Philia.Message.File>(ms))
    this.brief += "[文件]"
  }

  async image(ms: ImageElem) {
    this.after.push(await this._prepareFile<Philia.Message.Image>(ms))
    this.brief += "[图片]"
  }

  async record(ms: PttElem) {
    this.after.push(await this._prepareFile<Philia.Message.Voice>({ ...ms, type: "voice" }))
    this.brief += "[语音]"
  }

  async video(ms: VideoElem) {
    this.after.push(await this._prepareFile<Philia.Message.Video>(ms))
    this.brief += "[视频]"
  }

  async node(ms: ForwardNode) {
    this.response = await this.c.sendForwardMsg(ms.data)
  }

  markdown(ms: MarkdownElem) {
    this.after.push({
      type: "text",
      data: ms.content,
      markdown: ms.content,
    })
    this.brief += "[Markdown]"
  }

  _button(ms: Button) {
    const button = {
      QQBot: ms,
      text: ms.render_data.label,
      clicked_text: ms.render_data.visited_label,
    } as unknown as Philia.Message.ButtonType

    switch (ms.action.type) {
      case 0:
        button.link = ms.action.data
        break
      case 1:
        button.callback = ms.action.data
        break
      case 2:
        button.input = ms.action.data
        button.send = ms.action.enter
        break
    }

    if (ms.action.permission) {
      if (ms.action.permission.type === 1) button.permission = "admin"
      else button.permission = ms.action.permission.specify_user_ids
    }

    return button
  }

  button(ms: ButtonElem) {
    const data =
      ms.data || ms.content?.rows.map(row => row.buttons.map(this._button.bind(this))) || []
    this.after.push({ type: "button", data })
    this.brief += "[按钮]"
  }

  reply(ms: ReplyElem) {
    this.after.push({ type: "reply", data: ms.id, summary: ms.text })
    this.brief += `[提及: ${ms.text ? `${ms.text}(${ms.id})` : ms.id}]`
  }

  quote(ms: Quotable) {
    if (ms.message_id)
      this.reply({
        id: ms.message_id,
        text: (ms as Message).raw_message || ms.message,
      } as ReplyElem)
  }
}

export class PhiliaToOICQ {
  before: (string | Philia.Message.MessageSegment)[]
  after: MessageElem[] = []
  brief = ""
  content = ""
  /** 引用回复 */
  source?: Quotable
  atme = false
  atall = false

  constructor(
    protected readonly c: Client,
    message: Philia.Message.Message,
  ) {
    lock(this, "c")
    this.before = Array.isArray(message) ? message : [message]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i === "object" && typeof this[i.type] === "function")
        await this[i.type](i as never)
      else this.after.push(segment.text(i))
    }
  }

  text(ms: Philia.Message.Text) {
    this.after.push(segment.text(ms.data, ms.markdown))
    this.brief += ms.data
  }

  mention(ms: Philia.Message.Mention) {
    if (ms.data === "all") {
      this.after.push(segment.at("all"))
      this.brief += "@全体成员"
      this.atall = true
      return
    }
    this.after.push(segment.at(ms.id as string, ms.name))
    this.brief += ms.name ? `@${ms.name}(${ms.id})` : `@${ms.id}`
    if (ms.id === this.c.uin) this.atme = true
  }

  async reply(ms: Philia.Message.Reply) {
    this.after.push(segment.reply(ms.data, ms.summary))
    this.brief += ms.summary ? `[回复: ${ms.summary}(${ms.data})]` : `[回复: ${ms.data}]`
    const source = await this.c.api.getMsg({ id: ms.data })
    this.source = {
      ...source,
      user_id: source.user.id,
      message_id: source.id,
    } as unknown as Quotable
  }

  _button(button: Philia.Message.ButtonType) {
    if (button.QQBot) return button.QQBot

    const msg: any = {
      id: button.id,
      render_data: {
        label: button.text,
        visited_label: button.clicked_text || "",
      },
    }

    if (button.input)
      msg.action = {
        type: 2,
        permission: { type: 2 },
        data: button.input,
        enter: button.send,
      }
    else if (button.callback)
      msg.action = {
        type: 1,
        permission: { type: 2 },
      }
    else if (button.link)
      msg.action = {
        type: 0,
        permission: { type: 2 },
        data: button.link,
      }
    else return false

    if (button.permission) {
      if (button.permission === "admin") {
        msg.action.permission.type = 1
      } else {
        msg.action.permission.type = 0
        if (!Array.isArray(button.permission)) button.permission = [button.permission]
        msg.action.permission.specify_user_ids = button.permission
      }
    }
    return msg
  }

  button(ms: Philia.Message.Button) {
    this.after.push(
      Object.assign(ms, segment.button(ms.data.map(i => i.map(this._button.bind(this))))),
    )
    this.brief += "[按钮]"
  }

  extend(ms: Philia.Message.Extend) {
    if (ms.extend.startsWith("OICQ.")) {
      this.after.push(ms.data as MessageElem)
      this.brief += `[${(ms.data as MessageElem).type}: ${ms.data}]`
    } else {
      this.after.push(ms)
      this.brief += `[${ms.extend} 扩展消息: ${ms.data}]`
    }
  }

  platform(ms: Philia.Message.Platform) {
    this.brief += `[${ms.list}(${ms.mode}) 平台消息: ${ms.data}]`
    if (modeMatch(ms, "OICQ"))
      if (Array.isArray(ms.data)) this.after.push(...(ms.data as MessageElem[]))
      else this.after.push(ms.data as MessageElem)
    else this.after.push(ms)
  }

  async _file(type: BaseMessageElem["type"], ms: Philia.Message.AFile): Promise<void> {
    switch (ms.data) {
      case "id":
        return this._file(type, await this.c.api.getFile({ id: ms.id as string }))
      case "path":
      case "binary":
        /** 转成 url */
        break
      case "url":
        this.after.push({ ...ms, type } as BaseMessageElem)
        break
    }
  }

  file(ms: Philia.Message.File) {
    this.brief += ms.summary ?? `[文件: ${ms.name}]`
    return this._file("file", ms)
  }

  image(ms: Philia.Message.Image) {
    this.brief += ms.summary ?? `[图片: ${ms.name}]`
    return this._file("image", ms)
  }

  voice(ms: Philia.Message.Voice) {
    this.brief += ms.summary ?? `[语音: ${ms.name}]`
    return this._file("record", ms)
  }

  audio(ms: Philia.Message.Audio) {
    this.brief += ms.summary ?? `[音频: ${ms.name}]`
    return this._file("file", ms)
  }

  video(ms: Philia.Message.File) {
    this.brief += ms.summary ?? `[视频: ${ms.name}]`
    return this._file("video", ms)
  }
}
