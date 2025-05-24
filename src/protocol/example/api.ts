import { Client } from "../../socket/index.js"
import { API as IAPI, Contact, Message, Event } from "../type/index.js"

/** API 转换器 */
export default class API implements IAPI.API {
  client: Client
  request: Client["request"]

  constructor(client: Client) {
    this.client = client
    this.request = this.client.request.bind(this.client)
  }

  receiveEvent(event: Event.Handle | Event.Handle[]) {
    return this.request("receiveEvent", { event }) as Promise<void>
  }

  unreceiveEvent(event: Event.Handle | Event.Handle[]) {
    return this.request("unreceiveEvent", { event }) as Promise<void>
  }

  getSelfInfo(refresh?: boolean) {
    return this.request("getSelfInfo", { refresh }) as Promise<Contact.Self>
  }

  setSelfInfo(data: Partial<Contact.Self>): Promise<void> {
    return this.request("setSelfInfo", { data }) as Promise<void>
  }

  getUserInfo(id: Contact.User["id"], refresh?: boolean) {
    return this.request("getUserInfo", { id, refresh }) as Promise<Contact.User>
  }

  getGroupInfo(id: Contact.Group["id"], refresh?: boolean) {
    return this.request("getGroupInfo", { id, refresh }) as Promise<Contact.Group>
  }

  getGroupMemberInfo(id: Contact.Group["id"], uid: Contact.User["id"], refresh?: boolean) {
    return this.request("getGroupMemberInfo", { id, uid, refresh }) as Promise<Contact.GroupMember>
  }

  setInfo(
    scene: Event.Message["scene"],
    id: (Contact.User | Contact.Group)["id"],
    data: Partial<Contact.User | Contact.Group>,
  ) {
    return this.request("setInfo", { scene, id, data }) as Promise<void>
  }

  setGroupMemberInfo(
    id: Contact.Group["id"],
    uid: Contact.User["id"],
    data: Partial<Contact.GroupMember>,
  ) {
    return this.request("setGroupMemberInfo", { id, uid, data }) as Promise<void>
  }

  delUser(id: Contact.User["id"], block?: boolean) {
    return this.request("delUser", { id, block }) as Promise<void>
  }

  delGroup(id: Contact.Group["id"], block?: boolean) {
    return this.request("delGroup", { id, block }) as Promise<void>
  }

  delGroupMember(id: Contact.Group["id"], uid: Contact.User["id"], block?: boolean) {
    return this.request("delGroupMember", { id, uid, block }) as Promise<void>
  }

  sendMsg(scene: Event.Message["scene"], id: Contact.User["id"], data: Message.Message) {
    return this.request("sendMsg", {
      scene,
      id,
      data,
    }) as Promise<Message.RSendMsg>
  }

  getMsg(id: Message.RSendMsg["id"]) {
    return this.request("getMsg", { id }) as Promise<Event.Message>
  }

  delMsg(id: string) {
    return this.request("delMsg", { id }) as Promise<undefined>
  }

  sendMsgForward(
    scene: Event.Message["scene"],
    id: (Contact.User | Contact.Group)["id"],
    mid: Event.Message["id"],
  ) {
    return this.request("sendMsgForward", {
      scene,
      id,
      mid,
    }) as Promise<Message.RSendMsg>
  }

  getFile(id: Message.AFile["id"]) {
    return this.request("getFile", { id }) as Promise<Message.AFile>
  }

  getForwardMsg(id: string) {
    return this.request("getForwardMsg", { id }) as Promise<Message.Forward["data"]>
  }

  getChatHistory(
    type: "message" | Event.Message["scene"],
    id: (Event.Message | Contact.User | Contact.Group)["id"],
    count?: number,
  ) {
    return this.request("getChatHistory", { type, id, count }) as Promise<Event.Message[]>
  }

  getUserList() {
    return this.request("getUserList") as Promise<Contact.User["id"][]>
  }

