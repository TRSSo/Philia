import * as Contact from "./contact.js"
import * as Message from "./message.js"
import * as Event from "./event.js"

export interface BaseAPI {
  /** 接收事件 */
  receiveEvent(event: Event.Handle | Event.Handle[]): Promise<void>

  /** 取消接收事件 */
  unreceiveEvent(event: Event.Handle | Event.Handle[]): Promise<void>

  /**
   * 获取自己信息
   * @param refresh 是否刷新
   */
  getSelfInfo(refresh?: boolean): Promise<Contact.Self>

  /**
   * 设置自己信息
   * @param data 信息对象
   * @returns 成功无返回，失败报错
   */
  setSelfInfo(data: Partial<Contact.Self>): Promise<void>

  /**
   * 获取用户信息
   * @param id 用户ID
   * @param refresh 是否刷新
   */
  getUserInfo(id: Contact.User["id"], refresh?: boolean): Promise<Contact.User>

  /**
   * 获取群信息
   * @param id 群ID
   * @param refresh 是否刷新
   */
  getGroupInfo(id: Contact.Group["id"], refresh?: boolean): Promise<Contact.Group>

  /**
   * 获取群成员信息
   * @param id 群ID
   * @param uid 用户ID
   * @param refresh 是否刷新
   */
  getGroupMemberInfo(
    id: Contact.Group["id"],
    uid: Contact.User["id"],
    refresh?: boolean,
  ): Promise<Contact.GroupMember>

  /**
   * 设置信息
   * @param scene 信息场景
   * @param id 信息ID
   * @param data 信息对象
   */
  setInfo(
    scene: Event.Message["scene"],
    id: (Contact.User | Contact.Group)["id"],
    data: Partial<Contact.User | Contact.Group>,
  ): Promise<void>

  /**
   * 设置群成员信息
   * @param id 群ID
   * @param uid 成员ID
   * @param data 信息对象
   */
  setGroupMemberInfo(
    id: Contact.Group["id"],
    uid: Contact.User["id"],
    data: Partial<Contact.GroupMember>,
  ): Promise<void>

  /**
   * 删好友
   * @param id 好友ID
   * @param block 是否禁止再次请求
   */
  delUser(id: Contact.User["id"], block?: boolean): Promise<void>

  /**
   * 退群
   * @param id 群ID
   * @param block 是否禁止再次请求
   */
  delGroup(id: Contact.Group["id"], block?: boolean): Promise<void>

  /**
   * 删除群成员
   * @param id 群ID
   * @param uid 成员ID
   * @param block 是否禁止再次请求
   */
  delGroupMember(id: Contact.Group["id"], uid: Contact.User["id"], block?: boolean): Promise<void>

  /**
   * 发送消息
   * @param scene 发送场景
   * @param id 发送对象ID
   * @param data 消息段
   */
  sendMsg(
    scene: Event.Message["scene"],
    id: (Contact.User | Contact.Group)["id"],
    data: Message.Message,
  ): Promise<Message.RSendMsg>

  /**
   * 获取消息
   * @param id 消息ID
   * @returns 消息
   */
  getMsg(id: Event.Message["id"]): Promise<Event.Message>

  /**
   * 撤回消息
   * @param id 消息ID
   */
  delMsg(id: Event.Message["id"]): Promise<void>

  /**
   * 转发消息
   * @param scene 转发场景
   * @param id 发送对象ID
   * @param mid 被转发消息ID
   */
  sendMsgForward(
    scene: Event.Message["scene"],
    id: (Contact.User | Contact.Group)["id"],
    mid: Event.Message["id"],
  ): Promise<Message.RSendMsg>

  /**
   * 获取文件
   * @param id 文件ID
   * @returns 文件消息段（只能是 binary 或 url 类型）
   */
  getFile(id: Message.AFile["id"]): Promise<Message.AFile>

  /**
   * 获取合并转发消息
   * @param id 转发ID
   */
  getForwardMsg(id: string): Promise<Message.Forward["data"]>

  /**
   * 获取消息记录
   * @param type ID类型
   * message: 从该消息开始
   * user: 从该用户最新消息
   * group: 从该群最新消息
   * @param id ID
   * @param count 往前获取消息数量
   */
  getChatHistory(
    type: "message" | Event.Message["scene"],
    id: (Event.Message | Contact.User | Contact.Group)["id"],
    count?: number,
  ): Promise<Event.Message[]>

  /** 获取用户ID列表 */
  getUserList(): Promise<Contact.User["id"][]>
  /** 获取用户信息列表 */
  getUserArray(): Promise<Contact.User[]>

  /** 获取群ID列表 */
  getGroupList(): Promise<Contact.Group["id"][]>
  /** 获取群信息列表 */
  getGroupArray(): Promise<Contact.Group[]>

  /** 获取群ID列表 */
  getGroupMemberList(id: Contact.Group["id"]): Promise<Contact.GroupMember["id"][]>
  /** 获取群信息列表 */
  getGroupMemberArray(id: Contact.Group["id"]): Promise<Contact.GroupMember[]>

  /** 获取请求列表 */
  getRequestArray(): Promise<Event.Request[]>

