/** 自己信息 */
export interface Self {
  /** 用户ID */
  id: string
  /** 用户名 */
  name: string
  /** 用户头像 */
  avatar?: string | Buffer
  /** 平台扩展字段 */
  [key: string]: unknown
}

/** 用户信息 */
export interface User extends Self {
  /** 用户备注 */
  remark?: string
}

/** 群信息 */
export interface Group {
  /** 群ID */
  id: string
  /** 群名 */
  name: string
  /** 群头像 */
  avatar?: string
  /** 群备注 */
  remark?: string
  /** 全员禁言 */
  whole_mute?: boolean
  /** 平台扩展字段 */
  [key: string]: unknown
}

/** 群成员信息 */
export interface GroupMember extends User {
  /** 名片 */
  card?: string
  /** 权限 */
  role?: "owner" | "admin" | "member"
  /** 头衔 */
  title?: string
  /**
   * 获取：禁言到期时间戳
   * 设置：禁言时长
   */
  mute_time?: number
  /** 拉黑 */
  block?: boolean
}
