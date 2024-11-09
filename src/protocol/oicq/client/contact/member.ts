import { timestamp, NOOP, lock, hide } from "../common.js"
import { MemberInfo } from "./types.js"
import { User } from "./friend.js"
import { GroupEventMap } from "./group.js"

type Client = import("../client.js").Client

const weakmap = new WeakMap<MemberInfo, Member>()

/** 群员事件(= {@link GroupEventMap}) */
export interface MemberEventMap extends GroupEventMap { }

/** @ts-expect-error ts(2415) 群员 */
export class Member extends User {
  static as(this: Client, gid: string, uid: string, strict = false) {
    gid = String(gid)
    uid = String(uid)
    const info = this.gml.get(gid)?.get(uid)
    if (strict && !info) throw new Error(`群${gid}中找不到群员` + uid)
    let member = weakmap.get(info!)
    if (member) return member
    member = new Member(this, gid, uid, info)
    if (info) weakmap.set(info, member)
    return member
  }

  /** 群员资料 */
  get info() {
    if (!this.c.config.cache_group_member) return this._info
    if (!this._info || timestamp() - this._info?.update_time! >= 900) this.renew().catch(NOOP)
    return this._info
  }

  /** {@link gid} 的别名 */
  get group_id() {
    return this.gid
  }

  /** 名片 */
  get card() {
    return this.info?.card || this.info?.nickname
  }

  /** 头衔 */
  get title() {
    return this.info?.title
  }

  /** 是否是我的好友 */
  get is_friend() {
    return this.c.fl.has(this.uid)
  }

  /** 是否是群主 */
  get is_owner() {
    return this.info?.role === "owner"
  }

  /** 是否是管理员 */
  get is_admin() {
    return this.info?.role === "admin" || this.is_owner
  }

  /** 禁言剩余时间 */
  get mute_left() {
    const t = this.info?.shutup_time! - timestamp()
    return t > 0 ? t : 0
  }

  /** 返回所在群的实例 */
  get group() {
    return this.c.pickGroup(this.gid)
  }

  protected constructor(
    c: Client,
    public readonly gid: string,
    uid: string,
    private _info?: MemberInfo,
  ) {
    super(c, uid)
    lock(this, "gid")
    hide(this, "_info")
  }

  /** 强制刷新群员资料 */
  async renew(): Promise<MemberInfo> {
    let info = await this.c.request("getGroupMemberInfo", { id: this.gid, uid: this.uid }) as MemberInfo
    info = Object.assign(this.c.gml.get(this.gid)?.get(this.uid) || this._info || {}, info)
    this.c.gml.get(this.gid)?.set(this.uid, info)
    this._info = info
    weakmap.set(info, this)
    return info
  }

  /**
   * 设置/取消管理员
   * @param yes 是否设为管理员
   */
  setAdmin(yes = true) {
    return this.c.request("setGroupAdmin", { id: this.gid, uid: this.uid, yes }) as Promise<MemberInfo>
  }

  /**
   * 设置头衔
   * @param title 头衔名
   * @param duration 持续时间，默认`-1`，表示永久
   */
  async setTitle(title = "", duration = -1) {
    return this.c.request("setGroupMemberTitle", { id: this.gid, uid: this.uid, title, duration })
  }

  /**
   * 修改名片
   * @param card 名片
   */
  async setCard(card = "") {
    return this.c.request("setGroupMemberCard", { id: this.gid, uid: this.uid, card })
  }

  /**
   * 踢出群
   * @param msg @todo 未知参数
   * @param block 是否屏蔽群员
   */
  async kick(msg?: string, block = false) {
    return this.c.request("delGroupMember", { id: this.gid, uid: this.uid, msg, block })
  }

  /**
   * 禁言
   * @param duration 禁言时长（秒），默认`1800`
   */
  async mute(duration = 1800) {
    return this.c.request("setGroupMemberMute", { id: this.gid, uid: this.uid, duration })
  }

  /** 戳一戳 */
  async poke() {
    return this.c.request("sendGroupMemberPoke", { id: this.gid, uid: this.uid })
  }

  /**
   * 是否屏蔽该群成员消息
   * @param yes
   */
  async setScreenMsg(yes: boolean = true) {
    return this.c.request("setGroupMemberBlack", { id: this.gid, uid: this.uid, yes })
  }

  /**
   * 加为好友
   * @param comment 申请消息
   */
  async addFriend(comment = "") {
    return this.c.request("sendGroupMemberAddFriend", { id: this.gid, uid: this.uid, comment })
  }
}