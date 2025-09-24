import events from "node:events"
import * as Connect from "#connect"
import { getLogger, type Logger } from "#logger"
import { createAPI } from "#protocol/common"
import type * as Philia from "#protocol/type"
import { promiseEvent } from "#util"
import { timestamp } from "./common.js"
import { Friend, User } from "./contact/friend.js"
import { Group } from "./contact/group.js"
import { Member } from "./contact/member.js"
import {
  type Domain,
  type FriendInfo,
  type Gender,
  type GroupInfo,
  type MemberInfo,
  OnlineStatus,
  type StrangerInfo,
} from "./contact/types.js"
import Handle from "./event/handle.js"
import {
  type Forwardable,
  type ImageElem,
  Message,
  OICQtoPhilia,
  type Quotable,
  type Sendable,
} from "./message/index.js"

/** 一个应用端 */
export class Client extends events {
  uin: string = ""
  /**
   * 得到一个群对象, 通常不会重复创建、调用
   * @param gid 群号
   * @param strict 严格模式，若群不存在会抛出异常
   * @returns 一个`Group`对象
   */
  readonly pickGroup = Group.as.bind(this)
  /**
   * 得到一个用户对象, 通常不会重复创建、调用
   * @param uid 用户账号
   * @param strict 严格模式，若用户不是好友会抛出异常
   * @returns 一个`Friend`对象
   */
  readonly pickUser = User.as.bind(this)
  /** {@link Client.pickUser} */
  readonly pickFriend = Friend.as.bind(this)
  /**
   * 得到一个群员对象, 通常不会重复创建、调用
   * @param gid 群员所在的群号
   * @param uid 群员的账号
   * @param strict 严格模式，若群员不存在会抛出异常
   * @returns 一个`Member`对象
   */
  readonly pickMember = Member.as.bind(this)

  /** 日志记录器 */
  logger: Logger
  /** 配置 */
  readonly config: Required<Omit<Config, "logger">>

  get [Symbol.toStringTag]() {
    return "OicqClient"
  }

  /** 好友列表 */
  fl = new Map<string, FriendInfo>()
  /** 陌生人列表 */
  sl = new Map<string, StrangerInfo>()
  /** 群列表 */
  gl = new Map<string, GroupInfo>()
  /** 群员列表缓存 */
  gml = new Map<string, Map<string, MemberInfo>>()
  /** 黑名单列表 */
  blacklist = new Set<string>()
  /** 好友分组 */
  classes = new Map<number, string>()

  /** 勿手动修改这些属性 */
  /** 自己信息 */
  self_info: Philia.Contact.Self = { id: "", name: "" }
  /** 版本信息 */
  version_info = {} as Philia.API.Base["getVersion"]["response"]
  /** 在线状态 */
  status: OnlineStatus = OnlineStatus.Offline
  /** 昵称 */
  get nickname() {
    return this.self_info.name
  }
  /** 性别 */
  get sex() {
    return this.self_info.sex as Gender
  }
  /** 年龄 */
  get age() {
    return this.self_info.age as number
  }
  get apk() {
    return this.version_info.proto
  }

  protected readonly statistics = {
    start_time: timestamp(),
    lost_times: 0,
    recv_pkt_cnt: 0,
    sent_pkt_cnt: 0,
    lost_pkt_cnt: 0,
    recv_msg_cnt: 0,
    sent_msg_cnt: 0,
    msg_cnt_per_min: 0,
    remote_ip: "",
    remote_port: 0,
    ver: "",
  }

  handle = new Handle(this)
  api!: ReturnType<typeof createAPI<Philia.API.API>>
  client!: Connect.Common.Client
  /** 是否为在线状态 (可以收发业务包的状态) */
  isOnline() {
    return this.client?.open
  }
  path?: string

  /** 下线 */
  logout() {
    return this.client.close()
  }

  /** OICQ 内部方法 */
  writeUni(...args: unknown[]) {
    return this.api.writeUni(args)
  }
  sendOidb(...args: unknown[]) {
    return this.api.sendOidb(args)
  }
  sendPacket(...args: unknown[]) {
    return this.api.sendPacket(args)
  }
  sendUni(...args: unknown[]) {
    return this.api.sendUni(args)
  }
  sendOidbSvcTrpcTcp(...args: unknown[]) {
    return this.api.sendOidbSvcTrpcTcp(args)
  }

