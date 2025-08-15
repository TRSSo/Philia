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

  async getVersion() {
    const res = await this.client.api.get_version_info()
    return {
      impl: { id: "QQ", name: "OneBotv11", version: res.protocol_version },
      proto: {
        id: res.app_name,
        name: res.app_full_name || `${res.app_name}-${res.app_version}`,
        version: res.app_version,
      },
    }
  }

  receiveEvent(
    { event }: API.Req<"receiveEvent">,
    client?: Parameters<typeof this.client.event_handle.receive>[1],
  ) {
    return this.client.event_handle.receive(event, client!)
  }
  unreceiveEvent(
    { event }: API.Req<"unreceiveEvent">,
    client?: Parameters<typeof this.client.event_handle.unreceive>[1],
  ) {
    return this.client.event_handle.unreceive(event, client!)
  }

  async getSelfInfo({ refresh }: API.Req<"getSelfInfo"> = {}) {
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

  async setSelfInfo({ data }: API.Req<"setSelfInfo">) {
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

  async getUserInfo({ id, refresh }: API.Req<"getUserInfo">) {
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

  async getGroupInfo({ id, refresh }: API.Req<"getGroupInfo">) {
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

  async getGroupMemberInfo({ id, uid, refresh }: API.Req<"getGroupMemberInfo">) {
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

  async setInfo({ scene, id, data }: API.Req<"setInfo">) {
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

  async setGroupMemberInfo({ id, uid, data }: API.Req<"setGroupMemberInfo">) {
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

  delUser({ id }: API.Req<"delUser">) {
    return this.client.api.delete_friend({ user_id: +id })
  }

  delGroup({ id, dismiss }: API.Req<"delGroup">) {
    return this.client.api.set_group_leave({
      group_id: +id,
      is_dismiss: dismiss,
    })
  }

  delGroupMember({ id, uid, block }: API.Req<"delGroupMember">) {
    return this.client.api.set_group_kick({
      group_id: +id,
      user_id: +uid,
      reject_add_request: block,
    })
  }

  async sendMsg({ scene, id, data }: API.Req<"sendMsg">) {
    const message = await new MessageConverter.PhiliaToOBv11(this.client, scene, id, data).convert()
    if (!message.after.length) {
      if (!message.summary) throw new Error("空消息")
      return {
        id: "",
        time: Math.floor(Date.now() / 1e3),
      }
    }
    const res = await this.client.api.send_msg({
      [scene === "user" ? "user_id" : "group_id"]: +id,
      message: message.after,
    })
    const ret: Message.RSendMsg = {
      time: Math.floor(Date.now() / 1e3),
      ...res,
      id: String(res.message_id),
    }
    return ret
  }

  async sendMultiMsg({ scene, id, data }: API.Req<"sendMultiMsg">) {
    const messages: OBv11.Message.ForwardNode[] = []
    for (const i of data) {
      const message = await new MessageConverter.PhiliaToOBv11(
        this.client,
        scene,
        id,
        i.message,
      ).convert()
      if (!message.after.length) continue
      const user_id = String(Number(i.user?.id) || 8e7)
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
    if (!messages.length) return [{ id: "", time: Math.floor(Date.now() / 1e3) }]
    const res = await (scene === "user"
      ? this.client.api.send_private_forward_msg({ user_id: +id, messages })
      : this.client.api.send_group_forward_msg({ group_id: +id, messages }))
    const ret: Message.RSendMsg = {
      time: Math.floor(Date.now() / 1e3),
      ...res,
      id: String(res.message_id),
    }
    return [ret]
  }

  async _sendFile({ scene, id, data }: API.Req<"_sendFile">) {
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

  async getMsg({ id }: API.Req<"getMsg">) {
    const res = await this.client.api.get_msg({ message_id: +id })
    return this.client.protocol.convert.message(res)
  }

  delMsg({ id }: API.Req<"delMsg">) {
    return this.client.api.delete_msg({ message_id: +id })
  }

  async sendMsgForward({ scene, id, mid }: API.Req<"sendMsgForward">) {
    const message = await this.client.api.get_msg({ message_id: +mid })
    const res = await this.client.api.send_msg({
      [scene === "user" ? "user_id" : "group_id"]: +id,
      message: message.message,
    })
    const ret: Message.RSendMsg = {
      time: Math.floor(Date.now() / 1e3),
      ...res,
      id: String(res.message_id),
    }
    return ret
  }

  getFile({ id }: API.Req<"getFile">) {
    /** TODO: 获取文件 */
    return { id } as Message.URLFile
  }

  async getForwardMsg({ id }: API.Req<"getForwardMsg">) {
    const res = await this.client.api.get_forward_msg({ message_id: +id })
    return Promise.all(
      res.message.map(this.client.protocol.convert.message.bind(this.client.protocol.convert)),
    )
  }

  async getChatHistory({ type, id, count, newer }: API.Req<"getChatHistory">) {
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

  async getUserList({ refresh }: API.Req<"getUserList"> = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.keys())
    const res = await this.client.api.get_friend_list()
    return res.map(i => String(i.user_id))
  }
  async getUserArray({ refresh }: API.Req<"getUserArray"> = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.values())
    const res = await this.client.api.get_friend_list()
    return res.map(this._convertUserInfo.bind(this))
  }

  async getGroupList({ refresh }: API.Req<"getGroupList"> = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.keys())
    const res = await this.client.api.get_group_list()
    return res.map(i => String(i.group_id))
  }
  async getGroupArray({ refresh }: API.Req<"getGroupArray"> = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.values())
    const res = await this.client.api.get_group_list()
    return res.map(this._convertGroupInfo.bind(this))
  }

  async getGroupMemberList({ id, refresh }: API.Req<"getGroupMemberList">) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(this.group_cache.keys())
    }
    const res = await this.client.api.get_group_member_list({ group_id: +id })
    return res.map(i => String(i.user_id))
  }
  async getGroupMemberArray({ id, refresh }: API.Req<"getGroupMemberArray">) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(group.values())
    }
    const res = await this.client.api.get_group_member_list({ group_id: +id })
    return res.map(i => this._convertGroupMemberInfo(id, i))
  }

  getRequestArray({ scene, count }: API.Req<"getRequestArray"> = {}) {
    let ret: Event.Request[] = Array.from(this.client.protocol.convert.event_map.values())
    if (scene) ret = ret.filter(i => i.scene === scene)
    if (count) ret = ret.slice(0, count)
    return ret
  }

  async setRequest({ id, result, reason }: API.Req<"setRequest">) {
    const event = this.client.protocol.convert.event_map.get(id)
    if (!event) throw Error("未找到请求")
    if (event.scene === "user_add") {
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

  async uploadCacheFile({ file }: API.Req<"uploadCacheFile">) {
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
