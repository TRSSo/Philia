import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { ulid } from "ulid"
import type { API, Contact, Event, Message } from "#protocol/type"
import { toBuffer } from "#util"
import type Impl from "../impl.js"
import MessageConvert from "./message.js"

export default class PhiliaToTTY implements API.API {
  constructor(public impl: Impl) {}

  getVersion() {
    return {
      impl: { id: "TTY", name: "终端", version: "1" },
      proto: {
        id: process.platform,
        name: `${os.type()} ${os.machine()} ${os.release()}`,
        version: `${process.release.name} ${process.version} ${process.arch}`,
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

  getSelfInfo() {
    return this.impl.self
  }

  setSelfInfo({ data }: API.Req<"setSelfInfo">) {
    Object.assign(this.impl.self, data)
  }

  getUserInfo({ id }: API.Req<"getUserInfo">) {
    for (const i of this.getUserArray()) if (i.id === id) return i
    throw Error("未找到用户")
  }

  getGroupInfo({ id }: API.Req<"getGroupInfo">) {
    for (const i of this.getGroupArray()) if (i.id === id) return i
    throw Error("未找到群")
  }

  getGroupMemberInfo({ id, uid }: API.Req<"getGroupMemberInfo">) {
    for (const i of this.getGroupMemberArray({ id })) if (i.id === uid) return i
    throw Error("未找到群成员")
  }

  _getInfo({
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

  setInfo({ scene, id, data }: API.Req<"setInfo">) {
    Object.assign(this._getInfo({ scene, id }), data)
  }

  setGroupMemberInfo({ id, uid, data }: API.Req<"setGroupMemberInfo">) {
    Object.assign(this.getGroupMemberInfo({ id, uid }), data)
  }

  delUser({ id }: API.Req<"delUser">) {
    this.getUserInfo({ id })
    throw Error("无法删除用户")
  }

  delGroup({ id }: API.Req<"delGroup">) {
    this.getGroupInfo({ id })
    throw Error("无法删除群")
  }

  delGroupMember({ id, uid }: API.Req<"delGroupMember">) {
    this.getGroupMemberInfo({ id, uid })
    throw Error("无法删除群成员")
  }

  async sendMsg({ scene, id, data }: API.Req<"sendMsg">) {
    const message = await new MessageConvert(this.impl, data).convert()
    this.impl.logger.info(`发送${scene === "user" ? "用户" : "群"}消息 ${id} ${message}`)
    const ret: Message.RSendMsg = { id: ulid(), time: Date.now() / 1e3 }
    const event = {
      ...ret,
      type: "message",
      scene,
      message: data,
      summary: message,
    } as Event.Message
    if (scene === "user") {
      ;(event as Event.UserMessage).is_self = true
      event.user = this.getUserInfo({ id })
    } else {
      event.user = this.getSelfInfo()
      event.group = this.getGroupInfo({ id })
    }
    this.impl.event_message_map.set(ret.id, event)
    return ret
  }

  async sendMultiMsg({ scene, id, data }: API.Req<"sendMultiMsg">) {
    const ret: Message.RSendMsg[] = []
    for (const i of data)
      ret.push(await this.sendMsg({ scene, id: i.user?.id || id, data: i.message }))
    return ret
  }

  getMsg({ id }: API.Req<"getMsg">) {
    const ret = this.impl.event_message_map.get(id)
    if (!ret) throw Error("未找到消息")
    return ret
  }

  delMsg({ id }: API.Req<"delMsg">) {
    this.getMsg({ id })
  }

  sendMsgForward({ scene, id, mid }: API.Req<"sendMsgForward">) {
    const { message } = this.getMsg({ id: mid })
    return this.sendMsg({ scene, id, data: message })
  }

  async getFile({ id }: API.Req<"getFile">) {
    const ret: Message.BinaryFile = {
      type: "file",
      name: id,
      data: "binary",
      binary: await fs.readFile(path.join(this.impl.path, "temp", id)),
    }
    return ret
  }

  getChatHistory({ type, id, count, newer }: API.Req<"getChatHistory">) {
    const ret: Event.Message[] = []
    if (type === "message") {
      const message = this.getMsg({ id })
      for (const i of [...this.impl.event_message_map.values()].reverse())
        if (
          i.scene === message.scene &&
          i[message.scene]?.id === message[message.scene]?.id &&
          (newer ? i.time >= message.time : i.time <= message.time)
        ) {
          ret.push(i)
          if (count && ret.length === count) break
        }
    } else {
      for (const i of [...this.impl.event_message_map.values()].reverse())
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
    return [this.impl.user, this.impl.self]
  }
  getGroupList() {
    return this.getGroupArray().map(i => i.id)
  }
  getGroupArray() {
    return [this.impl.group]
  }
  getGroupMemberList({ id }: API.Req<"getGroupMemberList">) {
    return this.getGroupMemberArray({ id }).map(i => i.id)
  }
  getGroupMemberArray({ id }: API.Req<"getGroupMemberArray">) {
    return this.getGroupInfo({ id }) && (this.getUserArray() as Contact.GroupMember[])
  }

  getRequestArray({ scene, count }: API.Req<"getRequestArray"> = {}) {
    let ret: Event.Request[] = Array.from(this.impl.event_request_map.values())
    if (scene) ret = ret.filter(i => i.scene === scene)
    if (count) ret = ret.slice(0, count)
    return ret
  }

  async setRequest({ id, result }: API.Req<"setRequest">) {
    const event = this.impl.event_request_map.get(id)
    if (!event) throw Error("未找到请求")
    event.state = result ? "accepted" : "rejected"
  }

  async uploadCacheFile({ file }: API.Req<"uploadCacheFile">) {
    const id = ulid()
    await fs.writeFile(path.join(this.impl.path, "temp", id), await toBuffer(file))
    return id
  }

  async clearCache() {
    const dir = path.join(this.impl.path, "temp")
    await fs.rm(dir, { recursive: true, force: true })
    await fs.mkdir(dir)
  }
}
