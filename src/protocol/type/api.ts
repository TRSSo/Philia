import type * as Contact from "./contact.js"
import type * as Event from "./event.js"
import type * as Message from "./message.js"

export interface BaseAPI {
  /** 接收事件 */
  receiveEvent: {
    request: { event: Event.Handle | Event.Handle[] }
    response: void
  }

  /** 取消接收事件 */
  unreceiveEvent: {
    request: { event: Event.Handle | Event.Handle[] }
    response: void
  }

  /**
   * 获取自己信息
   * @param refresh 是否刷新
   */
  getSelfInfo: {
    request: void | { refresh?: boolean }
    response: Contact.Self
  }

  /**
   * 设置自己信息
   * @param data 信息对象
   * @returns 成功无返回，失败报错
   */
  setSelfInfo: {
    request: { data: Partial<Contact.Self> }
    response: void
  }

  /**
   * 获取用户信息
   * @param id 用户ID
   * @param refresh 是否刷新
   */
  getUserInfo: {
    request: { id: Contact.User["id"]; refresh?: boolean }
    response: Contact.User
  }

  /**
   * 获取群信息
   * @param id 群ID
   * @param refresh 是否刷新
   */
  getGroupInfo: {
    request: { id: Contact.Group["id"]; refresh?: boolean }
    response: Contact.Group
  }

  /**
   * 获取群成员信息
   * @param id 群ID
   * @param uid 用户ID
   * @param refresh 是否刷新
   */
  getGroupMemberInfo: {
    request: {
      id: Contact.Group["id"]
      uid: Contact.User["id"]
      refresh?: boolean
    }
    response: Contact.GroupMember
  }

  /**
   * 设置信息
   * @param scene 信息场景
   * @param id 信息ID
   * @param data 信息对象
   */
  setInfo: {
    request: {
      scene: Event.Message["scene"]
      id: (Contact.User | Contact.Group)["id"]
      data: Partial<Contact.User | Contact.Group>
    }
    response: void
  }

  /**
   * 设置群成员信息
   * @param id 群ID
   * @param uid 成员ID
   * @param data 信息对象
   */
  setGroupMemberInfo: {
    request: {
      id: Contact.Group["id"]
      uid: Contact.User["id"]
      data: Partial<Contact.GroupMember>
    }
    response: void
  }

  /**
   * 删好友
   * @param id 好友ID
   * @param block 是否禁止再次请求
   */
  delUser: {
    request: { id: Contact.User["id"]; block?: boolean }
    response: void
  }

  /**
   * 退群
   * @param id 群ID
   * @param block 是否禁止再次请求
   * @param dismiss 是群主时，是否解散群
   */
  delGroup: {
    request: { id: Contact.Group["id"]; block?: boolean; dismiss?: boolean }
    response: void
  }

  /**
   * 删除群成员
   * @param id 群ID
   * @param uid 成员ID
   * @param block 是否禁止再次请求
   */
  delGroupMember: {
    request: {
      id: Contact.Group["id"]
      uid: Contact.GroupMember["id"]
      block?: boolean
    }
    response: void
  }

  /**
   * 发送消息
   * @param scene 发送场景
   * @param id 发送对象ID
   * @param data 消息段
   */
  sendMsg: {
    request: {
      scene: Event.Message["scene"]
      id: (Contact.User | Contact.Group)["id"]
      data: Message.Message
    }
    response: Message.RSendMsg
  }

  /**
   * 发送多条消息（合并转发）
   * @param scene 发送场景
   * @param id 发送对象ID
   * @param data 消息数组
   */
  sendMultiMsg: {
    request: {
      scene: Event.Message["scene"]
      id: (Contact.User | Contact.Group)["id"]
      data: Message.Forward[]
    }
    response: Message.RSendMsg[]
  }

  /**
   * 获取消息
   * @param id 消息ID
   * @returns 消息
   */
  getMsg: {
    request: { id: Event.Message["id"] }
    response: Event.Message
  }

  /**
   * 撤回消息
   * @param id 消息ID
   */
  delMsg: {
    request: { id: Event.Message["id"] }
    response: void
  }

  /**
   * 转发消息
   * @param scene 转发场景
   * @param id 发送对象ID
   * @param mid 被转发消息ID
   */
  sendMsgForward: {
    request: {
      scene: Event.Message["scene"]
      id: (Contact.User | Contact.Group)["id"]
      mid: Event.Message["id"]
    }
    response: Message.RSendMsg
  }