  /**
   * 处理请求
   * @param id 请求ID
   * @param result 是否同意
   * @param reason 处理原因
   * @param block 是否禁止再次请求
   */
  setRequest(id: string, result: boolean, reason?: string, block?: boolean): Promise<void>

  /**
   * 设置群禁言
   * @param id 群ID
   * @param type 禁言类型
   * @param uid 用户ID
   * @param time 禁言时长（秒）
   */
  setGroupMute(
    id: Contact.Group["id"],
    type: "user" | "all",
    uid?: Contact.User["id"],
    time?: number,
  ): Promise<void>

  /**
   * 发送群公告
   * @param id 群ID
   * @param message 公告内容
   */
  sendGroupNotice(id: Contact.Group["id"], message: Message.Message): Promise<void>

  /**
   * 上传文件到缓存目录
   * @param file 文件路径/二进制
   * @returns 文件ID
   */
  uploadCacheFile(file: string | Buffer): Promise<string>

  /** 清空缓存目录 */
  clearCache(): Promise<void>
}

export interface OICQExtendAPI {
  /**
   * 发送戳一戳
   * @param scene 发送场景
   * @param id 发送对象ID
   * @param tid 戳目标ID
   */
  sendPoke(
    scene: Event.Message["scene"],
    id: (Contact.User | Contact.Group)["id"],
    tid: Contact.User["id"],
  ): Promise<void>

  writeUni(cmd: string, body: Uint8Array, seq?: number): Promise<void>
  sendOidb(cmd: string, body: Uint8Array, timeout?: number): Promise<Buffer>
  sendPacket(type: string, cmd: string, body: any): Promise<Buffer>
  sendUni(cmd: string, body: Uint8Array, timeout?: number): Promise<Buffer>
  sendOidbSvcTrpcTcp(cmd: string, body: Uint8Array | object): Promise<unknown>

  getRoamingStamp(refresh?: boolean): Promise<string[]>
  delRoamingStamp(id: string | string[]): Promise<void>
  setUserClass(name: string | number, id: Contact.User["id"]): Promise<void>
  addUserClass(name: string): Promise<void>
  delUserClass(name: string | number): Promise<void>
  renameUserClass(name: string | number, new_name: string): Promise<void>
  getImageOCR(image: Message.Image): Promise<unknown>
  getSelfCookie(domain?: string): Promise<string | Record<string, string>>
  getSelfCSRFToken(): Promise<number>
  sendUserLike(id: Contact.User["id"], times: number): Promise<void>
  addUserBack(id: Contact.User["id"], seq: number, mark: string): Promise<void>
  searchUserSameGroup(id: Contact.User["id"]): Promise<Contact.Group[]>

  getGroupFSDf(id: Contact.Group["id"]): Promise<unknown>
  getGroupFSStat(id: Contact.Group["id"], fid: string): Promise<unknown>
  getGroupFSDir(
    id: Contact.Group["id"],
    pid?: string,
    start?: number,
    limit?: number,
  ): Promise<unknown>
  addGroupFSDir(id: Contact.Group["id"], name: string): Promise<unknown>
  delGroupFSFile(id: Contact.Group["id"], fid: string): Promise<void>
  renameGroupFSFile(id: Contact.Group["id"], fid: string, name: string): Promise<void>
  moveGroupFSFile(id: Contact.Group["id"], fid: string, pid: string): Promise<void>
  uploadGroupFSFile(file: string | Buffer, pid?: string, name?: string): Promise<unknown>
  forwardGroupFSFile(fid: unknown | string, pid?: string, name?: string): Promise<unknown>
  getGroupFSFile(fid: string): Promise<{ url: string }>

  /** 若有 seq，则id为群ID，否则为消息ID */
  addGroupEssence(
    id: Event.Message["id"] | Contact.Group["id"],
    seq?: number,
    rand?: number,
  ): Promise<void>
  delGroupEssence(
    id: Event.Message["id"] | Contact.Group["id"],
    seq?: number,
    rand?: number,
  ): Promise<void>
  setReaded(id: Event.Message["id"] | Contact.Group["id"], seq?: number): Promise<void>
  setMessageRate(id: Contact.Group["id"], times: number): Promise<void>
  setGroupJoinType(
    id: Contact.Group["id"],
    type: string,
    question?: string,
    answer?: string,
  ): Promise<void>
  getGroupAtAllRemainder(id: Contact.Group["id"]): Promise<number>
  sendGroupUserInvite(id: Contact.Group["id"], uid: Contact.User["id"]): Promise<void>
  sendGroupSign(id: Contact.Group["id"]): Promise<void>
  getGroupMemberMuteList(id: Contact.Group["id"]): Promise<unknown>
  setReaction(
    type: "message" | Event.Message["scene"],
    id: (Event.Message | Contact.User | Contact.Group)["id"],
    eid: string,
    etype?: number,
    seq?: number,
  ): Promise<void>
  delReaction(
    type: "message" | Event.Message["scene"],
    id: (Event.Message | Contact.User | Contact.Group)["id"],
    eid: string,
    etype?: number,
    seq?: number,
  ): Promise<void>
}

export type ExtendAPI = Partial<OICQExtendAPI>
export type API = BaseAPI & ExtendAPI
