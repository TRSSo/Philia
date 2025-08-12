import { ulid } from "ulid"
import type { Client, type } from "#connect/common"
import type Manager from "./manager.js"

type HandleFn<T> = type.Handle<T, void | string>
export default class NoticeManager {
  notice_map = new Map<
    string,
    { name: string; desc: string; input: boolean; handle?: HandleFn<void> | HandleFn<string> }
  >()
  constructor(public manager: Manager) {}

  /**
   * 发布通知
   * @param name 名称
   * @param desc 描述
   * @param handle 处理函数
   * @param input 是否需要输入
   */
  set(name: string, desc: string, handle?: HandleFn<void>, input?: false): void
  set(name: string, desc: string, handle: HandleFn<string>, input: true): void
  set(name: string, desc: string, handle?: HandleFn<void> | HandleFn<string>, input = false) {
    for (const i of this.manager.philia.clients) i.request("newNotice").catch(() => {})
    return this.notice_map.set(ulid(), { name, desc, input, handle })
  }

  /** 查询通知数量 */
  count() {
    return this.notice_map.size
  }

  /** 列出所有通知 */
  list() {
    const ret: { id: string; name: string; desc: string; input: boolean }[] = []
    for (const [id, { name, desc, input }] of this.notice_map) ret.push({ id, name, desc, input })
    return ret
  }

  /** 处理通知 */
  handle({ id, data }: { id: string; data?: string }, client: Client) {
    const notice = this.notice_map.get(id)
    if (!notice) throw Error(`通知不存在: ${id}`)
    this.notice_map.delete(id)
    return notice.handle?.(data as never, client)
  }
}
