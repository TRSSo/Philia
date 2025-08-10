import querystring from "node:querystring"
import type { Event } from "#protocol/type"
import type { Client } from "../app.js"
import { lock } from "../common.js"
import type { Friend, Gender, Group, GroupRole, Member } from "../contact/index.js"
import type { MessageRet } from "../event/types.js"
import { PhiliaToOICQ } from "./converter.js"
import type { Forwardable, MessageElem, Quotable, Sendable } from "./elements.js"

/** 一条消息 */
export abstract class Message implements Quotable, Forwardable {
  protected readonly parsed: PhiliaToOICQ

  /**
   * 私聊永远指向对方，群聊指向消息发送者。
   * 对于私聊消息，请使用`from_id`和`to_id`来确定发送者和接收者。
   */
  get user_id(): string {
    return this.sender.user_id
  }

  /** 发送方昵称 */
  get nickname(): string {
    return this.sender?.card || this.sender?.nickname || ""
  }

  post_type = "message" as const
  /** 消息时间 */
  time: number
  /** 消息元素数组 */
  message: MessageElem[] = []
  /** 字符串形式的消息 */
  raw_message: string = ""
  font: string
  /** @cqhttp 方法用 */
  message_id: string
  /** 消息编号，在群消息中是唯一的 (私聊消息建议至少使用time,seq,rand中的两个判断唯一性) */
  seq: number | string
  /** 消息随机数 */
  rand: number
  /** 发送方信息 */
  sender: {
    /** 账号 */
    user_id: string
    /** 昵称 */
    nickname: string
    /** 群号，当消息来自群聊时有效 */
    group_id?: string
    /** @todo 未知属性 */
    sub_id: number
    /** 名片 */
    card: string
    /** 性别，@deprecated */
    sex: Gender
    /** 年龄，@deprecated */
    age: string
    /** 地区，@deprecated */
    area: string
    /** 等级 */
    level: number
    /** 权限 */
    role: GroupRole
    /** 头衔 */
    title: string
    /** 平台额外字段 */
    [k: string]: any
  }

  /** 引用回复 */
  source?: Quotable
  /**
   * 快速回复
   * @param content 消息内容
   * @param quote 引用这条消息(默认false)
   */
  abstract reply(content: Sendable, quote?: boolean): Promise<MessageRet>

  /** 反序列化一条消息 (私聊消息需要你的uin) */
  deserialize(event: Event.Message) {
    switch (event.scene) {
      case "group":
        return new GroupMessage(this.c, event)
      default:
        return new PrivateMessage(this.c, event)
    }
  }

  constructor(
    protected readonly c: Client,
    protected event: Event.Message,
  ) {
    lock(this, "c")
    this.sender = {
      user_id: event.user.id,
      nickname: event.user.name,
      ...event.user,
    } as unknown as typeof this.sender
    this.time = event.time
    this.message_id = event.id
    this.seq = (event.seq as number) || this.message_id
    this.rand = (event.rand as number) || 0
    this.font = (event.font as string) || "unknown"
    this.raw_message = event.summary
    this.parsed = new PhiliaToOICQ(this.c, event.message)
    lock(this, "parsed")
  }

  async parse() {
    await this.parsed.convert()
    this.message = this.parsed.after
    this.raw_message ??= this.parsed.brief
    if (this.parsed.source) this.source = this.parsed.source
    return this
  }

  /** 将消息序列化保存 */
  serialize() {
    return JSON.stringify(this.event)
  }

  /** 以适合人类阅读的形式输出 */
  toString() {
    return this.parsed.content
  }
  toJSON(keys: string[]): Record<string, any> {
    return Object.fromEntries(
      Object.keys(this)
        .filter(key => {
          return typeof this[key as keyof this] !== "function" && !keys.includes(key)
        })
        .map(key => {
          return [key, this[key as keyof this]]
        }),
    )
  }

  /** @deprecated 转换为CQ码 */
  toCqcode() {
    const mCQInside = {
      "&": "&amp;",
      ",": "&#44;",
      "[": "&#91;",
      "]": "&#93;",
    }
    let CQCode = ""

    if (this.source) {
      CQCode += `[CQ:reply,id=${this.source.message_id}]`
    }

    ;(this.message || []).forEach(c => {
      if ("text" === c.type) {
        CQCode += c.text
        return
      }
      const s = querystring.stringify(c as any, ",", "=", {
        encodeURIComponent: s =>
          s.replace(
            new RegExp(Object.keys(mCQInside).join("|"), "g"),
            ((s: "&" | "," | "[" | "]") => mCQInside[s] || "") as any,
          ),
      })
      CQCode += `[CQ:${c.type}${s ? "," : ""}${s}]`
    })
    return CQCode
  }
}

/** 一条私聊消息 */
export class PrivateMessage extends Message {
  message_type = "private" as const
  /**
   * @type {"friend"} 好友
   * @type {"group"} 群临时会话
   * @type {"other"} 其他途径的临时会话
   * @type {"self"} 我的设备
   */
  sub_type: "friend" | "group" | "other" | "self" = "friend"
  /** 发送方账号 */
  from_id: string
  /** 接收方账号 */
  to_id: string
  /** 好友对象 */
  friend: Friend

  /** 反序列化一条私聊消息，你需要传入你的`uin`，否则无法知道你是发送者还是接收者 */
  deserialize(event: Event.UserMessage) {
    return new PrivateMessage(this.c, event)
  }

  constructor(c: Client, event: Event.UserMessage) {
    super(c, event)
    this.from_id = event.is_self ? this.c.uin : event.user.id
    this.to_id = event.is_self ? event.user.id : this.c.uin
    this.friend = c.pickFriend(this.user_id)
  }

  reply(content: Sendable, quote = false) {
    return this.friend.sendMsg(content, quote ? this : undefined)
  }
}

/** 一条群消息 */
export class GroupMessage extends Message {
  message_type = "group" as const
  /** 普通消息 */
  sub_type = "normal" as const
  /** 群号 */
  group_id: string
  /** 群名 */
  group_name: string
  /** 是否AT我 */
  atme: boolean
  /** 是否AT全体成员 */
  atall: boolean
  /** 群对象 */
  group: Group
  /** 发送者群员对象 */
  member: Member

  /** 反序列化一条群消息 */
  deserialize(event: Event.GroupMessage) {
    return new GroupMessage(this.c, event)
  }

  constructor(c: Client, event: Event.GroupMessage) {
    super(c, event)
    this.group_id = event.group.id
    this.group_name = event.group.name
    this.atme = this.parsed.atme
    this.atall = this.parsed.atall
    this.group = c.pickGroup(this.group_id)
    this.member = c.pickMember(this.group_id, this.user_id)
  }

  /** 快速撤回 */
  recall() {
    return this.group.recallMsg(this)
  }

  reply(content: Sendable, quote = false) {
    return this.group.sendMsg(content, quote ? this : undefined)
  }
}
