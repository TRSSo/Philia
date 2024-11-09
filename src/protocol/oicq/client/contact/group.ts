import { timestamp, NOOP, lock, hide } from "../common.js"
import { Contactable } from "./contactable.js"
import { GroupMessage, segment } from "../message/index.js"
import { Gfs } from "./gfs.js"
import {
  GroupAdminEvent,
  GroupInviteEvent,
  GroupSignEvent,
  GroupMessageEvent,
  GroupMuteEvent,
  GroupPokeEvent,
  GroupRecallEvent,
  GroupRequestEvent,
  GroupTransferEvent,
  MemberDecreaseEvent,
  MemberIncreaseEvent,
} from "../event/types.js"
import { GroupInfo, MemberInfo } from "./types.js"

type Client = import("../client.js").Client
type Member = import("./member.js").Member

const fetchmap = new Map<Group["gid"], Promise<Map<Member["uid"], MemberInfo>>>()
const weakmap = new WeakMap<GroupInfo, Group>()

/** 群聊消息事件 */
export interface GroupMessageEventMap {
  "message"(event: GroupMessageEvent): void
  /** 普通消息 */
  "message.normal"(event: GroupMessageEvent): void
  /** 匿名消息 */
  "message.anonymous"(event: GroupMessageEvent): void
}
/** 群聊通知事件 */
export interface GroupNoticeEventMap {
  "notice"(
    event:
      | MemberIncreaseEvent
      | GroupSignEvent
      | MemberDecreaseEvent
      | GroupRecallEvent
      | GroupAdminEvent
      | GroupMuteEvent
      | GroupTransferEvent
      | GroupPokeEvent,
  ): void
  /** 群员新增 */
  "notice.increase"(event: MemberIncreaseEvent): void
  /** 群员减少 */
  "notice.decrease"(event: MemberDecreaseEvent): void
  /** 消息撤回 */
  "notice.recall"(event: GroupRecallEvent): void
  /** 管理员变更 */
  "notice.admin"(event: GroupAdminEvent): void
  /** 群禁言 */
  "notice.ban"(event: GroupMuteEvent): void
  /** 群打卡 */
  "notice.sign"(event: GroupSignEvent): void
  /** 群转让 */
  "notice.transfer"(event: GroupTransferEvent): void
  /** 戳一戳 */
  "notice.poke"(event: GroupPokeEvent): void
}
/** 群聊申请事件 */
export interface GroupRequestEventMap {
  "request"(event: GroupRequestEvent | GroupInviteEvent): void
  /** 加群申请 */
  "request.add"(event: GroupRequestEvent): void
  /** 群邀请 */
  "request.invite"(event: GroupInviteEvent): void
}
/** 所有的群聊事件 */
export interface GroupEventMap
  extends GroupMessageEventMap,
  GroupNoticeEventMap,
  GroupRequestEventMap { }

/** 群 */
export interface Group {
  /** 撤回消息 */
  recallMsg(msg: GroupMessage): Promise<boolean>
  recallMsg(msgid: string): Promise<boolean>
  recallMsg(seq: number, rand: number, pktnum?: number): Promise<boolean>
}
/** 群 */
export class Group extends Contactable {
  static as(this: Client, gid: string, strict = false) {
    gid = String(gid)
    const info = this.gl.get(gid)
    if (strict && !info) throw new Error(`你尚未加入群` + gid)
    let group = weakmap.get(info!)
    if (group) return group
    group = new Group(this, gid, info)
    if (info) weakmap.set(info, group)
    return group
  }

  /** 群资料 */
  get info() {
    if (!this._info || timestamp() - this._info?.update_time! >= 900) this.renew().catch(NOOP)
    return this._info
  }

  /** 群名 */
  get name() {
    return this.info?.group_name
  }
  /** 我是否是群主 */
  get is_owner() {
    return this.info?.owner_id === this.c.uin
  }
  /** 我是否是管理 */
  get is_admin() {
    return this.is_owner || !!this.info?.admin_flag
  }
  /** 是否全员禁言 */
  get all_muted() {
    return this.info?.shutup_time_whole! > timestamp()
  }
  /** 我的禁言剩余时间 */
  get mute_left() {
    const t = this.info?.shutup_time_me! - timestamp()
    return t > 0 ? t : 0
  }

  /** 群文件系统 */
  readonly fs: Gfs

  protected constructor(
    c: Client,
    public readonly gid: string,
    private _info?: GroupInfo,
  ) {
    super(c)
    this.fs = new Gfs(c, gid)
    lock(this, "fs")
    hide(this, "_info")
  }

  /**
   * 获取群员实例
   * @param uid 群员账号
   * @param strict 严格模式，若群员不存在会抛出异常
   */
  pickMember(uid: string, strict = false) {
    return this.c.pickMember(this.gid, uid, strict)
  }

  /**
   * 获取群头像url
   * @param size 头像大小，默认`0`
   * @param history 历史头像记录，默认`0`，若要获取历史群头像则填写1,2,3...
   * @returns 头像的url地址
   */
  getAvatarUrl(size: 0 | 40 | 100 | 140 = 0, history = 0) {
    return (
      `https://p.qlogo.cn/gh/${this.gid}/${this.gid}${history ? "_" + history : ""}/` + size
    )
  }

  /** 强制刷新群资料 */
  async renew(): Promise<GroupInfo> {
    let info = await this.c.request("getGroupInfo", { id: this.gid }) as GroupInfo
    info = Object.assign(this.c.gl.get(this.gid) || this._info || {}, info)
    this.c.gl.set(this.gid, info)
    this._info = info
    weakmap.set(info, this)
    return info
  }

