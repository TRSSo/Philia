import type { API, Contact, Event, Message } from "#protocol/type"
import { toJSON } from "#util"
import type Impl from "../impl.js"
import type * as Milky from "../type/index.js"
import { Common } from "./index.js"
import * as MessageConverter from "./message.js"

/** API 转换器 */
export default class PhiliaToMilky implements API.API {
  cache = new Map<string, unknown>()
  user_cache = new Map<Contact.User["id"], Contact.User>()
  group_cache = new Map<Contact.Group["id"], Contact.Group>()
  group_member_cache = new Map<
    Contact.Group["id"],
    Map<Contact.GroupMember["id"], Contact.GroupMember>
  >()

  constructor(public impl: Impl) {}

  async getVersion() {
    const res = await this.impl.api.get_impl_info()
    return {
      impl: { id: "QQ", name: "Milky", version: res.milky_version },
      proto: {
        id: res.impl_name,
        name: `${res.qq_protocol_type}-${res.qq_protocol_version}`,
        version: res.impl_version,
      },
    }
  }

  receiveEvent(
    { event }: API.Req<"receiveEvent">,
    client?: Parameters<typeof this.impl.event_handle.receive>[1],
  ) {
    return this.impl.event_handle.receive(event, client!)
  }
  unreceiveEvent(
    { event }: API.Req<"unreceiveEvent">,
    client?: Parameters<typeof this.impl.event_handle.unreceive>[1],
  ) {
    return this.impl.event_handle.unreceive(event, client!)
  }

  async getSelfInfo({ refresh }: API.Req<"getSelfInfo"> = {}) {
    if (!refresh) {
      const cache = this.cache.get("self_info") as Contact.Self
      if (cache) return cache
    }
    const res = await this.impl.api.get_login_info()
    const ret: Contact.Self = {
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${res.uin}`,
      ...res,
      id: String(res.uin),
      name: res.nickname,
    }
    this.cache.set("self_info", ret)
    return ret
  }

  async setSelfInfo() {}

  _convertUserInfo(res: Milky.Struct.User) {
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
    const res = await this.impl.api.get_friend_info({
      user_id: +id,
      no_cache: refresh,
    })
    return this._convertUserInfo(res.friend)
  }

  _convertGroupInfo(res: Milky.Struct.Group) {
    const id = String(res.group_id)
    const ret: Contact.Group = {
      ...this.group_cache.get(id),
      avatar: `https://p.qlogo.cn/gh/${id}/${id}/0`,
      ...res,
      id,
      name: res.name,
    }
    this.group_cache.set(id, ret)
    return ret
  }

  async getGroupInfo({ id, refresh }: API.Req<"getGroupInfo">) {
    if (!refresh) {
      const cache = this.group_cache.get(id)
      if (cache) return cache
    }
    const res = await this.impl.api.get_group_info({
      group_id: +id,
      no_cache: refresh,
    })
    return this._convertGroupInfo(res.group)
  }

  _convertGroupMemberInfo(res: Milky.Struct.GroupMember) {
    const id = String(res.user_id),
      gid = String(res.group_id)
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
    const res = await this.impl.api.get_group_member_info({
      group_id: +id,
      user_id: +uid,
      no_cache: refresh,
    })
    return this._convertGroupMemberInfo(res.member)
  }

  async setInfo({ scene, id, data }: API.Req<"setInfo">) {
    switch (scene) {
      case "user":
        break
      case "group":
        if (data.name !== undefined)
          await this.impl.api.set_group_name({
            group_id: +id,
            name: data.name,
          })
        if (data.avatar !== undefined)
          await this.impl.api.set_group_avatar({
            group_id: +id,
            image_uri: toJSON(data.avatar),
          })
        if (data.whole_mute !== undefined)
          await this.impl.api.set_group_whole_mute({
            group_id: +id,
            is_mute: (data as Contact.Group).whole_mute,
          })
        break
    }
  }

