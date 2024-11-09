import { logger, makeError } from "../../util/index.js"
import { IMessage } from "./message.js"
import { ISelf } from "./self.js"

/** 用户信息 */
export interface IUser extends ISelf {
  /** 用户备注 */
  mark?: string
}

/** 用户类 */
export default class User {
  /** 示例用户对象 */
  user: { [key: IUser["id"]]: IUser } = {
    example: { id: "example", name: "示例" },
  }

  /**
   * 发送用户消息
   * @param id 用户ID
   * @param data 消息段
   * @returns 用户消息
   */
  sendUserMsg(data: { id: IUser["id"], data: IMessage }) {
    logger.info("发送用户消息", data.id, data.data)
  }

  /**
   * 获取用户信息
   * @param id 用户ID
   * @returns 用户信息
   */
  getUserInfo(data: { id: IUser["id"] }): IUser {
    return this.user[data.id]
  }

  /**
   * 获取用户列表
   * @returns 用户ID列表
   */
  getUserList(): IUser["id"][] {
    return Object.keys(this.user)
  }

  /**
   * 获取用户信息列表
   * @returns 用户信息列表
   */
  getUserArray(): IUser[] {
    return Object.values(this.user)
  }

  /**
   * 设置用户备注
   * @param id 用户ID
   * @param mark 用户备注
   */
  setUserMark(data: { id: IUser["id"], mark: IUser["mark"] }) {
    this.user[data.id].mark = data.mark
    if (this.user[data.id].mark !== data.mark)
      throw makeError("设置失败", { current: this.user[data.id].mark, target: data.mark })
  }

  /**
   * 删除用户
   * @param id 用户ID
   */
  delUser(data: { id: IUser["id"] }) {
    delete this.user[data.id]
    if (data.id in this.user)
      throw makeError("删除失败", { target: data.id })
  }
}