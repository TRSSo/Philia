import Client from "../server/client.js"
import { API, Event, Contact, Message } from "#protocol/type"
import { String } from "#util"
import * as MessageConverter from "./message.js"
import { Event as OBv11Event, Message as OBv11Message } from "../type/index.js"

/** API 转换器 */
export class PhiliaToOBv11 implements API.ServerAPI {
  client: Client
  cache = new Map<string, unknown>()
  constructor(client: Client) {
    this.client = client
  }

  receiveEvent({ event }: { event: Event.Handle | Event.Handle[] }) {
    return this.client.event_handle.receive(event)
  }

  unreceiveEvent({ event }: { event: Event.Handle | Event.Handle[] }) {
    return this.client.event_handle.unreceive(event)
  }

  async getSelfInfo(req: void | { refresh: boolean }) {
    if (!req?.refresh && this.cache.has("self_info"))
      return this.cache.get("self_info") as Contact.Self
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
    if (data.avatar) await this.client.api.set_qq_avatar({ file: String(data.avatar) })
  }

  async getUserInfo({ id, refresh }: { id: Contact.User["id"]; refresh?: boolean }) {
    const res = await this.client.api.get_stranger_info({
      user_id: Number(id),
      no_cache: refresh,
    })
    const ret: Contact.User = {
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${res.user_id}`,
      ...res,
      id: String(res.user_id),
      name: res.nickname,
    }
    return ret
  }

  async getGroupInfo({ id, refresh }: { id: Contact.Group["id"]; refresh?: boolean }) {
    const res = await this.client.api.get_group_info({
      group_id: Number(id),
      no_cache: refresh,
    })
    const ret: Contact.Group = {
      avatar: `https://p.qlogo.cn/gh/${res.group_id}/${res.group_id}/0`,
      ...res,
      id: String(res.group_id),
      name: res.group_name,
      remark: res.group_memo,
    }
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
    const res = await this.client.api.get_group_member_info({
      group_id: Number(id),
      user_id: Number(uid),
      no_cache: refresh,
    })
    const ret: Contact.GroupMember = {
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${res.user_id}`,
      ...res,
      id: String(res.user_id),
      name: res.nickname,
    }
    return ret
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
          await this.client.api.set_friend_remark({ user_id: Number(id), remark: data.remark })
        break
      case "group":
        if (data.name !== undefined)
          await this.client.api.set_group_name({ group_id: Number(id), group_name: data.name })
        if (data.avatar !== undefined)
          await this.client.api.set_group_portrait({
            group_id: Number(id),
            file: String(data.avatar),
          })
        if (data.remark !== undefined)
          await this.client.api.set_group_remark({ group_id: Number(id), remark: data.remark })
        if (data.whole_mute !== undefined)
          await this.client.api.set_group_whole_ban({
            group_id: Number(id),
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
        group_id: Number(id),
        user_id: Number(uid),
        card: data.card,
      })
    if (data.role !== undefined)
      await this.client.api.set_group_admin({
        group_id: Number(id),
        user_id: Number(uid),
        enable: data.role === "admin",
      })
    if (data.title !== undefined)
      await this.client.api.set_group_special_title({
        group_id: Number(id),
        user_id: Number(uid),
        special_title: data.title,
      })
    if (data.mute_time !== undefined)
      await this.client.api.set_group_ban({
        group_id: Number(id),
        user_id: Number(uid),
        duration: data.mute_time,
      })
  }

  delUser({ id }: { id: Contact.User["id"] }) {
    return this.client.api.delete_friend({ user_id: Number(id) })
  }

  delGroup({ id, dismiss }: { id: Contact.Group["id"]; dismiss?: boolean }) {
    return this.client.api.set_group_leave({ group_id: Number(id), is_dismiss: dismiss })
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
      [scene === "user" ? "user_id" : "group_id"]: Number(id),
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
    const messages: OBv11Message.ForwardNode[] = []
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
          user_id: Number(id),
          messages,
        })
      : this.client.api.send_group_forward_msg({
          group_id: Number(id),
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
        file = await this.uploadCacheFile({ file: data.binary || (data.url as string) })
        break
    }
    return scene === "user"
      ? this.client.api.upload_private_file({
          user_id: Number(id),
          file,
          name: data.name,
        })
      : this.client.api.upload_group_file({
          group_id: Number(id),
          file,
          name: data.name,
        })
  }

  async _convertMsg(res: OBv11Event.Message) {
    const message = await new MessageConverter.OBv11toPhilia(
      this.client,
      res as unknown as OBv11Event.Message,
    ).convert()
    const ret = {
      ...res,
      id: String(res.message_id),
      type: "message",
      scene: "user",
      user: {
        avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${res.sender.user_id}`,
        ...res.sender,
        id: String(res.sender.user_id),
        name: res.sender.nickname,
      },
      message: message.after,
      summary: message.summary,
    } as Event.Message

