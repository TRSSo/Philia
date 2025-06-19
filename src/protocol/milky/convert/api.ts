import Client from "../client.js"
import { API, Event, Contact, Message } from "#protocol/type"
import { String } from "#util"
import * as MessageConverter from "./message.js"
import * as Milky from "../type/index.js"
import { Common } from "./index.js"

/** API 转换器 */
export default class PhiliaToMilky implements API.ServerAPI {
  cache = new Map<string, unknown>()
  user_cache = new Map<Contact.User["id"], Contact.User>()
  group_cache = new Map<Contact.Group["id"], Contact.Group>()
  group_member_cache = new Map<
    Contact.Group["id"],
    Map<Contact.GroupMember["id"], Contact.GroupMember>
  >()

  constructor(public client: Client) {}

  receiveEvent({ event }: { event: Event.Handle | Event.Handle[] }) {
    return this.client.event_handle.receive(event)
  }

  unreceiveEvent({ event }: { event: Event.Handle | Event.Handle[] }) {
    return this.client.event_handle.unreceive(event)
  }

  async getSelfInfo({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh) {
      const cache = this.cache.get("self_info") as Contact.Self
      if (cache) return cache
    }
    const res = await this.client.api.get_login_info()
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

  async getUserInfo({ id, refresh }: { id: Contact.User["id"]; refresh?: boolean }) {
    if (!refresh) {
      const cache = this.user_cache.get(id)
      if (cache) return cache
    }
    const res = await this.client.api.get_friend_info({
      user_id: Number(id),
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

  async getGroupInfo({ id, refresh }: { id: Contact.Group["id"]; refresh?: boolean }) {
    if (!refresh) {
      const cache = this.group_cache.get(id)
      if (cache) return cache
    }
    const res = await this.client.api.get_group_info({
      group_id: Number(id),
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
      group_id: Number(id),
      user_id: Number(uid),
      no_cache: refresh,
    })
    return this._convertGroupMemberInfo(res.member)
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
        break
      case "group":
        if (data.name !== undefined)
          await this.client.api.set_group_name({ group_id: Number(id), name: data.name })
        if (data.avatar !== undefined)
          await this.client.api.set_group_avatar({
            group_id: Number(id),
            image_uri: String(data.avatar),
          })
        if (data.whole_mute !== undefined)
          await this.client.api.set_group_whole_mute({
            group_id: Number(id),
            is_mute: (data as Contact.Group).whole_mute,
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
      await this.client.api.set_group_member_card({
        group_id: Number(id),
        user_id: Number(uid),
        card: data.card,
      })
    if (data.title !== undefined)
      await this.client.api.set_group_member_special_title({
        group_id: Number(id),
        user_id: Number(uid),
        special_title: data.title,
      })
    if (data.role !== undefined)
      await this.client.api.set_group_member_admin({
        group_id: Number(id),
        user_id: Number(uid),
        is_set: data.role === "admin",
      })
    if (data.mute_time !== undefined)
      await this.client.api.set_group_member_mute({
        group_id: Number(id),
        user_id: Number(uid),
        duration: data.mute_time,
      })
  }

  delUser() {}

  async delGroup({ id, dismiss }: { id: Contact.Group["id"]; dismiss?: boolean }) {
    if (!dismiss) {
      if (
        (await this.getGroupMemberInfo({ id, uid: (await this.getSelfInfo()).id })).role === "owner"
      )
        return
    }
    return this.client.api.quit_group({ group_id: Number(id) })
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
    return this.client.api.kick_group_member({
      group_id: Number(id),
      user_id: Number(uid),
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
    const message = await new MessageConverter.PhiliaToMilky(this.client, {
      message: data,
    } as Event.Message).convert()
    if (!message.after.length) {
      if (!message.summary) throw new Error("空消息")
      return {
        id: "",
        time: Math.floor(Date.now() / 1000),
      }
    }
    const peer_id = Number(id)
    const res = await (scene === "user"
      ? this.client.api.send_private_message({
          user_id: peer_id,
          message: message.after,
        })
      : this.client.api.send_group_message({
          group_id: peer_id,
          message: message.after,
        }))
    const ret: Message.RSendMsg = {
      ...res,
      time: res.time ?? Math.floor(Date.now() / 1000),
      id: Common.encodeMessageID(scene === "user" ? "friend" : scene, peer_id, res.message_seq),
    }
    if (message.file_id) ret.file_id = message.file_id
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
    const messages: Milky.Struct.OutgoingForwardedMessage[] = []
    for (const i of data) {
      const message = await new MessageConverter.PhiliaToMilky(this.client, {
        message: i.message,
      } as Event.Message).convert()
      if (!message.after.length) continue
      messages.push({
        user_id: Number(i.user?.id) || 80000000,
        name: i.user?.name || "匿名消息",
        segments: message.after,
      })
    }
    if (!messages.length)
      return [
        {
          id: "",
          time: Math.floor(Date.now() / 1000),
        },
      ]
    const ret = await this.sendMsg({
      scene,
      id,
      data: {
        type: "platform",
        mode: "include",
        list: "Milky",
        data: {
          type: "forward",
          data: {
            messages,
          },
        },
      },
    })
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
    let file_uri = ""
    switch (data.data) {
      case "id":
        /** 获取文件下载链接 */
        break
      case "path":
        file_uri = `file://${data.path}`
        break
      case "binary":
      case "url":
        file_uri = String(data.binary || data.url)
        break
    }
    const peer_id = Number(id)
    let file_id, type
    if (scene === "user") {
      file_id = (
        await this.client.api.upload_private_file({
          user_id: peer_id,
          file_uri,
          file_name: data.name,
        })
      ).file_id
      type = Common.FileScene.Private
    } else {
      file_id = (
        await this.client.api.upload_group_file({
          group_id: peer_id,
          file_uri,
          file_name: data.name,
        })
      ).file_id
      type = Common.FileScene.Group
    }
    return Common.encodeFileID(type, file_id, peer_id)
  }

  async getMsg({ id }: { id: Event.Message["id"] }) {
    const res = await this.client.api.get_message(Common.decodeMessageID(id))
    return this.client.event.IncomingMessage(res.message)
  }

  delMsg({ id }: { id: Event.Message["id"] }) {
    const { message_scene, peer_id, message_seq } = Common.decodeMessageID(id)
    return message_scene === "group"
      ? this.client.api.recall_group_message({ group_id: peer_id, message_seq })
      : this.client.api.recall_private_message({ user_id: peer_id, message_seq })
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
    const { message } = await this.client.api.get_message(Common.decodeMessageID(mid))
    return this.sendMsg({
      scene,
      id,
      data: {
        type: "platform",
        mode: "include",
        list: "Milky",
        data: message.segments,
      },
    })
  }

  async getFile({ id }: { id: NonNullable<Message.AFile["id"]> }) {
    const { scene, id: file_id, peer_id } = Common.decodeFileID(id)
    const ret = { data: "url" } as Message.AFile
    switch (scene) {
      case Common.FileScene.Resource:
        ret.url = (await this.client.api.get_resource_temp_url({ resource_id: file_id })).url
        break
      case Common.FileScene.Private:
        ret.url = (
          await this.client.api.get_private_file_download_url({ user_id: peer_id!, file_id })
        ).download_url
        break
      case Common.FileScene.Group:
        ret.url = (
          await this.client.api.get_group_file_download_url({ group_id: peer_id!, file_id })
        ).download_url
        break
    }
    return ret
  }

  async getForwardMsg({ id }: { id: string }) {
    const res = await this.client.api.get_forwarded_messages({ forward_id: id })
    return Promise.all(res.messages.map(this.client.event.IncomingMessage.bind(this.client.event)))
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
    let res: { messages: Milky.Struct.IncomingMessage[] }
    if (type === "message") {
      const { message_scene, peer_id, message_seq } = Common.decodeMessageID(id)
      res = await this.client.api.get_history_messages({
        message_scene,
        peer_id,
        start_message_seq: message_seq,
        direction: newer ? "newer" : "older",
        limit: count,
      })
    } else {
      res = await this.client.api.get_history_messages({
        message_scene: type === "user" ? "friend" : type,
        peer_id: Number(id),
        direction: newer ? "newer" : "older",
        limit: count,
      })
    }
    return Promise.all(res.messages.map(this.client.event.IncomingMessage.bind(this.client.event)))
  }

  async getUserList({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.keys())
    const res = await this.client.api.get_friend_list({ no_cache: refresh })
    const ret: Contact.User["id"][] = res.friends.map(i => String(i.user_id))
    return ret
  }

  async getUserArray({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.user_cache.size !== 0) return Array.from(this.user_cache.values())
    const res = await this.client.api.get_friend_list({ no_cache: refresh })
    const ret: Contact.User[] = res.friends.map(this._convertUserInfo.bind(this))
    return ret
  }

  async getGroupList({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.keys())
    const res = await this.client.api.get_group_list({ no_cache: refresh })
    const ret: Contact.Group["id"][] = res.groups.map(i => String(i.group_id))
    return ret
  }

  async getGroupArray({ refresh }: void | { refresh?: boolean } = {}) {
    if (!refresh && this.group_cache.size !== 0) return Array.from(this.group_cache.values())
    const res = await this.client.api.get_group_list({ no_cache: refresh })
    const ret: Contact.Group[] = res.groups.map(this._convertGroupInfo.bind(this))
    return ret
  }
  async getGroupMemberList({ id, refresh }: { id: Contact.Group["id"]; refresh?: boolean }) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(this.group_cache.keys())
    }
    const res = await this.client.api.get_group_member_list({
      group_id: Number(id),
      no_cache: refresh,
    })
    const ret: Contact.GroupMember["id"][] = res.members.map(i => String(i.user_id))
    return ret
  }

  async getGroupMemberArray({ id, refresh }: { id: Contact.Group["id"]; refresh?: boolean }) {
    if (!refresh) {
      const group = this.group_member_cache.get(id)
      if (group && group.size !== 0) return Array.from(group.values())
    }
    const res = await this.client.api.get_group_member_list({
      group_id: Number(id),
      no_cache: refresh,
    })
    const ret: Contact.GroupMember[] = res.members.map(i => this._convertGroupMemberInfo(i))
    return ret
  }

  async getRequestArray({
    scene,
    count,
  }: void | { scene?: Event.Request["scene"]; count?: number } = {}) {
    let ret: (Promise<Event.Request> | Event.Request)[]
    switch (scene) {
      case "user": {
        const res = await this.client.api.get_friend_requests({ limit: count })
        ret = res.requests.map(this.client.event.FriendRequest.bind(this.client.event))
        break
      }
      case "group_add": {
        const res = await this.client.api.get_group_requests({ limit: count })
        ret = res.requests.map(this.client.event.GroupRequest.bind(this.client.event))
        break
      }
      case "group_invite": {
        const res = await this.client.api.get_group_invitations({ limit: count })
        ret = res.invitations.map(this.client.event.GroupInvitation.bind(this.client.event))
        break
      }
      default:
        ret = (
          await Promise.all([
            this.getRequestArray({ scene: "user", count }),
            this.getRequestArray({ scene: "group_add", count }),
            this.getRequestArray({ scene: "group_invite", count }),
          ])
        )
          .flat()
          .slice(0, count)
    }
    return Promise.all(ret)
  }

  setRequest({ id, result, reason }: { id: string; result: boolean; reason?: string }) {
    return result
      ? this.client.api.accept_request({ request_id: id })
      : this.client.api.reject_request({ request_id: id, reason })
  }

  uploadCacheFile(): string {
    throw Error("暂不支持")
  }
  clearCache() {}
}