  getUserArray() {
    return this.request("getUserArray") as Promise<Contact.User[]>
  }

  getGroupList() {
    return this.request("getGroupList") as Promise<Contact.Group["id"][]>
  }

  getGroupArray() {
    return this.request("getGroupArray") as Promise<Contact.Group[]>
  }

  getGroupMemberList(id: Contact.Group["id"]) {
    return this.request("getGroupMemberList", { id }) as Promise<Contact.GroupMember["id"][]>
  }

  getGroupMemberArray(id: Contact.Group["id"]) {
    return this.request("getGroupMemberArray", { id }) as Promise<Contact.GroupMember[]>
  }

  getRequestArray() {
    return this.request("getRequestArray") as Promise<Event.Request[]>
  }

  setRequest(id: string, result: boolean, reason?: string, block?: boolean) {
    return this.request("setRequest", {
      id,
      result,
      reason,
      block,
    }) as Promise<void>
  }

  setGroupMute(
    id: Contact.Group["id"],
    type: "user" | "all",
    uid?: Contact.User["id"],
    time?: number,
  ) {
    return this.request("setGroupMute", {
      id,
      type,
      uid,
      time,
    }) as Promise<void>
  }

  sendGroupNotice(id: Contact.Group["id"], message: Message.Message) {
    return this.request("sendGroupNotice", {
      id,
      message,
    }) as Promise<void>
  }

  uploadCacheFile(file: string | Buffer) {
    return this.request("uploadFile", { file }) as Promise<string>
  }

  clearCache() {
    return this.request("clearCache") as Promise<void>
  }

  /* 以下为 OICQ 扩展 API */
  sendPoke(
    scene: Event.Message["scene"],
    id: (Contact.User | Contact.Group)["id"],
    tid: Contact.User["id"],
  ) {
    return this.request("sendPoke", { scene, id, tid }) as Promise<void>
  }

  writeUni(cmd: string, body: Uint8Array, seq = 0) {
    return this.request("writeUni", { cmd, body, seq }) as Promise<void>
  }

  sendOidb(cmd: string, body: Uint8Array, timeout = 5) {
    return this.request("sendOidb", { cmd, body, timeout }) as Promise<Buffer>
  }

  sendPacket(type: string, cmd: string, body: any) {
    return this.request("sendPacket", { type, cmd, body }) as Promise<Buffer>
  }

  sendUni(cmd: string, body: Uint8Array, timeout = 5) {
    return this.request("sendUni", { cmd, body, timeout }) as Promise<Buffer>
  }

  sendOidbSvcTrpcTcp(cmd: string, body: Uint8Array | object) {
    return this.request("sendOidbSvcTrpcTcp", { cmd, body }) as Promise<any>
  }

  getRoamingStamp(refresh?: boolean) {
    return this.request("getRoamingStamp", { refresh }) as Promise<string[]>
  }

  delRoamingStamp(id: string | string[]) {
    return this.request("delRoamingStamp", { id }) as Promise<void>
  }

  setUserClass(name: string | number, id: Contact.User["id"]) {
    return this.request("setUserClass", { name, id }) as Promise<void>
  }

  addUserClass(name: string) {
    return this.request("addUserClass", { name }) as Promise<void>
  }

  delUserClass(name: string | number) {
    return this.request("delUserClass", { name }) as Promise<void>
  }

  renameUserClass(name: string | number, new_name: string) {
    return this.request("renameUserClass", { name, new_name }) as Promise<void>
  }

  getImageOCR(image: Message.Image) {
    return this.request("getImageOCR", { image })
  }

  getSelfCookie(domain?: string) {
    return this.request("getSelfCookie", { domain }) as Promise<string | Record<string, string>>
  }

  getSelfCSRFToken() {
    return this.request("getSelfCSRFToken") as Promise<number>
  }

  sendUserLike(id: Contact.User["id"], times: number) {
    return this.request("sendUserLike", { id, times }) as Promise<void>
  }

