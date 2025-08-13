import type { API, Contact, Event, Message } from "#protocol/type"
import { toJSON } from "#util"
import type Client from "../impl/client.js"
import type * as OBv11 from "../type/index.js"
import * as MessageConverter from "./message.js"

/** API 转换器 */
export class PhiliaToOBv11 implements API.API {
  cache = new Map<string, unknown>()
  user_cache = new Map<Contact.User["id"], Contact.User>()
  group_cache = new Map<Contact.Group["id"], Contact.Group>()
  group_member_cache = new Map<
    Contact.Group["id"],
    Map<Contact.GroupMember["id"], Contact.GroupMember>
  >()

  constructor(public client: Client) {}

  receiveEvent(
    { event }: { event: Event.Handle | Event.Handle[] },
    client?: Parameters<typeof this.client.event_handle.receive>[1],
  ) {
    return this.client.event_handle.receive(event, client!)
  }
  unreceiveEvent(
    { event }: { event: Event.Handle | Event.Handle[] },
    client?: Parameters<typeof this.client.event_handle.unreceive>[1],
  ) {
    return this.client.event_handle.unreceive(event, client!)
  }

  async getSelfInfo({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh) {
      const cache = this.cache.get("self_info") as Contact.Self
      if (cache) return cache
    }
    const res = await this.client.api.get_login_info()
    const ret: Contact.Self = {
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${res.user_id}`,
      ...res,
      id: String(res.user_id),
      name: res.nickname,
    }
    this.cache.set("self_info", ret)
    return ret
  }

  async setSelfInfo({ data }: { data: Partial<Contact.Self> }) {
    if (data.name)
      await this.client.api.set_qq_profile({
        nickname: data.name,
        personal_note: data.personal_note as string,
      })
    if (data.avatar) await this.client.api.set_qq_avatar({ file: toJSON(data.avatar) })
  }

  _convertUserInfo(res: OBv11.API.IAPI["get_stranger_info"]["response"] | OBv11.Event.Sender) {
    const id = String(res.user_id)
    const ret: Contact.User = {
      ...this.user_cache.get(id),
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${id}`,
      ...res,
      id,
      name: res.nickname,
    }
    this.user_cache.set(id, ret)
    return ret
  }

  async getUserInfo({ id, refresh }: { id: Contact.User["id"]; refresh?: boolean }) {
    if (!refresh) {
      const cache = this.user_cache.get(id)
      if (cache) return cache
    }
    const res = await this.client.api.get_stranger_info({
      user_id: +id,
      no_cache: refresh,
    })
    return this._convertUserInfo(res)
  }

  _convertGroupInfo(res: OBv11.API.IAPI["get_group_info"]["response"]) {
    const id = String(res.group_id)
    const ret: Contact.Group = {
      ...this.group_cache.get(id),
      avatar: `https://p.qlogo.cn/gh/${id}/${id}/0`,
      ...res,
      id,
      name: res.group_name,
      remark: res.group_memo,
    }
    this.group_cache.set(id, ret)
    return ret
  }

  async getGroupInfo({ id, refresh }: { id: Contact.Group["id"]; refresh?: boolean }) {
    if (!refresh) {
      const cache = this.group_cache.get(id)
      if (cache) return cache
    }
    const res = await this.client.api.get_group_info({
      group_id: +id,
      no_cache: refresh,
    })
    return this._convertGroupInfo(res)
  }