  async setGroupMemberInfo({ id, uid, data }: API.Req<"setGroupMemberInfo">) {
    if (data.card !== undefined)
      await this.impl.api.set_group_member_card({
        group_id: +id,
        user_id: +uid,
        card: data.card,
      })
    if (data.title !== undefined)
      await this.impl.api.set_group_member_special_title({
        group_id: +id,
        user_id: +uid,
        special_title: data.title,
      })
    if (data.role !== undefined)
      await this.impl.api.set_group_member_admin({
        group_id: +id,
        user_id: +uid,
        is_set: data.role === "admin",
      })
    if (data.mute_time !== undefined)
      await this.impl.api.set_group_member_mute({
        group_id: +id,
        user_id: +uid,
        duration: data.mute_time,
      })
  }

  delUser() {}

  async delGroup({ id, dismiss }: API.Req<"delGroup">) {
    if (!dismiss) {
      if (
        (
          await this.getGroupMemberInfo({
            id,
            uid: (await this.getSelfInfo()).id,
          })
        ).role === "owner"
      )
        return
    }
    return this.impl.api.quit_group({ group_id: +id })
  }

  delGroupMember({ id, uid, block }: API.Req<"delGroupMember">) {
    return this.impl.api.kick_group_member({
      group_id: +id,
      user_id: +uid,
      reject_add_request: block,
    })
  }

  async sendMsg({ scene, id, data }: API.Req<"sendMsg">) {
    const message = await new MessageConverter.PhiliaToMilky(this.impl, scene, id, data).convert()
    if (!message.after.length) {
      if (!message.summary) throw new Error("空消息")
      return {
        id: "",
        time: Math.floor(Date.now() / 1e3),
      }
    }
    const peer_id = +id
    const res = await (scene === "user"
      ? this.impl.api.send_private_message({
          user_id: peer_id,
          message: message.after,
        })
      : this.impl.api.send_group_message({
          group_id: peer_id,
          message: message.after,
        }))
    const ret: Message.RSendMsg = {
      time: res.time ?? Math.floor(Date.now() / 1e3),
      id: Common.encodeMessageID(scene === "user" ? "friend" : scene, peer_id, res.message_seq),
      raw: { ...res, seq: res.message_seq },
    }
    if (message.file_id) ret.file_id = message.file_id
    return ret
  }

  async sendMultiMsg({ scene, id, data }: API.Req<"sendMultiMsg">) {
    const messages: Milky.Struct.OutgoingForwardedMessage[] = []
    for (const i of data) {
      const message = await new MessageConverter.PhiliaToMilky(
        this.impl,
        scene,
        id,
        i.message,
      ).convert()
      if (!message.after.length) continue
      messages.push({
        user_id: Number(i.user?.id) || 8e7,
        name: i.user?.name || "匿名消息",
        segments: message.after,
      })
    }
    if (!messages.length) return [{ id: "", time: Math.floor(Date.now() / 1e3) }]
    const ret = await this.sendMsg({
      scene,
      id,
      data: {
        type: "platform",
        mode: "include",
        list: "Milky",
        data: { type: "forward", data: { messages } },
      },
    })
    return [ret]
  }

  async _getFileUri(data: API.Req<"_sendFile">["data"]): Promise<string> {
    let file_uri = ""
    switch (data.data) {
      case "id":
        return this._getFileUri(await this.getFile({ id: data.id }))
      case "path":
        file_uri = `file://${data.path}`
        break
      case "binary":
      case "url":
        file_uri = toJSON(data.binary || data.url)
        break
    }
    return file_uri
  }