  addUserBack(id: Contact.User["id"], seq: number, mark: string) {
    return this.request("addUserBack", { id, seq, mark }) as Promise<void>
  }

  searchUserSameGroup(id: Contact.User["id"]) {
    return this.request("searchUserSameGroup", { id }) as Promise<Contact.Group[]>
  }

  getGroupFSDf(id: Contact.Group["id"]) {
    return this.request("getGroupFSDf", { id })
  }

  getGroupFSStat(id: Contact.Group["id"], fid: string) {
    return this.request("getGroupFSStat", { id, fid })
  }

  getGroupFSDir(id: Contact.Group["id"], pid?: string, start?: number, limit?: number) {
    return this.request("getGroupFSDir", { id, pid, start, limit })
  }

  addGroupFSDir(id: Contact.Group["id"], name: string) {
    return this.request("addGroupFSDir", { id, name })
  }

  delGroupFSFile(id: Contact.Group["id"], fid: string) {
    return this.request("delGroupFSFile", { id, fid }) as Promise<void>
  }

  renameGroupFSFile(id: Contact.Group["id"], fid: string, name: string) {
    return this.request("renameGroupFSFile", { id, fid, name }) as Promise<void>
  }

  moveGroupFSFile(id: Contact.Group["id"], fid: string, pid: string) {
    return this.request("moveGroupFSFile", { id, fid, pid }) as Promise<void>
  }

  uploadGroupFSFile(file: string | Buffer, pid?: string, name?: string) {
    return this.request("uploadGroupFSFile", { file, pid, name })
  }

  forwardGroupFSFile(fid: unknown | string, pid?: string, name?: string) {
    return this.request("forwardGroupFSFile", { fid, pid, name })
  }

  getGroupFSFile(fid: string) {
    return this.request("getGroupFSFile", { fid }) as Promise<{ url: string }>
  }

  addGroupEssence(id: Event.Message["id"] | Contact.Group["id"], seq?: number, rand?: number) {
    return this.request("addGroupEssence", { id, seq, rand }) as Promise<void>
  }

  delGroupEssence(id: Event.Message["id"] | Contact.Group["id"], seq?: number, rand?: number) {
    return this.request("delGroupEssence", { id, seq, rand }) as Promise<void>
  }

  setReaded(id: Event.Message["id"] | Contact.Group["id"], seq?: number) {
    return this.request("setReaded", { id, seq }) as Promise<void>
  }

  setMessageRate(id: Contact.Group["id"], times: number) {
    return this.request("setMessageRate", { id, times }) as Promise<void>
  }

  setGroupJoinType(id: Contact.Group["id"], type: string, question?: string, answer?: string) {
    return this.request("setGroupJoinType", { id, type, question, answer }) as Promise<void>
  }

  getGroupAtAllRemainder(id: Contact.Group["id"]) {
    return this.request("getGroupAtAllRemainder", { id }) as Promise<number>
  }

  sendGroupUserInvite(id: Contact.Group["id"], uid: Contact.User["id"]) {
    return this.request("sendGroupUserInvite", { id, uid }) as Promise<void>
  }

  sendGroupSign(id: Contact.Group["id"]) {
    return this.request("sendGroupSign", { id }) as Promise<void>
  }

  getGroupMemberMuteList(id: Contact.Group["id"]) {
    return this.request("getGroupMemberMuteList", { id })
  }

  setReaction(
    type: "message" | Event.Message["scene"],
    id: (Event.Message | Contact.User | Contact.Group)["id"],
    eid: string,
    etype?: number,
    seq?: number,
  ) {
    return this.request("setReaction", { type, id, eid, etype, seq }) as Promise<void>
  }

  delReaction(
    type: "message" | Event.Message["scene"],
    id: (Event.Message | Contact.User | Contact.Group)["id"],
    eid: string,
    etype?: number,
    seq?: number,
  ) {
    return this.request("delReaction", { type, id, eid, etype, seq }) as Promise<void>
  }
}
