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
  ExtendType,
  PlatformElem,
  MessageElem,
  segment,
} from "./elements.js"
import { lock } from "../common.js"
import * as PhiliaType from "../../../type/message.js"
import { Contactable } from "../contact/contactable.js"
import { MemberInfo } from "../contact/types.js"
import { Message } from "./message.js"
import { Contact } from "../../../type/index.js"
import { Client } from "../client.js"
import fs from "node:fs/promises"

/** 消息转换器 */
export class OICQtoPhilia {
  /** 转换前的消息 */
  before: (string | MessageElem)[]
  /** 转换后的消息 */
  after: PhiliaType.MessageSegment[] = []
  /** 长度(字符) */
  length = 0
  /** 预览文字 */
  brief = ""

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
        await this[(i as BaseMessageElem).type](i as any)
      else if (ExtendType.includes((i as ExtendMessageElem).type))
        this.extend(i as ExtendMessageElem)
      else this._text(i)
    }
    if (!this.after.length) throw new Error("空消息")
    return this.after
  }

  extend(data: ExtendMessageElem) {
    this.after.push({ type: "extend", extend: `OICQ.${data.type}`, data })
    this.brief += `[${data.type}: ${data}]`
  }

  platform(data: PlatformElem) {
    this.after.push(data)
    this.brief += `[${data.type}: ${data.platform} ${data}]`
  }

  _text(text: any, markdown?: string) {
    text = String(text)
    if (!text.length) return
    this.after.push({ type: "text", data: text, markdown })
    this.length += text.length
    this.brief += text
  }

  text(elem: TextElem) {
    this._text(elem.text, elem.markdown)
  }

  at(elem: AtElem) {
    let { qq, text = "" } = elem
    if (qq === "all") {
      this.brief += `[提及全体成员]`
      this.after.push({ type: "mention", data: "all" })
      return
    }

    qq = String(qq)
    if (!text) {
      let info
      if (!this.c.dm && this.c.target) info = this.c.client.gml.get(this.c.target)?.get(qq)
      info ??= this.c.client.fl.get(qq)
      if (info) text = (info as MemberInfo).card || info.nickname
    }

    if (elem.dummy) return this._text(`@${text}`)
    this.brief += `[提及: ${text}(${qq})]`
    this.after.push({ type: "mention", data: "user", id: qq, name: text })
  }

  async _prepareFile<T extends PhiliaType.AFile>(elem: {
    type: string
    file: string | Buffer
    fid?: string
  }) {
    const data = {
      ...elem,
      data: "binary",
    } as unknown as T

    if (elem.fid) {
      data.data = "id"
      data.id = elem.fid
    } else if (Buffer.isBuffer(elem.file)) {
      data.binary = elem.file
    } else if (elem.file.startsWith("base64://")) {
      data.binary = Buffer.from(elem.file.replace("base64://", ""), "base64")
    } else if (elem.file.match(/^https?:\/\//)) {
      data.data = "url"
      data.url = elem.file
    } else {
      const file = elem.file.replace(/^file:\/\//, "")
      if (await fs.stat(file).catch(() => false)) {
        data.binary = await fs.readFile(file)
      } else {
        data.data = "path"
        data.path = file
      }
    }
    return data
  }

  async file(elem: FileElem) {
    this.after.push(await this._prepareFile<PhiliaType.File>(elem))
    this.brief += "[文件]"
  }

  async image(elem: ImageElem) {
    this.after.push(await this._prepareFile<PhiliaType.Image>(elem))
    this.brief += "[图片]"
  }

  async record(elem: PttElem) {
    this.after.push(await this._prepareFile<PhiliaType.Voice>({ ...elem, type: "voice" }))
    this.brief += "[语音]"
  }

  async video(elem: VideoElem) {
    this.after.push(await this._prepareFile<PhiliaType.Video>(elem))
    this.brief += "[视频]"
  }

  async node(elem: ForwardNode) {
    const data: PhiliaType.Forward["data"] = []
    for (const i of Array.isArray(elem.data) ? elem.data : [elem.data]) {
      data.push({
        message: await new OICQtoPhilia(this.c, i.message).convert(),
        time: i.time,
        user: { id: i.user_id, name: i.nickname } as Contact.User,
      })
    }
    this.after.push({ type: "forward", data })
  }

  markdown(elem: MarkdownElem) {
    this.after.push({
      type: "text",
      data: elem.content,
      markdown: elem.content,
    })
    this.brief += "[Markdown]"
  }

  _button(elem: Button) {
    const button = {
      QQBot: elem,
      text: elem.render_data.label,
      clicked_text: elem.render_data.visited_label,
    } as unknown as PhiliaType.ButtonType

    switch (elem.action.type) {
      case 0:
        button.link = elem.action.data
        break
      case 1:
        button.callback = elem.action.data
        break
      case 2:
        button.input = elem.action.data
        button.send = elem.action.enter
        break
    }

    if (elem.action.permission) {
      if (elem.action.permission.type === 1) button.permission = "admin"
      else button.permission = elem.action.permission.specify_user_ids
    }

    return button
  }

  button(elem: ButtonElem) {
    const data =
      elem.data || elem.content?.rows.map(row => row.buttons.map(this._button.bind(this))) || []
    this.after.push({ type: "button", data })
    this.brief += "[按钮]"
  }

  reply(elem: ReplyElem) {
    this.after.push({ type: "reply", data: elem.id, text: elem.text })
  }

  quote(elem: Quotable) {
    if (elem.message_id)
      this.reply({
        id: elem.message_id,
        text: (elem as Message).raw_message || elem.message,
      } as ReplyElem)
  }
}

const Extends = ExtendType.map(i => `OICQ.${i}`)

/** 消息解析器 */
export class PhiliatoOICQ {
  before: (string | PhiliaType.MessageSegment)[]
  after: MessageElem[] = []
  brief = ""
  content = ""
  /** 引用回复 */
  source?: Quotable
  atme = false
  atall = false

  constructor(
    protected readonly c: Client,
    message: PhiliaType.Message,
  ) {
    lock(this, "c")
    this.before = Array.isArray(message) ? message : [message]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i === "object" && typeof this[i.type] === "function") await this[i.type](i as any)
      else this.after.push(segment.text(i))
    }
  }

  text(elem: PhiliaType.Text) {
    this.after.push(segment.text(elem.data, elem.markdown))
    this.brief += elem.data
  }

  mention(elem: PhiliaType.Mention) {
    if (elem.data === "all") {
      this.after.push(segment.at("all"))
      this.brief += "@全体成员"
      this.atall = true
      return
    }
    this.after.push(segment.at(elem.id as string, elem.name))
    this.brief += elem.name ? `@${elem.name}(${elem.id})` : `@${elem.id}`
    if (elem.id === this.c.uin) this.atme = true
  }

  async reply(elem: PhiliaType.Reply) {
    this.after.push(segment.reply(elem.data, elem.text))
    this.brief += elem.text ? `[回复: ${elem.text}(${elem.data})]` : `[回复: ${elem.data}]`
    const source = await this.c.api.getMsg(elem.data)
    this.source = {
      ...source,
      user_id: source.user.id,
      message_id: source.id,
    } as unknown as Quotable
  }

  _button(button: PhiliaType.ButtonType) {
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

  button(elem: PhiliaType.Button) {
    this.after.push(
      Object.assign(elem, segment.button(elem.data.map(i => i.map(this._button.bind(this))))),
    )
    this.brief += "[按钮]"
  }

  extend(elem: PhiliaType.Extend) {
    if (Extends.includes(elem.extend)) {
      this.after.push(elem.data as MessageElem)
      this.brief += `[${(elem.data as MessageElem).type}: ${elem.data}]`
    } else {
      this.after.push(elem)
      this.brief += `[${elem.extend} 扩展消息: ${elem.data}]`
    }
  }

  platform(elem: PhiliaType.Platform) {
    this.brief += `[${elem.platform}(${elem.mode}) 平台消息: ${elem.data}]`
    switch (elem.mode) {
      case "include":
        if (
          Array.isArray(elem.platform) ? elem.platform.includes("OICQ") : elem.platform === "OICQ"
        )
          return this.after.push(elem.data as MessageElem)
        break
      case "exclude":
        if (
          Array.isArray(elem.platform) ? !elem.platform.includes("OICQ") : elem.platform !== "OICQ"
        )
          return this.after.push(elem.data as MessageElem)
        break
      case "regexp":
        if (new RegExp(elem.platform as string).test("OICQ"))
          return this.after.push(elem.data as MessageElem)
        break
    }
    this.after.push(elem)
  }

  forward(elem: PhiliaType.Forward) {
    this.after.push(elem as unknown as MessageElem)
    this.brief += "[合并转发]"
  }

  async _file(type: BaseMessageElem["type"], elem: PhiliaType.AFile): Promise<void> {
    switch (elem.data) {
      case "id":
        return this._file(type, await this.c.api.getFile(elem.id))
      case "path":
      case "binary":
        /** 转成 url */
        break
      case "url":
        this.after.push({ ...elem, type } as BaseMessageElem)
        break
    }
  }

  file(elem: PhiliaType.File) {
    this.brief += "[文件]"
    return this._file("file", elem)
  }

  image(elem: PhiliaType.Image) {
    this.brief += "[图片]"
    return this._file("image", elem)
  }

  voice(elem: PhiliaType.Voice) {
    this.brief += "[语音]"
    return this._file("record", elem)
  }

  audio(elem: PhiliaType.Audio) {
    this.brief += "[音频]"
    return this._file("file", elem)
  }

  video(elem: PhiliaType.File) {
    this.brief += "[视频]"
    return this._file("video", elem)
  }
}