  /** csrf token */
  bkn?: number
  cookies?: { [domain in Domain]: string }

  /** 数据统计 */
  get stat() {
    return this.statistics
  }

  connected_fn = this.online.bind(this)
  closed_fn = () => this.em("system.offline.network", { message: "连接断开" })

  /**
   * 继承原版`oicq`的构造方式，建议使用另一个构造函数
   * @param uin 账号
   * @param conf 配置
   */
  constructor(uin: string, conf?: Config)
  /**
   * 账号在调用 {@link login} 时传入
   * @param conf 配置
   */
  constructor(conf?: Config)
  constructor(uin?: string | Config, conf?: Config) {
    super()
    if (uin instanceof Connect.Common.Client) {
      this.client = uin
      this.client.handle.setMap(this.handle)
      this.api = createAPI<Philia.API.API>(this.client)
      this.client.connected_fn = this.connected_fn
      this.client.closed_fn = this.closed_fn
    } else {
      if (typeof uin === "object") conf = uin
      else this.uin = String(uin)
    }

    this.logger = conf?.logger ?? getLogger("oicq")
    this.config = {
      ignore_self: true,
      cache_group_member: true,
      reconn_interval: 5,
      ...conf,
    }
  }

  /**
   * 只能在初始化Client时传了`uin`才能调用
   * @param path Socket 连接地址
   */
  login(path?: string): Promise<void>
  /**
   * @param uin 登录账号
   * @param path Socket 连接地址
   */
  login(uin?: string, path?: string): Promise<void>
  login(uin?: string, path?: string) {
    if (this.isOnline()) {
      this.online()
    } else {
      if (this.uin) path = uin || this.path
      else this.uin = String(uin)
      this.path = path
      this.connect()
    }
    return promiseEvent<undefined>(this, "system.online", "system.login.error")
  }

  connect(path = this.path) {
    if (!path) return this.em("system.login.error", Error("连接地址为空"))
    this.logger.mark(`正在连接`, path)
    this.client = /^(http|ws)s?:\/\//.test(path)
      ? new Connect.WebSocket.Client(this.logger, this.handle, {
          path,
          connected_fn: this.connected_fn,
          closed_fn: this.closed_fn,
        })
      : (this.client = new Connect.Socket.Client(this.logger, this.handle, {
          path,
          connected_fn: this.connected_fn,
          closed_fn: this.closed_fn,
        }))
    this.client.logger = this.logger
    this.api = createAPI<Philia.API.API>(this.client)
    return this.client.connect()
  }

  async online() {
    try {
      this.self_info = await this.api.getSelfInfo()
      this.version_info = await this.api.getVersion()
      this.uin = this.self_info.id
      this.logger.mark(`欢迎 ${this.nickname}(${this.uin})！正在加载资源……`)
      this.logger.mark(`使用协议 ${this.apk.name}(${this.apk.id}) ${this.apk.version}`)

      await this.reloadFriendList()
      if (this.config.cache_group_member) await this.reloadGroupMemberList()
      else await this.reloadGroupList()
      this.logger.mark(
        `加载了${this.fl.size}个好友，${this.gl.size}个群，${Array.from(this.gml.values()).reduce(
          (n, i) => n + i.size,
          0,
        )}个群成员`,
      )

      this.api
        .getSelfCookie()
        .then(d => (this.cookies = d as { [domain in Domain]: string }))
        .catch(() => {})
      this.api
        .getSelfCSRFToken()
        .then(d => (this.bkn = d))
        .catch(() => {})

      await this.api.receiveEvent({ event: Handle.event })
      this.em("system.online")
    } catch (err) {
      this.em("system.login.error", err)
    }
  }

  /** 上传文件到缓存目录 */
  uploadFile(file: string | Buffer) {
    return this.api.uploadCacheFile({ file })
  }

  /** 设置在线状态 */
  setOnlineStatus(online_status = this.status || OnlineStatus.Online) {
    return this.api.setSelfInfo({ data: { online_status } })
  }

  /** 设置昵称 */
  setNickname(name: string) {
    return this.api.setSelfInfo({ data: { name } })
  }

