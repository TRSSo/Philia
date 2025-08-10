/** 陌生人资料 */
export interface StrangerInfo {
  /** 帐号 */
  user_id: string
  /** 昵称 */
  nickname: string
  /** 头像 */
  avatar: string
}

/** 好友资料 */
export interface FriendInfo extends StrangerInfo {
  /** 性别 */
  sex: Gender
  /** 备注 */
  remark: string
  /** 分组id */
  class_id: number
}

/** 群资料 */
export interface GroupInfo {
  /** 群号 */
  group_id: string
  /** 群名 */
  group_name: string
  /** 群员数 */
  member_count: number
  /** 群员上限 */
  max_member_count: number
  /** 群主账号 */
  owner_id: string
  /** 是否为该群管理员 */
  admin_flag: boolean
  /** 上次入群时间 */
  last_join_time: number
  /** 上次发言时间 */
  last_sent_time?: number
  /** 全体禁言时间 */
  shutup_time_whole: number
  /** 被禁言时间 */
  shutup_time_me: number
  /** 群创建时间 */
  create_time?: number
  /** 群活跃等级 */
  grade?: number
  /** 管理员上限 */
  max_admin_count?: number
  /** 在线群员数 */
  active_member_count?: number
  /** 群信息更新时间 */
  update_time: number
  /** 头像 */
  avatar: string
  /** 备注 */
  remark: string
}

/** 群员资料 */
export interface MemberInfo extends FriendInfo {
  /** 所在群号 */
  group_id: string
  /** 群名片 */
  card: string
  /** 年龄 */
  age: number
  /** 地区 */
  area?: string
  /** 入群时间 */
  join_time: number
  /** 上次发言时间 */
  last_sent_time: number
  /** 聊天等级 */
  level: number
  /** 聊天排名 */
  rank?: string
  /** 群权限 */
  role: GroupRole
  /** 头衔 */
  title: string
  /** 头衔到期时间 */
  title_expire_time: number
  /** 禁言时间 */
  shutup_time: number
  /** 群员信息更新时间 */
  update_time: number
  /** 群员uid */
  uid: string
}

export type Domain =
  | "aq.qq.com"
  | "buluo.qq.com"
  | "connect.qq.com"
  | "docs.qq.com"
  | "game.qq.com"
  | "gamecenter.qq.com"
  // | "graph.qq.com"
  | "haoma.qq.com"
  | "id.qq.com"
  // | "imgcache.qq.com"
  | "kg.qq.com"
  | "mail.qq.com"
  | "mma.qq.com"
  | "office.qq.com"
  // | "om.qq.com"
  | "openmobile.qq.com"
  | "qqweb.qq.com"
  | "qun.qq.com"
  | "qzone.qq.com"
  | "ti.qq.com"
  | "v.qq.com"
  | "vip.qq.com"
  | "y.qq.com"
  | ""

/** 性别 */
export type Gender = "male" | "female" | "unknown"

/** 群内权限 */
export type GroupRole = "owner" | "admin" | "member"

/** 可设置的在线状态 */
export enum OnlineStatus {
  /** 离线 */
  Offline,
  /** 在线 */
  Online = 11,
  /** 离开 */
  Absent = 31,
  /** 隐身 */
  Invisible = 41,
  /** 忙碌 */
  Busy = 50,
  /** Q我吧 */
  Qme = 60,
  /** 请勿打扰 */
  DontDisturb = 70,
}