  /**
   * 获取文件
   * @param id 文件ID
   */
  getFile: {
    request: { id: Message.IDFile["id"] }
    response: Message.BinaryFile | Message.URLFile
  }

  /**
   * 获取消息记录
   * @param type ID类型
   * message: 从该消息开始
   * user: 从该用户最新消息
   * group: 从该群最新消息
   * @param id ID
   * @param count 往前获取消息数量
   * @param newer 往后获取新消息
   */
  getChatHistory: {
    request: {
      type: "message" | Event.Message["scene"]
      id: (Event.Message | Contact.User | Contact.Group)["id"]
      count?: number
      newer?: boolean
    }
    response: Event.Message[]
  }

  /** 获取用户ID列表 */
  getUserList: {
    request: void | { refresh?: boolean }
    response: Contact.User["id"][]
  }
  /** 获取用户信息列表 */
  getUserArray: {
    request: void | { refresh?: boolean }
    response: Contact.User[]
  }

  /** 获取群ID列表 */
  getGroupList: {
    request: void | { refresh?: boolean }
    response: Contact.Group["id"][]
  }
  /** 获取群信息列表 */
  getGroupArray: {
    request: void | { refresh?: boolean }
    response: Contact.Group[]
  }

  /** 获取群ID列表 */
  getGroupMemberList: {
    request: { id: Contact.Group["id"]; refresh?: boolean }
    response: Contact.GroupMember["id"][]
  }
  /** 获取群信息列表 */
  getGroupMemberArray: {
    request: { id: Contact.Group["id"]; refresh?: boolean }
    response: Contact.GroupMember[]
  }

  /**
   * 获取请求列表
   * @param scene 请求场景，默认全部
   * @param count 请求数量
   */
  getRequestArray: {
    request: void | {
      scene?: Event.Request["scene"]
      count?: number
    }
    response: Event.Request[]
  }

  /**
   * 处理请求
   * @param id 请求ID
   * @param result 是否同意
   * @param reason 处理原因
   * @param block 是否禁止再次请求
   */
  setRequest: {
    request: { id: string; result: boolean; reason?: string; block?: boolean }
    response: void
  }

  /**
   * 上传文件到缓存目录
   * @param file 文件路径/二进制
   * @returns 文件ID
   */
  uploadCacheFile: {
    request: { file: string | Buffer }
    response: string
  }

  /** 清空缓存目录 */
  clearCache: {
    request: void
    response: void
  }
}

export interface OICQExtendAPI {
  /**
   * 获取合并转发消息
   * @param id 转发ID
   */
  getForwardMsg: {
    request: { id: string }
    response: Message.Forward[]
  }

  /**
   * 发送戳一戳
   * @param scene 发送场景
   * @param id 发送对象ID
   * @param tid 戳目标ID
   */
  sendPoke: {
    request: {
      scene: Event.Message["scene"]
      id: (Contact.User | Contact.Group)["id"]
      tid: Contact.User["id"]
    }
    response: void
  }

  writeUni: {
    request: { cmd: string; body: Uint8Array; seq?: number }
    response: void
  }
  sendOidb: {
    request: { cmd: string; body: Uint8Array; timeout?: number }
    response: Buffer
  }
  sendPacket: {
    request: { type: string; cmd: string; body: any }
    response: Buffer
  }
  sendUni: {
    request: { cmd: string; body: Uint8Array; timeout?: number }
    response: Buffer
  }
  sendOidbSvcTrpcTcp: {
    request: { cmd: string; body: Uint8Array | object }
    response: unknown
  }

  getRoamingStamp: {
    request: void | { refresh?: boolean }
    response: string[]
  }
  delRoamingStamp: {
    request: { id: string | string[] }
    response: void
  }
  setUserClass: {
    request: { name: string | number; id: Contact.User["id"] }
    response: void
  }
  addUserClass: {
    request: { name: string }
    response: void
  }
  delUserClass: {
    request: { name: string | number }
    response: void
  }
  renameUserClass: {
    request: { name: string | number; new_name: string }
    response: void
  }
  getImageOCR: {
    request: { image: Message.Image }
    response: unknown
  }
  getSelfCookie: {
    request: void | { domain: string }
    response: string | Record<string, string>
  }
  getSelfCSRFToken: {
    request: void
    response: number
  }
  sendUserLike: {
    request: { id: Contact.User["id"]; times: number }
    response: void
  }
  addUserBack: {
    request: { id: Contact.User["id"]; seq: number; remark: string }
    response: void
  }
  searchUserSameGroup: {
    request: { id: Contact.User["id"] }
    response: Contact.Group[]
  }