  /**
   * 设置性别
   * @param gender 0：未知，1：男，2：女
   */
  setGender(gender: 0 | 1 | 2) {
    return this.api.setSelfInfo({ data: { gender } })
  }

  /**
   * 设置生日
   * @param birthday `YYYYMMDD`格式的`string`（会过滤非数字字符）或`number`
   * */
  setBirthday(birthday: string | number) {
    birthday = String(birthday).replace(/[^\d]/g, "")
    return this.api.setSelfInfo({ data: { birthday } })
  }

  /** 设置个人说明 */
  setDescription(description = "") {
    return this.api.setSelfInfo({ data: { description } })
  }

  /** 设置个性签名 */
  setSignature(signature = "") {
    return this.api.setSelfInfo({ data: { signature } })
  }

  /** 获取用户资料卡信息 */
  getProfile(id: string) {
    return this.api.getUserInfo({ id })
  }

  /** 设置头像 */
  setAvatar(avatar: ImageElem["file"]) {
    return this.api.setSelfInfo({ data: { avatar } })
  }

  /** 获取漫游表情 */
  getRoamingStamp(no_cache = false) {
    return this.api.getRoamingStamp({ refresh: !no_cache })
  }

  /** 删除表情(支持批量) */
  deleteStamp(id: string | string[]) {
    return this.api.delRoamingStamp({ id })
  }

  /** 获取系统消息 */
  getSystemMsg() {
    return this.api.getRequestArray()
  }

  /** 添加好友分组 */
  addClass(name: string) {
    return this.api.addUserClass({ name })
  }

  /** 删除好友分组 */
  deleteClass(name: number) {
    return this.api.delUserClass({ name })
  }

  /** 重命名好友分组 */
  renameClass(name: number, new_name: string) {
    return this.api.renameUserClass({ name, new_name })
  }

  /** 重载好友列表 */
  async reloadFriendList() {
    const array = await this.api.getUserArray({ refresh: true })
    const map = new Map<string, FriendInfo>()
    for (const i of array)
      map.set(i.id, {
        ...i,
        user_id: i.id,
        nickname: i.name,
      } as unknown as FriendInfo)
    return (this.fl = map)
  }

  /** 重载陌生人列表 */
  reloadStrangerList() {
    return this.sl
  }

  /** 重载群列表 */
  async reloadGroupList() {
    const array = await this.api.getGroupArray({ refresh: true })
    const map = new Map<string, GroupInfo>()
    for (const i of array)
      map.set(i.id, {
        ...i,
        group_id: i.id,
        group_name: i.name,
      } as unknown as GroupInfo)
    return (this.gl = map)
  }

  /** 重载群成员列表 */
  async reloadGroupMemberList() {
    await Promise.allSettled(
      [...(await this.reloadGroupList()).keys()].map(i => this.pickGroup(i).getMemberMap(true)),
    )
    return this.gml
  }

  /** 重载黑名单 */
  reloadBlackList() {
    return this.blacklist
  }

  /** 清空缓存文件 */
  cleanCache() {
    return this.api.clearCache()
  }

  /**
   * 获取视频下载地址
   * use {@link Friend.getVideoUrl}
   */
  getVideoUrl(fid: string) {
    return this.pickFriend(this.uin).getVideoUrl(fid)
  }

  /**
   * 获取转发消息
   * use {@link Friend.getForwardMsg}
   */
  getForwardMsg(resid: string) {
    return this.pickFriend(this.uin).getForwardMsg(resid)
  }
  /**
   * 制作转发消息
   * use {@link Friend.makeForwardMsg} or {@link Group.makeForwardMsg}
   */
  makeForwardMsg(fake: Forwardable[], dm: boolean = false) {
    return (dm ? this.pickFriend : this.pickGroup)(this.uin).makeForwardMsg(fake)
  }

  /** Ocr图片转文字 */
  async imageOcr(file: ImageElem["file"]) {
    const image = await OICQtoPhilia.prototype._prepareFile<Philia.Message.Image>({
      type: "image",
      file,
    })
    return this.api.getImageOCR({ image })
  }

  /** @cqhttp (cqhttp遗留方法) use {@link cookies[domain]} */
  getCookies(domain: Domain = "") {
    return this.cookies?.[domain]
  }

