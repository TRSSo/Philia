import { makeError } from "../../util/index.js"
import { Contact } from "../type/index.js"

/** 自己类 */
export default class Self {
  /** 示例自己对象 */
  self: Contact.Self = {
    id: "example",
    name: "示例",
  }

  /**
   * 获取自己信息
   * @returns 自己信息
   */
  getSelfInfo(): Contact.Self {
    return this.self
  }

  /**
   * 设置自己名字
   * @param name 自己名字
   */
  setSelfName(data: { name: Contact.Self["name"] }) {
    this.self.name = data.name
    if (this.self.name !== data.name)
      throw makeError("设置失败", {
        current: this.self.name,
        target: data.name,
      })
  }

  /**
   * 设置自己头像
   * @param avatar 自己头像
   */
  setSelfAvatar(data: { avatar: Contact.Self["avatar"] }) {
    this.self.avatar = data.avatar
    if (this.self.avatar !== data.avatar)
      throw makeError("设置失败", {
        current: this.self.avatar,
        target: data.avatar,
      })
  }
}
