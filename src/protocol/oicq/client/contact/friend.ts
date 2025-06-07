import { timestamp, lock, hide } from "../common.js"
import { PrivateMessage, segment } from "../message/index.js"
import {
  FriendDecreaseEvent,
  FriendIncreaseEvent,
  FriendPokeEvent,
  FriendRecallEvent,
  FriendRequestEvent,
  GroupInviteEvent,
  PrivateMessageEvent,
} from "../event/types.js"
import { FriendInfo } from "./types.js"
import { Contactable } from "./contactable.js"
import { Event as PhiliaEvent } from "#protocol/type"

type Client = import("../client.js").Client

const weakmap = new WeakMap<FriendInfo, User>()

/** 用户 */
export class User extends Contactable {
  /** `this.uid`的别名 */
  get user_id() {
    return this.uid
  }

  static as(this: Client, uid: string, strict = false) {
    uid = String(uid)
    const info = this.fl.get(uid)
    if (strict && !info) throw new Error(uid + `不是你的好友`)
    let friend = weakmap.get(info!)
    if (friend) return friend
    friend = new User(this, uid, info)
    if (info) weakmap.set(info, friend)
    return friend
  }

  protected constructor(
    c: Client,
    public readonly uid: string,
    private _info?: FriendInfo,
  ) {
    super(c)
    lock(this, "uid")
    hide(this, "_info")
  }

  /** 返回作为好友的实例 */
  asFriend(strict = false) {
    return this.c.pickFriend(this.uid, strict)
  }

  /** 返回作为某群群员的实例 */
  asMember(gid: string, strict = false) {
    return this.c.pickMember(gid, this.uid, strict)
  }

  /**
   * 获取头像url
   * @param size 头像大小，默认`0`
   * @returns 头像的url地址
   */
  getAvatarUrl(size: 0 | 40 | 100 | 140 = 0) {
    return this.info?.avatar || `https://q.qlogo.cn/g?b=qq&s=${size}&nk=` + this.uid
  }

  /**
   * 点赞，支持陌生人点赞
   * @param times 点赞次数，默认1次
   */
  async thumbUp(times = 1) {
    return this.c.api.sendUserLike({ id: this.uid, times })
  }

  /** 查看资料 */
  async getSimpleInfo() {
    return this.info
  }

  /**
   * 获取`time`往前的`cnt`条聊天记录
   * @param time 默认当前时间，为时间戳的分钟数（`Date.now() / 1000`）
   * @param cnt 聊天记录条数，默认`20`
   * @returns 私聊消息列表，服务器记录不足`cnt`条则返回能获取到的最多消息记录
   */
  async getChatHistory(time = timestamp(), count = 20) {
    let mid: string | undefined = (
      await this.c.api.getChatHistory({ type: "user", id: this.uid, count: 1 }).catch(() => [])
    )[0]?.id
    if (!mid) return []

    const ret: PrivateMessage[] = []
    for (let i = 0; i < 100; i++) {
      const msg = (await this.c.api
        .getChatHistory({ type: "message", id: mid, count: 11 })
        .catch(() => [])) as PhiliaEvent.UserMessage[]
      mid = msg.length > 1 ? msg.pop()?.id : undefined

      for (const i of msg)
        try {
          if (i.time <= time) {
            ret.push(await new PrivateMessage(this.c, i).parse())
            if (ret.length >= count) return ret
          }
        } catch {}
      if (!mid) break
    }
    return ret
  }

  /**
   * 标记`time`之前为已读
   * @param time 默认当前时间，为时间戳的分钟数（`Date.now() / 1000`）
   */
  async markRead(time = timestamp()) {
    return this.c.api.setReaded({ id: (await this.getChatHistory(time, 1))[0].message_id })
  }

  /**
   * 回添双向好友
   * @param seq 申请消息序号
   * @param mark 好友备注
   */
  async addFriendBack(seq: number, remark = "") {
    return this.c.api.addUserBack({ id: this.uid, seq, remark })
  }

  /**
   * 处理好友申请
   * @param seq 申请消息序号
   * @param result 是否同意
   * @param remark 好友备注
   * @param block 是否屏蔽来自此用户的申请
   */
  async setFriendReq(seq: number, result = true, remark = "", block = false) {
    const requests = await this.c.api.getRequestArray()
    const request = requests.find(i => i.user?.id === this.uid && i.seq === seq)
    if (!request) throw Error("请求不存在")
    const ret = await this.c.api.setRequest({ id: request.id, result, block })
    if (remark) this.setRemark(remark)
    return ret
  }