  /** @cqhttp use {@link bkn} */
  getCsrfToken() {
    return this.bkn
  }

  /** @cqhttp use {@link fl} */
  getFriendList() {
    return this.fl
  }

  /** @cqhttp use {@link gl} */
  getGroupList() {
    return this.gl
  }

  /**
   * 添加群精华消息
   * use {@link Group.addEssence}
   * @param id 消息id
   */
  setEssenceMessage(id: string) {
    return this.api.addGroupEssence({ id })
  }

  /**
   * 移除群精华消息
   * use {@link Group.removeEssence}
   * @param id 消息id
   */
  removeEssenceMessage(id: string) {
    return this.api.delGroupEssence({ id })
  }

  /** @cqhttp use {@link sl} */
  getStrangerList() {
    return this.sl
  }

  /** @cqhttp use {@link User.getSimpleInfo} */
  getStrangerInfo(user_id: string) {
    return this.pickUser(user_id).getSimpleInfo()
  }

  /** @cqhttp use {@link Group.info} or {@link Group.renew} */
  getGroupInfo(group_id: string, no_cache = false) {
    const group = this.pickGroup(group_id)
    if (no_cache) return group.renew()
    return group.info || group.renew()
  }

  /** @cqhttp use {@link Group.getMemberMap} */
  getGroupMemberList(group_id: string, no_cache = false) {
    return this.pickGroup(group_id).getMemberMap(no_cache)
  }

  /** @cqhttp use {@link Member.info} or {@link Member.renew} */
  getGroupMemberInfo(group_id: string, user_id: string, no_cache = false) {
    if (no_cache || !this.gml.get(group_id)?.has(user_id))
      return this.pickMember(group_id, user_id).renew()
    return this.gml.get(group_id)?.get(user_id)
  }

  /** @cqhttp use {@link Friend.sendMsg} */
  sendPrivateMsg(user_id: string, message: Sendable, source?: Quotable) {
    return this.pickFriend(user_id).sendMsg(message, source)
  }

  /** @cqhttp use {@link Group.sendMsg} */
  sendGroupMsg(group_id: string, message: Sendable, source?: Quotable) {
    return this.pickGroup(group_id).sendMsg(message, source)
  }

  /** @cqhttp use {@link Group.sign} */
  sendGroupSign(group_id: string) {
    return this.pickGroup(group_id).sign()
  }

  /** @cqhttp use {@link Member.sendMsg} */
  sendTempMsg(group_id: string, user_id: string, message: Sendable) {
    return this.pickMember(group_id, user_id).sendMsg(message)
  }

  /** @cqhttp use {@link User.recallMsg} or {@link Group.recallMsg} */
  deleteMsg(id: string) {
    return this.api.delMsg({ id })
  }

  /** @cqhttp use {@link User.remarkRead} or {@link Group.remarkRead} */
  reportReaded(id: string) {
    return this.api.setReaded({ id })
  }

  /** @cqhttp use {@link User.getChatHistory} or {@link Group.getChatHistory} */
  async getMsg(id: string) {
    return Message.deserialize(this, await this.api.getMsg({ id }))
  }

  /** @cqhttp use {@link User.getChatHistory} or {@link Group.getChatHistory} */
  getChatHistory(id: string, count = 20) {
    return this.api.getChatHistory({ type: "message", id, count })
  }

  /** @cqhttp use {@link Group.muteAll} */
  setGroupWholeBan(group_id: string, enable = true) {
    return this.pickGroup(group_id).muteAll(enable)
  }

  /**
   * 设置当前群成员消息屏蔽状态
   * @param group_id {number} 群号
   * @param member_id {number} 成员QQ号
   * @param isScreen {boolean} 是否屏蔽 默认true
   */
  setGroupMemberScreenMsg(group_id: string, member_id: string, isScreen?: boolean) {
    return this.pickGroup(group_id).setScreenMemberMsg(member_id, isScreen)
  }

  /** @cqhttp use {@link Group.setName} */
  setGroupName(group_id: string, name: string) {
    return this.pickGroup(group_id).setName(name)
  }

  /** @cqhttp use {@link Group.announce} */
  sendGroupNotice(group_id: string, content: string) {
    return this.pickGroup(group_id).announce(content)
  }

