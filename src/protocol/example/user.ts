import { ulid } from "ulid"
import { makeError } from "#util"
import logger from "#logger"
import { Contact, Message } from "../type/index.js"

/** 用户类 */
export default class User {
  /** 示例用户对象 */
  user: { [key: Contact.User["id"]]: Contact.User } = {
    example: { id: "example", name: "示例" },
  }

  /**
   * 发送用户消息
   * @param id 用户ID
   * @param data 消息段
   * @returns 用户消息
   */
  sendUserMsg(data: { id: Contact.User["id"]; data: Message.Message }): Message.RSendMsg {
    logger.info("发送用户消息", data.id, data.data)
    return { id: ulid(), time: Date.now() / 1000 }
  }

  /**
   * 获取用户信息
   * @param id 用户ID
   * @returns 用户信息
   */
  getUserInfo(data: { id: Contact.User["id"] }): Contact.User {
    return this.user[data.id]
  }

  /**
   * 获取用户列表
   * @returns 用户ID列表
   */
  getUserList(): Contact.User["id"][] {
    return Object.keys(this.user)
  }

  /**
   * 获取用户信息列表
   * @returns 用户信息列表
   */
  getUserArray(): Contact.User[] {
    return Object.values(this.user)
  }

  /**
   * 设置用户备注
   * @param id 用户ID
   * @param remark 用户备注
   */
  setUserRemark(data: { id: Contact.User["id"]; remark: Contact.User["remark"] }) {
    this.user[data.id].remark = data.remark
    if (this.user[data.id].remark !== data.remark)
      throw makeError("设置失败", {
        current: this.user[data.id].remark,
        target: data.remark,
      })
  }

  /**
   * 删除用户
   * @param id 用户ID
   */
  delUser(data: { id: Contact.User["id"] }) {
    delete this.user[data.id]
    if (data.id in this.user) throw makeError("删除失败", { target: data.id })
  }
}
