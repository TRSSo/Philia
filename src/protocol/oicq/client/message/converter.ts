import { AtElem, Quotable, TextElem, ImageElem, ReplyElem, PttElem, Sendable, VideoElem, FileElem, ForwardNode, MarkdownElem, ButtonElem, Button, BaseMessageElem, ExtendMessageElem, ExtendType, PlatformElem, MessageElem, segment
} from "./elements.js"
import { lock } from "../common.js"
import { AMSFile, IButton, IMSAudio, IMSButton, IMSExtend, IMSFile, IMSForward, IMSImage, IMSMention, IMSPlatform, IMSReply, IMSText, IMSVideo, IMSVoice, IMessage, IMessageSegment } from "../../../example/message.js"
import { Contactable } from "../contact/contactable.js"
import { MemberInfo } from "../contact/types.js"
import { Message } from "./message.js"
import { IUser } from "../../../example/user.js"
import { Client } from "../client.js"
import { ulid } from "ulid"
import fs from "node:fs/promises"

/** 消息转换器 */
export class OICQtoTRSS {
  /** 转换前的消息 */
  before: (string | MessageElem)[]
  /** 转换后的消息 */
  after: IMessageSegment[] = []
  /** 长度(字符) */
  length = 0
  /** 预览文字 */
  brief = ""

  constructor(protected readonly c: Contactable, content: Sendable, source?: Quotable) {
    lock(this, "c")
    if (source) this.quote(source)
    this.before = Array.isArray(content) ? content : [content]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i !== "object")
        this._text(i)
      else if (typeof this[(i as BaseMessageElem).type] === "function")
        await this[(i as BaseMessageElem).type](i as any)
      else if (ExtendType.includes((i as ExtendMessageElem).type))
        this.extend(i as ExtendMessageElem)
      else this._text(i)
    }
    if (!this.after.length)
      throw new Error("空消息")
    return this.after
  }

  extend(data: ExtendMessageElem) {
    this.after.push({ type: "extend", extend: `icqq.${data.type}`, data })
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
    qq = String(qq)
    if (!text) {
      if (qq === "all") {
        text = "全体成员"
      } else {
        let info
        if (!this.c.dm && this.c.target)
          info = this.c.client.gml.get(this.c.target)?.get(qq)
        info ??= this.c.client.fl.get(qq)
        if (info) text = (info as MemberInfo).card || info.nickname
      }
    }

    if (elem.dummy) return this._text(`@${text}`)
    this.brief += `[提及: ${text}(${qq})]`
    this.after.push({ type: "mention", data: String(qq), name: text })
  }

  async _prepareFile<T extends AMSFile>(elem: { type: string; file: string | Buffer }) {
    const data: T = {
      type: elem.type,
      id: ulid(),
      data: "binary",
      name: (elem as unknown as { name: string }).name,
    } as T

    if (Buffer.isBuffer(elem.file)) {
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
  async image(elem: ImageElem) {
    this.after.push(await this._prepareFile<IMSImage>(elem))
    this.brief += "[图片]"
  }

  async record(elem: PttElem) {
    this.after.push(await this._prepareFile<IMSVoice>({ ...elem, type: "voice" }))
    this.brief += "[语音]"
  }

  async video(elem: VideoElem) {
    this.after.push(await this._prepareFile<IMSVideo>(elem))
    this.brief += "[视频]"
  }

  async node(elem: ForwardNode) {
    const data: IMSForward["data"] = []
    for (const i of Array.isArray(elem.data) ? elem.data : [elem.data]) {
      data.push({
        message: await new OICQtoTRSS(this.c, i.message).convert(),
        time: i.time,
        user: { id: i.user_id, name: i.nickname } as IUser,
      })
    }
    this.after.push({ type: "forward", data })
  }

  markdown(elem: MarkdownElem) {
    this.after.push({ type: "text", data: elem.content, markdown: elem.content })
    this.brief += "[Markdown]"
  }

  _button(elem: Button) {
    const button: IButton = {
      QQBot: elem,
      text: elem.render_data.label,
      clicked_text: elem.render_data.visited_label,
    } as unknown as IButton

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
      if (elem.action.permission.type === 1)
        button.permission = "admin"
      else
        button.permission = elem.action.permission.specify_user_ids
    }

    return button
  }

  button(elem: ButtonElem) {
    const data = elem.data || elem.content?.rows.map(row => row.buttons.map(this._button.bind(this))) || []
    this.after.push({ type: "button", data })
    this.brief += "[按钮]"
  }

  async file(elem: FileElem) {
    this.after.push(await this._prepareFile<IMSFile>(elem))
    this.brief += "[文件]"
  }

  reply(elem: ReplyElem) {
    this.after.push({ type: "reply", data: elem.id, text: elem.text })
  }

  quote(elem: Quotable) {
    if (elem.message_id)
      this.reply({ id: elem.message_id, text: (elem as Message).raw_message || elem.message } as ReplyElem)
  }
}