  private async _fetchMembers() {
    const list = await this.c.request("getGroupMemberArray", { id: this.gid }) as [Member["uid"], MemberInfo][]
    this.c.gml.set(this.gid, new Map(list))
    fetchmap.delete(this.gid)
    const mlist = this.c.gml.get(this.gid)
    if (!mlist?.size || !this.c.config.cache_group_member)
      this.c.gml.delete(this.gid)
    return mlist || new Map<Member["uid"], MemberInfo>()
  }

  /** 获取群员列表 */
  getMemberMap(no_cache = false) {
    const fetching = fetchmap.get(this.gid)
    if (fetching) return fetching
    const mlist = this.c.gml.get(this.gid)
    if (!mlist || no_cache) {
      const fetching = this._fetchMembers()
      fetchmap.set(this.gid, fetching)
      return fetching
    } else {
      return mlist
    }
  }

  /**
   * 添加精华消息
   * @param seq 消息序号
   * @param rand 消息的随机值
   */
  addEssence(seq: number, rand: number) {
    return this.c.request("addGroupEssence", { id: this.gid, seq, rand })
  }

  /**
   * 移除精华消息
   * @param seq 消息序号
   * @param rand 消息的随机值
   */
  removeEssence(seq: number, rand: number) {
    return this.c.request("delGroupEssence", { id: this.gid, seq, rand })
  }

  /**
   * 发送一个文件
   * @param file `string`表示从该本地文件路径上传，`Buffer`表示直接上传这段内容
   * @param pid 上传的目标目录id，默认根目录
   * @param name 上传的文件名，`file`为`Buffer`时，若留空则自动以md5命名
   * @returns 上传的文件属性
   */
  sendFile(file: string | Buffer, pid = "/", name?: string) {
    return this.sendMsg(segment.file(file, name, pid))
  }

  /**
   * 设置当前群成员消息屏蔽状态
   * @param member_id
   * @param isScreen
   */
  setScreenMemberMsg(member_id: string, isScreen?: boolean) {
    return this.pickMember(member_id).setScreenMsg(isScreen)
  }

  /** 全员禁言 */
  muteAll(yes = true) {
    return this.c.request("setGroupMute", { id: this.gid, uid: "all", yes })
  }
  /** 发送简易群公告 */
  announce(content: string) {
    return this.c.request("sendGroupAnnounce", { id: this.gid, content })
  }

  /** 获取 @全体成员 的剩余次数 */
  getAtAllRemainder() {
    return this.c.request("getGroupAtAllRemainder", { id: this.gid })
  }

  /**
   * 标记`seq`之前的消息为已读
   * @param seq 消息序号，默认为`0`，表示标记所有消息
   */
  markRead(seq = 0) {
    return this.c.request("setGroupReaded", { id: this.gid, seq })
  }

  /**
   * 获取`seq`之前的`cnt`条聊天记录，默认从最后一条发言往前，`cnt`默认20不能超过20
   * @param seq 消息序号，默认为`0`，表示从最后一条发言往前
   * @param count 聊天记录条数，默认`20`，超过`20`按`20`处理
   * @returns 群聊消息列表，服务器记录不足`cnt`条则返回能获取到的最多消息记录
   */
  getChatHistory(seq = 0, count = 20) {
    return this.c.request("getGroupChatHistory", { id: this.gid, seq, count })
  }

  /**
   * 邀请好友入群
   * @param uid 好友账号
   */
  invite(uid: string) {
    return this.c.request("sendGroupUserInvite", { id: this.gid, uid })
  }

  /** 打卡 */
  sign() {
    return this.c.request("sendGroupSign", { id: this.gid })
  }

  /** 退群，若为群主则解散该群 */
  quit() {
    return this.c.request("delGroup")
  }

  /**
   * 设置管理员，use {@link Member.setAdmin}
   * @param uid 群员账号
   * @param yes 是否设为管理员
   */
  setAdmin(uid: string, yes = true) {
    return this.pickMember(uid).setAdmin(yes)
  }
  /**
   * 设置头衔，use {@link Member.setTitle}
   * @param uid 群员账号
   * @param title 头衔名
   * @param duration 持续时间，默认`-1`，表示永久
   */
  setTitle(uid: string, title = "", duration = -1) {
    return this.pickMember(uid).setTitle(title, duration)
  }
  /**
   * 设置名片，use {@link Member.setCard}
   * @param uid 群员账号
   * @param card 名片
   */
  setCard(uid: string, card = "") {
    return this.pickMember(uid).setCard(card)
  }
  /**
   * 踢出此群，use {@link Member.kick}
   * @param uid 群员账号
   * @param msg @todo 未知参数
   * @param block 是否屏蔽群员
   */
  kickMember(uid: string, msg?: string, block = false) {
    return this.pickMember(uid).kick(msg, block)
  }
  /**
   * 禁言群员，use {@link Member.mute}
   * @param uid 群员账号
   * @param duration 禁言时长（秒），默认`600`
   */
  muteMember(uid: string, duration = 600) {
    return this.pickMember(uid).mute(duration)
  }
  /**
   * 戳一戳
   * @param uid 群员账号
   */
  pokeMember(uid: string) {
    return this.pickMember(uid).poke()
  }

  /**
   * 获取群内被禁言人
   * @returns
   */
  async getMuteMemberList() {
    return this.c.request("getGroupMuteMember", { id: this.gid })
  }

  /**
   * 添加表情表态，参考（https://bot.q.qq.com/wiki/develop/api-v2/openapi/emoji/model.html#EmojiType）
   * @param seq 消息序号
   * @param eid 表情ID
   * @param type 表情类型 EmojiType
  */
  setReaction(seq: number, eid: string, type: number = 1) {
    return this.c.request("setGroupReaction", { id: this.gid, seq, eid, type })
  }
}