  /**
   * 处理入群申请
   * @param gid 群号
   * @param seq 申请消息序号
   * @param result 是否同意
   * @param reason 若拒绝，拒绝的原因
   * @param block 是否屏蔽来自此用户的申请
   */
  async setGroupReq(gid: string, seq: number, result = true, reason = "", block = false) {
    const requests = await this.c.api.getRequestArray()
    const request = requests.find(
      i => i.user?.id === this.uid && i.group?.id === gid && i.seq === seq,
    )
    if (!request) throw Error("请求不存在")
    return this.c.api.setRequest({ id: request.id, result, reason, block })
  }

  /**
   * 处理群邀请
   * @param gid 群号
   * @param seq 申请消息序号
   * @param result 是否同意
   * @param block 是否屏蔽来自此群的邀请
   */
  async setGroupInvite(gid: string, seq: number, result = true, block = false) {
    const requests = await this.c.api.getRequestArray()
    const request = requests.find(
      i => i.user?.id === this.uid && i.group?.id === gid && i.seq === seq,
    )
    if (!request) throw Error("请求不存在")
    return this.c.api.setRequest({ id: request.id, result, block })
  }

  /** 好友 */

  /** 好友资料 */
  get info() {
    return this._info
  }

  /** 昵称 */
  get nickname() {
    return this.info?.nickname
  }
  /** 性别 */
  get sex() {
    return this.info?.sex
  }
  /** 备注 */
  get remark() {
    return this.info?.remark
  }
  /** 分组id */
  get class_id() {
    return this.info?.class_id
  }
  /** 分组名 */
  get class_name() {
    return this.c.classes.get(this.info?.class_id!)
  }

  /** 设置分组(注意：如果分组id不存在也会成功) */
  async setClass(name: number) {
    return this.c.api.setUserClass({ name, id: this.uid })
  }

  /** 戳一戳 */
  async poke(self = false) {
    return this.c.api.sendPoke({ scene: "user", id: this.uid, tid: self ? this.c.uin : this.uid })
  }

  /**
   * 删除好友
   * @param block 屏蔽此好友的申请，默认为`true`
   */
  async delete(block = true) {
    return this.c.api.delUser({ id: this.uid, block })
  }

  /**
   * 查找机器人与这个人的共群
   * @returns
   */
  async searchSameGroup() {
    return (await this.c.api.searchUserSameGroup({ id: this.uid })).map(i => ({
      ...i,
      groupName: i.name,
      Group_Id: i.id,
    }))
  }

  /**
   * 发送离线文件
   * @param file `string`表示从该本地文件路径获取，`Buffer`表示直接发送这段内容
   * @param name 对方看到的文件名，`file`为`Buffer`时，若留空则自动以md5命名
   */
  async sendFile(file: string | Buffer, name?: string) {
    return (await this.sendMsg(segment.file(file, name))).message_id
  }
}

/** 私聊消息事件 */
export interface PrivateMessageEventMap {
  "message"(event: PrivateMessageEvent): void
  /** 好友的消息 */
  "message.friend"(event: PrivateMessageEvent): void
  /** 群临时对话 */
  "message.group"(event: PrivateMessageEvent): void
  /** 其他途径 */
  "message.other"(event: PrivateMessageEvent): void
  /** 我的设备 */
  "message.self"(event: PrivateMessageEvent): void
}
/** 好友通知事件 */
export interface FriendNoticeEventMap {
  "notice"(
    event: FriendIncreaseEvent | FriendDecreaseEvent | FriendRecallEvent | FriendPokeEvent,
  ): void
  /** 新增好友 */
  "notice.increase"(event: FriendIncreaseEvent): void
  /** 好友减少 */
  "notice.decrease"(event: FriendDecreaseEvent): void
  /** 撤回消息 */
  "notice.recall"(event: FriendRecallEvent): void
  /** 戳一戳 */
  "notice.poke"(event: FriendPokeEvent): void
}
/** 好友申请事件 */
export interface FriendRequestEventMap {
  "request"(event: FriendRequestEvent): void
  /** 群邀请 */
  "request.invite"(event: GroupInviteEvent): void
  /** 添加好友 */
  "request.add"(event: FriendRequestEvent): void
  /** 单向好友 */
  "request.single"(event: FriendRequestEvent): void
}
/** 所有的好友事件 */
export interface FriendEventMap
  extends PrivateMessageEventMap,
    FriendNoticeEventMap,
    FriendRequestEventMap {}

export const Friend = User
export type Friend = User