const Extends = ExtendType.map(i => `icqq.${i}`)

/** 消息解析器 */
export class TRSStoOICQ {
  before: (string | IMessageSegment)[]
  after: MessageElem[] = []
  brief = ""
  content = ""
  /** 引用回复 */
  source?: Quotable
  atme = false
  atall = false

  constructor(protected readonly c: Client, message: IMessage) {
    lock(this, "c")
    this.before = Array.isArray(message) ? message : [message]
  }

  async convert() {
    for (const i of this.before) {
      if (typeof i === "object" && typeof this[(i as IMessageSegment).type] === "function")
        await this[(i as IMessageSegment).type](i as any)
      else
        this.after.push(segment.text(i as string))
    }
  }

  text(elem: IMSText) {
    this.after.push(segment.text(elem.data, elem.markdown))
    this.brief += elem.data
  }

  mention(elem: IMSMention) {
    this.after.push(segment.at(elem.data, elem.name))
    this.brief += `@${elem.name}(${elem.data})`
    if (elem.data === this.c.uin)
      this.atme = true
    else if (elem.data === "all")
      this.atall = true
  }

  async reply(elem: IMSReply) {
    this.after.push(segment.reply(elem.data, elem.text))
    this.brief += `[回复: ${elem.text}(${elem.data})]`
    this.source = await this.c.request("getMsg", { id: elem.data }) as Quotable
  }

  _button(button: IButton) {
    if (button.QQBot) return button.QQBot

    const msg: any = {
      id: button.id,
      render_data: {
        label: button.text,
        visited_label: button.clicked_text || "",
      }
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
        if (!Array.isArray(button.permission))
          button.permission = [button.permission]
        msg.action.permission.specify_user_ids = button.permission
      }
    }
    return msg
  }

  button(elem: IMSButton) {
    this.after.push(Object.assign(elem, segment.button(
      elem.data.map(i => i.map(this._button.bind(this)))
    )))
    this.brief += "[按钮]"
  }

  extend(elem: IMSExtend) {
    if (Extends.includes(elem.extend)) {
      this.after.push(elem.data as MessageElem)
      this.brief += `[${(elem.data as MessageElem).type}: ${elem.data}]`
    } else {
      this.after.push(elem)
      this.brief += `[${elem.extend} 扩展消息: ${elem.data}]`
    }
  }

  platform(elem: IMSPlatform) {
    this.after.push(elem)
    this.brief += `[${elem.platform} 平台消息: ${elem.data}]`
  }

  forward(elem: IMSForward) {
    this.after.push(elem as unknown as MessageElem)
    this.brief += "[合并转发]"
  }

  _file(type: BaseMessageElem["type"], elem: AMSFile) {
    this.after.push({ type, file: elem.data || elem.path || elem.url || "", url: elem.url } as BaseMessageElem)
  }

  file(elem: IMSFile) {
    this._file("file", elem)
  }

  image(elem: IMSImage) {
    this._file("image", elem)
    this.brief += "[图片]"
  }

  voice(elem: IMSVoice) {
    this._file("record", elem)
    this.brief += "[语音]"
  }

  audio(elem: IMSAudio) {
    this._file("record", elem)
    this.brief += "[音频]"
  }

  video(elem: IMSFile) {
    this._file("video", elem)
    this.brief += "[视频]"
  }
}