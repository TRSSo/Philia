/** 元类 */
export default class Meta {
  /** 状态信息 */
  status = {
    good: true,
  }

  /** 版本信息 */
  version = {
    id: "example",
    name: "示例",
  }

  /**
   * 获取状态信息
   * @returns 状态信息
   */
  getStatus() {
    return this.status
  }

  /**
   * 获取版本信息
   * @returns 版本信息
   */
  getVersion() {
    return this.version
  }
}
