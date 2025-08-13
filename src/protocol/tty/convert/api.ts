import fs from "node:fs/promises"
import path from "node:path"
import { ulid } from "ulid"
import type { API, Contact, Event, Message } from "#protocol/type"
import { toBuffer } from "#util"
import type Client from "../impl.js"
import MessageConvert from "./message.js"

export default class PhiliaToTTY implements API.API {
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

  getSelfInfo() {
    return this.client.self
  }

  setSelfInfo({ data }: { data: Partial<Contact.Self> }) {
    Object.assign(this.client.self, data)
  }

  getUserInfo({ id }: { id: Contact.User["id"] }) {
    for (const i of this.getUserArray()) if (i.id === id) return i
    throw Error("未找到用户")
  }

  getGroupInfo({ id }: { id: Contact.Group["id"] }) {
    for (const i of this.getGroupArray()) if (i.id === id) return i
    throw Error("未找到群")
  }

  getGroupMemberInfo({ id, uid }: { id: Contact.Group["id"]; uid: Contact.User["id"] }) {
    for (const i of this.getGroupMemberArray({ id })) if (i.id === uid) return i
    throw Error("未找到群成员")
  }

  getInfo({
    scene,
    id,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
  }) {
    switch (scene) {
      case "user":
        return this.getUserInfo({ id })
      case "group":
        return this.getGroupInfo({ id })
    }
  }

  setInfo({
    scene,
    id,
    data,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
    data: Partial<Contact.User | Contact.Group>
  }) {
    Object.assign(this.getInfo({ scene, id }), data)
  }

  setGroupMemberInfo({
    id,
    uid,
    data,
  }: {
    id: Contact.Group["id"]
    uid: Contact.User["id"]
    data: Partial<Contact.GroupMember>
  }) {
    Object.assign(this.getGroupMemberInfo({ id, uid }), data)
  }

  delUser({ id }: { id: Contact.User["id"] }) {
    this.getUserInfo({ id })
    throw Error("无法删除用户")
  }

  delGroup({ id }: { id: Contact.Group["id"] }) {
    this.getGroupInfo({ id })
    throw Error("无法删除群")
  }

  delGroupMember({ id, uid }: { id: Contact.Group["id"]; uid: Contact.GroupMember["id"] }) {
    this.getGroupMemberInfo({ id, uid })
    throw Error("无法删除群成员")
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
    const message = await new MessageConvert(this.client, data).convert()
    this.client.logger.info(`发送${scene === "user" ? "用户" : "群"}消息 ${id} ${message}`)
    const ret: Message.RSendMsg = { id: ulid(), time: Date.now() / 1000 }
    const event = {
      ...ret,
      type: "message",
      scene,
      message: data,
      summary: message,
    } as Event.Message
    if (scene === "user") {
      event.is_self = true
      event.user = this.getUserInfo({ id })
    } else {
      event.user = this.getSelfInfo()
      event.group = this.getGroupInfo({ id })
    }
    this.client.event_message_map.set(ret.id, event)
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
    const ret: Message.RSendMsg[] = []
    for (const i of data)
      ret.push(await this.sendMsg({ scene, id: i.user?.id || id, data: i.message }))
    return ret
  }

  getMsg({ id }: { id: Event.Message["id"] }) {
    const ret = this.client.event_message_map.get(id)
    if (!ret) throw Error("未找到消息")
    return ret
  }

  delMsg({ id }: { id: Event.Message["id"] }) {
    this.getMsg({ id })
  }

  sendMsgForward({
    scene,
    id,
    mid,
  }: {
    scene: Event.Message["scene"]
    id: (Contact.User | Contact.Group)["id"]
    mid: Event.Message["id"]
  }) {
    const { message } = this.getMsg({ id: mid })
    return this.sendMsg({ scene, id, data: message })
  }

  async getFile({ id }: { id: Message.IDFile["id"] }) {
    const ret: Message.BinaryFile = {
      type: "file",
      name: id,
      data: "binary",
      binary: await fs.readFile(path.join(this.client.path, "temp", id)),
    }
    return ret
  }

  getChatHistory({
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
    const ret: Event.Message[] = []
    if (type === "message") {
      const message = this.getMsg({ id })
      for (const i of [...this.client.event_message_map.values()].reverse())
        if (
          i.scene === message.scene &&
          i[message.scene]?.id === message[message.scene]?.id &&
          (newer ? i.time >= message.time : i.time <= message.time)
        ) {
          ret.push(i)
          if (count && ret.length === count) break
        }
    } else {
      for (const i of [...this.client.event_message_map.values()].reverse())
        if (i.scene === type && i[type]?.id === id) {
          ret.push(i)
          if (count && ret.length === count) break
        }
    }
    return ret
  }

  getUserList() {
    return this.getUserArray().map(i => i.id)
  }
  getUserArray() {
    return [this.client.user, this.client.self]
  }
  getGroupList() {
    return this.getGroupArray().map(i => i.id)
  }
  getGroupArray() {
    return [this.client.group]
  }
  getGroupMemberList({ id }: { id: Contact.Group["id"] }) {
    return this.getGroupMemberArray({ id }).map(i => i.id)
  }
  getGroupMemberArray({ id }: { id: Contact.Group["id"] }) {
    return this.getGroupInfo({ id }) && (this.getUserArray() as Contact.GroupMember[])
  }

  getRequestArray({
    scene,
    count,
  }: void | { scene?: Event.Request["scene"]; count?: number } = {}) {
    let ret: Event.Request[] = Array.from(this.client.event_request_map.values())
    if (scene) ret = ret.filter(i => i.scene === scene)
    if (count) ret = ret.slice(0, count)
    return ret
  }

  async setRequest({ id, result }: { id: string; result: boolean }) {
    const event = this.client.event_request_map.get(id)
    if (!event) throw Error("未找到请求")
    event.state = result ? "accepted" : "rejected"
  }

  async uploadCacheFile({ file }: { file: string | Buffer }) {
    const id = ulid()
    await fs.writeFile(path.join(this.client.path, "temp", id), await toBuffer(file))
    return id
  }

  async clearCache() {
    const dir = path.join(this.client.path, "temp")
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir)
  }
}