  async _sendFile({ scene, id, data }: API.Req<"_sendFile">) {
    const file_uri = await this._getFileUri(data)
    const peer_id = +id
    let file_id: string, type: Common.FileScene
    if (scene === "user") {
      file_id = (
        await this.impl.api.upload_private_file({
          user_id: peer_id,
          file_uri,
          file_name: data.name,
        })
      ).file_id
      type = Common.FileScene.Private
    } else {
      file_id = (
        await this.impl.api.upload_group_file({
          group_id: peer_id,
          file_uri,
          file_name: data.name,
        })
      ).file_id
      type = Common.FileScene.Group
    }
    return Common.encodeFileID(type, file_id, peer_id)
  }

  async getMsg({ id }: API.Req<"getMsg">) {
    const res = await this.impl.api.get_message(Common.decodeMessageID(id))
    return this.impl.event.IncomingMessage(res.message)
  }

  delMsg({ id }: API.Req<"delMsg">) {
    const { message_scene, peer_id, message_seq } = Common.decodeMessageID(id)
    return message_scene === "group"
      ? this.impl.api.recall_group_message({ group_id: peer_id, message_seq })
      : this.impl.api.recall_private_message({ user_id: peer_id, message_seq })
  }

  async sendMsgForward({ scene, id, mid }: API.Req<"sendMsgForward">) {
    const { message } = await this.impl.api.get_message(Common.decodeMessageID(mid))
    return this.sendMsg({
      scene,
      id,
      data: { type: "platform", mode: "include", list: "Milky", data: message.segments },
    })
  }

  async getFile({ id }: API.Req<"getFile">) {
    const { scene, id: file_id, peer_id } = Common.decodeFileID(id)
    const ret = { data: "url" } as Message.URLFile
    switch (scene) {
      case Common.FileScene.Resource:
        ret.url = (await this.impl.api.get_resource_temp_url({ resource_id: file_id })).url
        break
      case Common.FileScene.Private:
        ret.url = (
          await this.impl.api.get_private_file_download_url({
            user_id: peer_id!,
            file_id,
          })
        ).download_url
        break
      case Common.FileScene.Group:
        ret.url = (
          await this.impl.api.get_group_file_download_url({
            group_id: peer_id!,
            file_id,
          })
        ).download_url
        break
    }
    return ret
  }

  async getForwardMsg({ id }: API.Req<"getForwardMsg">) {
    const res = await this.impl.api.get_forwarded_messages({
      forward_id: id,
    })
    return Promise.all(
      res.messages.map(this.impl.event.IncomingForwardedMessage.bind(this.impl.event)),
    )
  }

  async getChatHistory({ type, id, count, newer }: API.Req<"getChatHistory">) {
    let res: { messages: Milky.Struct.IncomingMessage[] }
    if (type === "message") {
      const { message_scene, peer_id, message_seq } = Common.decodeMessageID(id)
      res = await this.impl.api.get_history_messages({
        message_scene,
        peer_id,
        start_message_seq: message_seq,
        direction: newer ? "newer" : "older",
        limit: count,
      })
    } else {
      res = await this.impl.api.get_history_messages({
        message_scene: type === "user" ? "friend" : type,
        peer_id: +id,
        direction: newer ? "newer" : "older",
        limit: count,
      })
    }
    return Promise.all(res.messages.map(this.impl.event.IncomingMessage.bind(this.impl.event)))
  }

