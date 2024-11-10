import { ulid } from "ulid"
import { logger, makeError } from "../../util/index.js"
import { IMessage, IRSendMsg } from "./message.js"
import { IUser } from "./user.js"

/** 群信息 */
export interface IGroup {
  /** 群ID */
  id: string
  /** 群名 */
  name: string
  /** 群头像 */
  avatar?: string
  /** 群备注 */
  mark?: string
  /** 平台扩展字段 */
  [key: string]: unknown
}

/** 群成员信息 */
export interface IGroupMember extends IUser {
  card?: string
}

/** 群类 */
export default class Group {
  /** 示例群对象 */
  group: { [key: IGroup["id"]]: IGroup } = {
    example: { id: "example", name: "示例" },
  }

  /** 示例群成员对象 */
  member: { [key: IGroupMember["id"]]: IGroupMember } = {
    example: { id: "example", name: "示例" },
  }

  /**
   * 发送群消息
   * @param id 群ID
   * @param data 消息段
   * @returns 群消息
   */
  sendGroupMsg(data: { id: IGroup["id"], data: IMessage }): IRSendMsg {
    logger.info("发送群消息", data.id, data.data)
    return { id: ulid(), time: Date.now()/1000 }
  }

  /**
   * 获取群信息
   * @param id 群ID
   * @returns 群信息
   */
  getGroupInfo(data: { id: IGroup["id"] }): IGroup {
    return this.group[data.id]
  }

  /**
   * 获取群列表
   * @returns 群ID列表
   */
  getGroupList(): IGroup["id"][] {
    return Object.keys(this.group)
  }

  /**
   * 获取群信息列表
   * @returns 群信息列表
   */
  getGroupArray(): IGroup[] {
    return Object.values(this.group)
  }

  /**
   * 设置群名
   * @param id 群ID
   * @param name 群名
   */
  setGroupName(data: { id: IGroup["id"], name: IGroup["name"] }) {
    this.group[data.id].name = data.name
    if (this.group[data.id].name !== data.name)
      throw makeError("设置失败", { current: this.group[data.id].name, target: data.name })
  }

  /**
   * 设置群头像
   * @param id 群ID
   * @param avatar 群头像
   */
  setGroupAvatar(data: { id: IGroup["id"], avatar: IGroup["avatar"] }) {
    this.group[data.id].avatar = data.avatar
    if (this.group[data.id].avatar !== data.avatar)
      throw makeError("设置失败", { current: this.group[data.id].avatar, target: data.avatar })
  }

  /**
   * 设置群备注
   * @param id 群ID
   * @param mark 群备注
   */
  setGroupMark(data: { id: IGroup["id"], mark: IGroup["mark"] }) {
    this.group[data.id].mark = data.mark
    if (this.group[data.id].mark !== data.mark)
      throw makeError("设置失败", { current: this.group[data.id].mark, target: data.mark })
  }

  /**
   * 删除群
   * @param id 群ID
   */
  delGroup(data: { id: IGroup["id"] }) {
    delete this.group[data.id]
    if (data.id in this.group)
      throw makeError("删除失败", { target: data.id })
  }

  /**
   * 发送群成员消息
   * @param id 群成员ID
   * @param data 消息段
   * @returns 群成员消息
   */
  sendGroupMemberMsg(data: { id: IGroupMember["id"], data: IMessage }): IRSendMsg {
    logger.info("发送群成员消息", data.id, data.data)
    return { id: ulid(), time: Date.now()/1000 }
  }

  /**
   * 获取群成员信息
   * @param id 群成员ID
   * @returns 群成员信息
   */
  getGroupMemberInfo(data: { id: IGroupMember["id"] }): IGroupMember {
    return this.member[data.id]
  }

  /**
   * 获取群成员列表
   * @returns 群成员ID列表
   */
  getGroupMemberList(): IGroupMember["id"][] {
    return Object.keys(this.member)
  }

  /**
   * 获取群成员信息列表
   * @returns 群成员信息列表
   */
  getGroupMemberArray(): IGroupMember[] {
    return Object.values(this.member)
  }

  /**
   * 设置群成员名片
   * @param id 群成员ID
   * @param card 群成员名片
   */
  setGroupMemberCard(data: { id: IGroupMember["id"], card: IGroupMember["card"] }) {
    this.member[data.id].card = data.card
    if (this.member[data.id].card !== data.card)
      throw makeError("设置失败", { current: this.member[data.id].card, target: data.card })
  }

  /**
   * 设置群成员备注
   * @param id 群成员ID
   * @param mark 群成员备注
   */
  setGroupMemberMark(data: { id: IGroupMember["id"], mark: IGroupMember["mark"] }) {
    this.member[data.id].mark = data.mark
    if (this.member[data.id].mark !== data.mark)
      throw makeError("设置失败", { current: this.member[data.id].mark, target: data.mark })
  }

  /**
   * 删除群成员
   * @param id 群成员ID
   */
  delGroupMember(data: { id: IGroupMember["id"] }) {
    delete this.member[data.id]
    if (data.id in this.member)
      throw makeError("删除失败", { target: data.id })
  }
}