  _convertGroupMemberInfo(
    gid: Contact.Group["id"],
    res: OBv11.API.IAPI["get_group_member_info"]["response"] | OBv11.Event.GroupSender,
  ) {
    const id = String(res.user_id)
    const ret: Contact.GroupMember = {
      ...this.group_member_cache.get(gid)?.get(id),
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${res.user_id}`,
      ...res,
      id,
      name: res.nickname,
    }
    let group = this.group_member_cache.get(gid)
    if (!group) {
      group = new Map()
      this.group_member_cache.set(gid, group)
    }
    group.set(id, ret)
    return ret
  }

  async getGroupMemberInfo({
    id,
    uid,
    refresh,
  }: {
    id: Contact.Group["id"]
    uid: Contact.User["id"]
    refresh?: boolean
  }) {
    if (!refresh) {
      const cache = this.group_member_cache.get(id)?.get(uid)
      if (cache) return cache
    }
    const res = await this.client.api.get_group_member_info({
      group_id: +id,
      user_id: +uid,
      no_cache: refresh,
    })
    return this._convertGroupMemberInfo(id, res)
  }

  async setInfo({
    scene,
    id,
    data,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
    data: Partial<Contact.User | Contact.Group>
  }) {
    switch (scene) {
      case "user":
        if (data.remark !== undefined)
          await this.client.api.set_friend_remark({
            user_id: +id,
            remark: data.remark,
          })
        break
      case "group":
        if (data.name !== undefined)
          await this.client.api.set_group_name({
            group_id: +id,
            group_name: data.name,
          })
        if (data.avatar !== undefined)
          await this.client.api.set_group_portrait({
            group_id: +id,
            file: toJSON(data.avatar),
          })
        if (data.remark !== undefined)
          await this.client.api.set_group_remark({
            group_id: +id,
            remark: data.remark,
          })
        if (data.whole_mute !== undefined)
          await this.client.api.set_group_whole_ban({
            group_id: +id,
            enable: (data as Contact.Group).whole_mute,
          })
        break
    }
  }

  async setGroupMemberInfo({
    id,
    uid,
    data,
  }: {
    id: Contact.Group["id"]
    uid: Contact.User["id"]
    data: Partial<Contact.GroupMember>
  }) {
    if (data.card !== undefined)
      await this.client.api.set_group_card({
        group_id: +id,
        user_id: +uid,
        card: data.card,
      })
    if (data.role !== undefined)
      await this.client.api.set_group_admin({
        group_id: +id,
        user_id: +uid,
        enable: data.role === "admin",
      })
    if (data.title !== undefined)
      await this.client.api.set_group_special_title({
        group_id: +id,
        user_id: +uid,
        special_title: data.title,
      })
    if (data.mute_time !== undefined)
      await this.client.api.set_group_ban({
        group_id: +id,
        user_id: +uid,
        duration: data.mute_time,
      })
  }

  delUser({ id }: { id: Contact.User["id"] }) {
    return this.client.api.delete_friend({ user_id: +id })
  }

  delGroup({ id, dismiss }: { id: Contact.Group["id"]; dismiss?: boolean }) {
    return this.client.api.set_group_leave({
      group_id: +id,
      is_dismiss: dismiss,
    })
  }

  delGroupMember({
    id,
    uid,
    block,
  }: {
    id: Contact.Group["id"]
    uid: Contact.GroupMember["id"]
    block?: boolean
  }) {
    return this.client.api.set_group_kick({
      group_id: +id,
      user_id: +uid,
      reject_add_request: block,
    })
  }

  async sendMsg({
    scene,
    id,
    data,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
    data: Message.Message
  }) {
    const message = await new MessageConverter.PhiliaToOBv11(this.client, {
      message: data,
    } as Event.Message).convert()
    if (!message.after.length) {
      if (!message.summary) throw new Error("空消息")
      return {
        id: "",
        time: Math.floor(Date.now() / 1000),
      }
    }
    const res = await this.client.api.send_msg({
      [scene === "user" ? "user_id" : "group_id"]: +id,
      message: message.after,
    })
    const ret: Message.RSendMsg = {
      time: Math.floor(Date.now() / 1000),
      ...res,
      id: String(res.message_id),
    }
    return ret
  }

  async sendMultiMsg({
    scene,
    id,
    data,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
    data: Message.Forward[]
  }) {
    const messages: OBv11.Message.ForwardNode[] = []
    for (const i of data) {
      const message = await new MessageConverter.PhiliaToOBv11(this.client, {
        message: i.message,
      } as Event.Message).convert()
      if (!message.after.length) continue
      const user_id = String(Number(i.user?.id) || 80000000)
      const nickname = i.user?.name || "匿名消息"
      messages.push({
        type: "node",
        data: {
          time: i.time as number,
          user_id,
          nickname,
          uin: user_id,
          name: nickname,
          content: message.after,
        },
      })
    }
    if (!messages.length)
      return [
        {
          id: "",
          time: Math.floor(Date.now() / 1000),
        },
      ]
    const res = await (scene === "user"
      ? this.client.api.send_private_forward_msg({
          user_id: +id,
          messages,
        })
      : this.client.api.send_group_forward_msg({
          group_id: +id,
          messages,
        }))
    const ret: Message.RSendMsg = {
      time: Math.floor(Date.now() / 1000),
      ...res,
      id: String(res.message_id),
    }
    return [ret]
  }

  async _sendFile({
    scene,
    id,
    data,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
    data: Message.AFile
  }) {
    let file = ""
    switch (data.data) {
      case "id":
      case "path":
        file = data.id || (data.path as string)
        break
      case "binary":
      case "url":
        file = await this.uploadCacheFile({
          file: data.binary || (data.url as string),
        })
        break
    }
    return scene === "user"
      ? this.client.api.upload_private_file({
          user_id: +id,
          file,
          name: data.name,
        })
      : this.client.api.upload_group_file({
          group_id: +id,
          file,
          name: data.name,
        })
  }

  async getMsg({ id }: { id: Event.Message["id"] }) {
    const res = await this.client.api.get_msg({ message_id: +id })
    return this.client.protocol.convert.message(res)
  }

  delMsg({ id }: { id: Event.Message["id"] }) {
    return this.client.api.delete_msg({ message_id: +id })
  }

  async sendMsgForward({
    scene,
    id,
    mid,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
    mid: Event.Message["id"]
  }) {
    const message = await this.client.api.get_msg({ message_id: +mid })
    const res = await this.client.api.send_msg({
      [scene === "user" ? "user_id" : "group_id"]: +id,
      message: message.message,
    })
    const ret: Message.RSendMsg = {
      time: Math.floor(Date.now() / 1000),
      ...res,
      id: String(res.message_id),
    }
    return ret
  }

  getFile({ id }: { id: Message.IDFile["id"] }) {
    /** TODO: 获取文件 */
    return { id } as Message.URLFile
  }

  async getForwardMsg({ id }: { id: string }) {
    const res = await this.client.api.get_forward_msg({ message_id: +id })
    return Promise.all(
      res.message.map(this.client.protocol.convert.message.bind(this.client.protocol.convert)),
    )
  }

  async getChatHistory({
    type,
    id,
    count,
    newer,
  }: {
    type: "message" | Event.Message["scene"]
    id: (Event.Message | Contact.User | Contact.Group)["id"]
    count?: number
    newer?: boolean
  }) {
    if (newer) throw new Error("暂不支持获取新消息")
    let res: { messages: OBv11.Event.Message[] }
    if (type === "message") {
      const msg = await this.client.api.get_msg({ message_id: +id })
      res = await (msg.message_type === "private"
        ? this.client.api.get_friend_msg_history({
            user_id: msg.user_id,
            message_seq: msg.message_seq || msg.message_id,
            count,
          })
        : this.client.api.get_group_msg_history({
            group_id: msg.group_id,
            message_seq: msg.message_seq || msg.message_id,
            count,
          }))
    } else {
      res = await (type === "user"
        ? this.client.api.get_friend_msg_history({ user_id: +id })
        : this.client.api.get_group_msg_history({ group_id: +id }))
    }
    return Promise.all(
      res.messages.map(this.client.protocol.convert.message.bind(this.client.protocol.convert)),
    )
  }

  async getUserList({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.keys())
    const res = await this.client.api.get_friend_list()
    const ret: Contact.User["id"][] = res.map(i => String(i.user_id))
    return ret
  }

  async getUserArray({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.values())
    const res = await this.client.api.get_friend_list()
    const ret: Contact.User[] = res.map(this._convertUserInfo.bind(this))
    return ret
  }

  async getGroupList({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.keys())
    const res = await this.client.api.get_group_list()
    const ret: Contact.Group["id"][] = res.map(i => String(i.group_id))
    return ret
  }

  async getGroupArray({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.values())
    const res = await this.client.api.get_group_list()
    const ret: Contact.Group[] = res.map(this._convertGroupInfo.bind(this))
    return ret
  }

  async getGroupMemberList({ id, refresh }: { id: Contact.Group["id"]; refresh?: boolean }) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(this.group_cache.keys())
    }
    const res = await this.client.api.get_group_member_list({ group_id: +id })
    const ret: Contact.GroupMember["id"][] = res.map(i => String(i.user_id))
    return ret
  }

  async getGroupMemberArray({ id, refresh }: { id: Contact.Group["id"]; refresh?: boolean }) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(group.values())
    }
    const res = await this.client.api.get_group_member_list({ group_id: +id })
    const ret: Contact.GroupMember[] = res.map(i => this._convertGroupMemberInfo(id, i))
    return ret
  }

  getRequestArray({
    scene,
    count,
  }: void | { scene?: Event.Request["scene"]; count?: number } = {}) {
    let ret: Event.Request[] = Array.from(this.client.protocol.convert.event_map.values())
    if (scene) ret = ret.filter(i => i.scene === scene)
    if (count) ret = ret.slice(0, count)
    return ret
  }

  async setRequest({ id, result, reason }: { id: string; result: boolean; reason?: string }) {
    const event = this.client.protocol.convert.event_map.get(id)
    if (!event) throw Error("未找到请求")
    if (event.scene === "user") {
      await this.client.api.set_friend_add_request({
        flag: id,
        approve: result,
      })
    } else {
      await this.client.api.set_group_add_request({
        flag: id,
        approve: result,
        reason,
      })
    }
    event.state = result ? "accepted" : "rejected"
  }

  async uploadCacheFile({ file }: { file: string | Buffer }) {
    const data: { file?: string; base64?: string } = {}
    if (Buffer.isBuffer(file)) data.base64 = file.toString("base64")
    else if (file.startsWith("base64://")) data.base64 = file.replace("base64://", "")
    else data.file = file
    return (await this.client.api.download_file(data)).file
  }

  clearCache() {
    return this.client.api.clean_cache()
  }
}