  getGroupFSDf: {
    request: { id: Contact.Group["id"] }
    response: unknown
  }
  getGroupFSStat: {
    request: { id: Contact.Group["id"]; fid: string }
    response: unknown
  }
  getGroupFSDir: {
    request: {
      id: Contact.Group["id"]
      pid?: string
      start?: number
      limit?: number
    }
    response: unknown
  }
  addGroupFSDir: {
    request: { id: Contact.Group["id"]; name: string }
    response: unknown
  }
  delGroupFSFile: {
    request: { id: Contact.Group["id"]; fid: string }
    response: void
  }
  renameGroupFSFile: {
    request: { id: Contact.Group["id"]; fid: string; name: string }
    response: void
  }
  moveGroupFSFile: {
    request: { id: Contact.Group["id"]; fid: string; pid: string }
    response: void
  }
  uploadGroupFSFile: {
    request: { file: string | Buffer; pid?: string; name?: string }
    response: unknown
  }
  forwardGroupFSFile: {
    request: { fid: unknown | string; pid?: string; name?: string }
    response: unknown
  }
  getGroupFSFile: {
    request: { fid: string }
    response: { url: string }
  }

  /** 若有 seq，则id为群ID，否则为消息ID */
  addGroupEssence: {
    request: {
      id: Event.Message["id"] | Contact.Group["id"]
      seq?: number
      rand?: number
    }
    response: void
  }
  delGroupEssence: {
    request: {
      id: Event.Message["id"] | Contact.Group["id"]
      seq?: number
      rand?: number
    }
    response: void
  }
  setReaded: {
    request: { id: Event.Message["id"] | Contact.Group["id"]; seq?: number }
    response: void
  }
  setMessageRate: {
    request: { id: Contact.Group["id"]; times: number }
    response: void
  }
  /**
   * 发送群公告
   * @param id 群ID
   * @param content 公告内容
   */
  sendGroupNotice: {
    request: { id: Contact.Group["id"]; content: string; image?: string }
    response: void
  }
  setGroupJoinType: {
    request: {
      id: Contact.Group["id"]
      type: string
      question?: string
      answer?: string
    }
    response: void
  }
  getGroupAtAllRemainder: {
    request: { id: Contact.Group["id"] }
    response: number
  }
  sendGroupUserInvite: {
    request: { id: Contact.Group["id"]; uid: Contact.User["id"] }
    response: void
  }
  sendGroupSign: {
    request: { id: Contact.Group["id"] }
    response: void
  }
  getGroupMemberMuteList: {
    request: { id: Contact.Group["id"] }
    response: unknown
  }
  setReaction: {
    request: {
      type: "message" | Event.Message["scene"]
      id: (Event.Message | Contact.User | Contact.Group)["id"]
      eid: string
      etype?: number
      seq?: number
    }
    response: void
  }
  delReaction: {
    request: {
      type: "message" | Event.Message["scene"]
      id: (Event.Message | Contact.User | Contact.Group)["id"]
      eid: string
      etype?: number
      seq?: number
    }
    response: void
  }
}

export type ExtendAPI = OICQExtendAPI

export interface IAPI<T extends Record<keyof T, { request: unknown; response: unknown }>> {
  Server: {
    [K in keyof T]: (data: T[K]["request"]) => T[K]["response"] | Promise<T[K]["response"]>
  }
  Client: {
    [K in keyof T]: (data: T[K]["request"]) => Promise<T[K]["response"]>
  }
}
export type IBaseAPI = IAPI<BaseAPI>
export type IExtendAPI = IAPI<ExtendAPI>

/** 服务端 API 可返回同步或异步 Promise */
export type ServerAPI = IBaseAPI["Server"] & Partial<IExtendAPI["Server"]>
/** 客户端 API 只返回异步 Promise */
export type ClientAPI = IBaseAPI["Client"] & IExtendAPI["Client"]
