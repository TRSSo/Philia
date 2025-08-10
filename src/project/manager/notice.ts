import type { Client, type } from "#connect/common"

export default class NoticeManager {
  notice_map = new Map<string, { desc: string; handle?: type.Handle<string, string> }>()

  /**
   * 发布通知
   * @param name 名称
   * @param desc 描述
   * @param handle 处理函数
   */
  set(name: string, desc: string, handle?: type.Handle<string, string>) {
    return this.notice_map.set(name, { desc, handle })
  }

  /**
   * 删除通知
   * @param name 名称或名称数组
   */
  del(name: string | string[]) {
    if (Array.isArray(name)) return name.map(this.notice_map.delete.bind(this.notice_map))
    return this.notice_map.delete(name)
  }

  /** 查询通知数量 */
  count() {
    return this.notice_map.size
  }

  /** 列出所有通知 */
  list() {
    const ret: { name: string; desc: string; handle: boolean }[] = []
    for (const [name, { desc, handle }] of this.notice_map)
      ret.push({ name, desc, handle: typeof handle === "function" })
    return ret
  }

  /** 处理通知 */
  handle({ name, data }: { name: string; data?: string }, client: Client) {
    const notice = this.notice_map.get(name)
    if (!notice) throw Error(`通知不存在: ${name}`)
    this.notice_map.delete(name)
    if (data) return notice.handle?.(data, client)
  }
}