  async getUserList({ refresh }: API.Req<"getUserList"> = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.keys())
    const res = await this.impl.api.get_friend_list({ no_cache: refresh })
    return res.friends.map(i => String(i.user_id))
  }
  async getUserArray({ refresh }: API.Req<"getUserArray"> = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.values())
    const res = await this.impl.api.get_friend_list({ no_cache: refresh })
    return res.friends.map(this._convertUserInfo.bind(this))
  }

  async getGroupList({ refresh }: API.Req<"getGroupList"> = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.keys())
    const res = await this.impl.api.get_group_list({ no_cache: refresh })
    return res.groups.map(i => String(i.group_id))
  }
  async getGroupArray({ refresh }: API.Req<"getGroupArray"> = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.values())
    const res = await this.impl.api.get_group_list({ no_cache: refresh })
    return res.groups.map(this._convertGroupInfo.bind(this))
  }

  async getGroupMemberList({ id, refresh }: API.Req<"getGroupMemberList">) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(this.group_cache.keys())
    }
    const res = await this.impl.api.get_group_member_list({
      group_id: +id,
      no_cache: refresh,
    })
    return res.members.map(i => String(i.user_id))
  }
  async getGroupMemberArray({ id, refresh }: API.Req<"getGroupMemberArray">) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(group.values())
    }
    const res = await this.impl.api.get_group_member_list({
      group_id: +id,
      no_cache: refresh,
    })
    return res.members.map(i => this._convertGroupMemberInfo(i))
  }

  async getRequestArray({ scene, count }: API.Req<"getRequestArray"> = {}) {
    let ret: (Promise<Event.Request> | Event.Request)[]
    switch (scene) {
      case "user_add": {
        const res = await this.impl.api.get_friend_requests({ limit: count })
        ret = res.requests.map(this.impl.event.FriendRequest.bind(this.impl.event))
        break
      }
      case "group_add": {
        const res = await this.impl.api.get_group_requests({ limit: count })
        ret = res.requests.map(this.impl.event.GroupRequest.bind(this.impl.event))
        break
      }
      case "group_invite": {
        const res = await this.impl.api.get_group_invitations({
          limit: count,
        })
        ret = res.invitations.map(this.impl.event.GroupInvitation.bind(this.impl.event))
        break
      }
      default:
        ret = (
          await Promise.all([
            this.getRequestArray({ scene: "user_add", count }),
            this.getRequestArray({ scene: "group_add", count }),
            this.getRequestArray({ scene: "group_invite", count }),
          ])
        )
          .flat()
          .slice(0, count)
    }
    return Promise.all(ret)
  }

  setRequest({ id, result, reason }: API.Req<"setRequest">) {
    const req = Common.decodeRequestID(id)
    switch (req.scene) {
      case Common.RequestScene.Friend:
        return result
          ? this.impl.api.accept_friend_request({ request_id: id })
          : this.impl.api.reject_friend_request({ request_id: id, reason })
      case Common.RequestScene.Group:
        return result
          ? this.impl.api.accept_group_request({ request_id: id })
          : this.impl.api.reject_group_request({ request_id: id, reason })
      case Common.RequestScene.GroupInvitation:
        return result
          ? this.impl.api.accept_group_invitation({ request_id: id })
          : this.impl.api.reject_group_invitation({ request_id: id })
    }
  }

  uploadCacheFile(): string {
    throw Error("暂不支持")
  }
  clearCache() {}

  async sendPoke({ scene, id, tid }: API.Req<"sendPoke">) {
    return scene === "user"
      ? this.impl.api.send_friend_nudge({
          user_id: +id,
          is_self: tid === (await this.getSelfInfo()).id,
        })
      : this.impl.api.send_group_nudge({ group_id: +id, user_id: +tid })
  }

  async getGroupAnnounceList({ id }: API.Req<"getGroupAnnounceList">) {
    const res = await this.impl.api.get_group_announcement_list({ group_id: +id })
    return res.announcements.map(i => ({
      id: i.announcement_id,
      time: i.time,
      gid: String(i.group_id),
      uid: String(i.user_id),
      content: i.content,
      image: { data: "url", url: i.image_url } as Message.URLFile,
    }))
  }

  async sendGroupAnnounce({ id, content, image }: API.Req<"sendGroupAnnounce">) {
    return this.impl.api.send_group_announcement({
      group_id: +id,
      content,
      image_uri: image ? await this._getFileUri(image) : undefined,
    })
  }

  delGroupAnnounce({ id, gid }: API.Req<"delGroupAnnounce">) {
    return this.impl.api.delete_group_announcement({
      group_id: +gid,
      announcement_id: id,
    })
  }
}