    if (res.message_type === "group") {
      ret.scene = "group"
      ret.group = await this.getGroupInfo({ id: String(res.group_id) })
    }
    return ret
  }

  async getMsg({ id }: { id: Event.Message["id"] }) {
    const res = await this.client.api.get_msg({ message_id: Number(id) })
    return this._convertMsg(res)
  }

  delMsg({ id }: { id: Event.Message["id"] }) {
    return this.client.api.delete_msg({ message_id: Number(id) })
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
    const message = await this.client.api.get_msg({ message_id: Number(mid) })
    const res = await this.client.api.send_msg({
      [scene === "user" ? "user_id" : "group_id"]: Number(id),
      message: message.message,
    })
    const ret: Message.RSendMsg = {
      time: Math.floor(Date.now() / 1000),
      ...res,
      id: String(res.message_id),
    }
    return ret
  }

  getFile({ id }: { id: Message.AFile["id"] }) {
    /** TODO: 获取文件 */
    return { id } as Message.AFile
  }

  async getForwardMsg({ id }: { id: string }) {
    const res = await this.client.api.get_forward_msg({ message_id: Number(id) })
    return Promise.all(res.message.map(this._convertMsg.bind(this)))
  }

  async getChatHistory({
    type,
    id,
    count,
  }: {
    type: "message" | Event.Message["scene"]
    id: (Event.Message | Contact.User | Contact.Group)["id"]
    count?: number
  }) {
    let res: { messages: OBv11Event.Message[] }
    if (type === "message") {
      const msg = await this.client.api.get_msg({ message_id: Number(id) })
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
        ? this.client.api.get_friend_msg_history({ user_id: Number(id) })
        : this.client.api.get_group_msg_history({ group_id: Number(id) }))
    }
    return Promise.all(res.messages.map(this._convertMsg.bind(this)))
  }

  async getUserList() {
    const res = await this.client.api.get_friend_list()
    const ret: Contact.User["id"][] = res.map(i => String(i.user_id))
    return ret
  }

  async getUserArray() {
    const res = await this.client.api.get_friend_list()
    const ret: Contact.User[] = res.map(i => ({
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${i.user_id}`,
      ...i,
      id: String(i.user_id),
      name: i.nickname,
    }))
    return ret
  }

  async getGroupList() {
    const res = await this.client.api.get_group_list()
    const ret: Contact.Group["id"][] = res.map(i => String(i.group_id))
    return ret
  }

  async getGroupArray() {
    const res = await this.client.api.get_group_list()
    const ret: Contact.Group[] = res.map(i => ({
      avatar: `https://p.qlogo.cn/gh/${i.group_id}/${i.group_id}/0`,
      ...i,
      id: String(i.group_id),
      name: i.group_name,
    }))
    return ret
  }

  async getGroupMemberList({ id }: { id: Contact.Group["id"] }) {
    const res = await this.client.api.get_group_member_list({ group_id: Number(id) })
    const ret: Contact.GroupMember["id"][] = res.map(i => String(i.user_id))
    return ret
  }

  async getGroupMemberArray({ id }: { id: Contact.Group["id"] }) {
    const res = await this.client.api.get_group_member_list({ group_id: Number(id) })
    const ret: Contact.GroupMember[] = res.map(i => ({
      avatar: `https://q.qlogo.cn/g?b=qq&s=0&nk=${i.user_id}`,
      ...i,
      id: String(i.user_id),
      name: i.nickname,
    }))
    return ret
  }

  getRequestArray() {
    const ret: Event.Request[] = Array.from(this.client.protocol.convert.event_map.values())
    return ret
  }

  async setRequest({ id, result, reason }: { id: string; result: boolean; reason?: string }) {
    const event = this.getRequestArray().find(i => i.id === id)
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