  /** @cqhttp use {@link Group.setAdmin} or {@link Member.setAdmin} */
  setGroupAdmin(group_id: string, user_id: string, enable = true) {
    return this.pickMember(group_id, user_id).setAdmin(enable)
  }

  /** @cqhttp use {@link Group.setTitle} or {@link Member.setTitle} */
  setGroupSpecialTitle(group_id: string, user_id: string, special_title: string, duration = -1) {
    return this.pickMember(group_id, user_id).setTitle(special_title, duration)
  }

  /** @cqhttp use {@link Group.setCard} or {@link Member.setCard} */
  setGroupCard(group_id: string, user_id: string, card: string) {
    return this.pickMember(group_id, user_id).setCard(card)
  }

  /** @cqhttp use {@link Group.kickMember} or {@link Member.kick} */
  setGroupKick(group_id: string, user_id: string, reject_add_request = false, message?: string) {
    return this.pickMember(group_id, user_id).kick(message, reject_add_request)
  }

  /** @cqhttp use {@link Group.muteMember} or {@link Member.mute} */
  setGroupBan(group_id: string, user_id: string, duration = 1800) {
    return this.pickMember(group_id, user_id).mute(duration)
  }

  /** @cqhttp use {@link Group.quit} */
  setGroupLeave(group_id: string) {
    return this.pickGroup(group_id).quit()
  }

  /** @cqhttp use {@link Group.pokeMember} or {@link Member.poke} */
  sendGroupPoke(group_id: string, user_id: string) {
    return this.pickMember(group_id, user_id).poke()
  }

  /** @cqhttp use {@link Friend.delete} */
  deleteFriend(user_id: string, block = true) {
    return this.pickFriend(user_id).delete(block)
  }

  /** @cqhttp use {@link Group.invite} */
  inviteFriend(group_id: string, user_id: string) {
    return this.pickGroup(group_id).invite(user_id)
  }

  /** @cqhttp use {@link Friend.thumbUp} */
  sendLike(user_id: string, times = 1) {
    return this.pickFriend(user_id).thumbUp(times)
  }

  /** @cqhttp use {@link setAvatar} */
  setPortrait(file: Parameters<Client["setAvatar"]>[0]) {
    return this.setAvatar(file)
  }

  /** @cqhttp use {@link Group.setAvatar} */
  setGroupPortrait(group_id: string, file: Parameters<Group["setAvatar"]>[0]) {
    return this.pickGroup(group_id).setAvatar(file)
  }

  /** @cqhttp use {@link Group.fs} */
  acquireGfs(group_id: string) {
    return this.pickGroup(group_id).fs
  }

  /** @cqhttp use {@link User.setFriendReq} or {@link User.addFriendBack} */
  setFriendAddRequest(id: string, result = true, reason = "", block = false) {
    return this.api.setRequest({ id, result, reason, block })
  }

  /** @cqhttp use {@link User.setGroupInvite} or {@link User.setGroupReq} */
  setGroupAddRequest(id: string, result = true, reason = "", block = false) {
    return this.api.setRequest({ id, result, reason, block })
  }

  /** emit an event */
  em(name = "", data?: any) {
    data = Object.defineProperty(data || {}, "self_id", {
      value: this.uin,
      writable: true,
      enumerable: true,
      configurable: true,
    })

    for (;;) {
      this.emit(name, data)
      const i = name.lastIndexOf(".")
      if (i === -1) break
      name = name.slice(0, i)
    }
  }

  /** @deprecated use {@link status} */
  get online_status() {
    return this.status
  }
}

/** 配置项 */
export interface Config {
  logger?: Logger
  /** 过滤自己的消息，默认`true` */
  ignore_self?: boolean
  /**
   * 触发`system.offline.network`事件后的重新登录间隔秒数，默认5(秒)，不建议设置过低
   * 设置为0则不会自动重连，然后你可以监听此事件自己处理
   */
  reconn_interval?: number
  /** 是否缓存群员列表(默认true)，群多的时候(500~1000)会多占据约100MB+内存，关闭后进程只需不到20MB内存 */
  cache_group_member?: boolean
}

/** 数据统计 */
export type Statistics = Client["stat"]

/** 创建一个应用端 (=new Client) */
export function createClient(...args: ConstructorParameters<typeof Client>) {
  return new Client(...args)
}
