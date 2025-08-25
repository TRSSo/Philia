import type { API, Contact, Event, Message } from "#protocol/type";
import type Impl from "../impl.js";
import type * as Milky from "../type/index.js";
/** API 转换器 */
export default class PhiliaToMilky implements API.API {
  impl: Impl;
  cache: Map<string, unknown>;
  user_cache: Map<string, Contact.User>;
  group_cache: Map<string, Contact.Group>;
  group_member_cache: Map<string, Map<string, Contact.GroupMember>>;
  constructor(impl: Impl);
  getVersion(): Promise<{
    impl: {
      id: string;
      name: string;
      version: string;
    };
    proto: {
      id: string;
      name: string;
      version: string;
    };
  }>;
  receiveEvent({ event }: API.Req<"receiveEvent">, client?: Parameters<typeof this.impl.event_handle.receive>[1]): void;
  unreceiveEvent({ event }: API.Req<"unreceiveEvent">, client?: Parameters<typeof this.impl.event_handle.unreceive>[1]): void;
  getSelfInfo({ refresh }?: API.Req<"getSelfInfo">): Promise<Contact.Self>;
  setSelfInfo(): Promise<void>;
  _convertUserInfo(res: Milky.Struct.User): Contact.User;
  getUserInfo({ id, refresh }: API.Req<"getUserInfo">): Promise<Contact.User>;
  _convertGroupInfo(res: Milky.Struct.Group): Contact.Group;
  getGroupInfo({ id, refresh }: API.Req<"getGroupInfo">): Promise<Contact.Group>;
  _convertGroupMemberInfo(res: Milky.Struct.GroupMember): Contact.GroupMember;
  getGroupMemberInfo({ id, uid, refresh }: API.Req<"getGroupMemberInfo">): Promise<Contact.GroupMember>;
  setInfo({ scene, id, data }: API.Req<"setInfo">): Promise<void>;
  setGroupMemberInfo({ id, uid, data }: API.Req<"setGroupMemberInfo">): Promise<void>;
  delUser(): void;
  delGroup({ id, dismiss }: API.Req<"delGroup">): Promise<void>;
  delGroupMember({ id, uid, block }: API.Req<"delGroupMember">): Promise<void>;
  sendMsg({ scene, id, data }: API.Req<"sendMsg">): Promise<Message.RSendMsg>;
  sendMultiMsg({ scene, id, data }: API.Req<"sendMultiMsg">): Promise<Message.RSendMsg[]>;
  _getFileUri(data: API.Req<"_sendFile">["data"]): Promise<string>;
  _sendFile({ scene, id, data }: API.Req<"_sendFile">): Promise<string>;
  getMsg({ id }: API.Req<"getMsg">): Promise<Event.Message>;
  delMsg({ id }: API.Req<"delMsg">): Promise<void>;
  sendMsgForward({ scene, id, mid }: API.Req<"sendMsgForward">): Promise<Message.RSendMsg>;
  getFile({ id }: API.Req<"getFile">): Promise<Message.URLFile>;
  getForwardMsg({ id }: API.Req<"getForwardMsg">): Promise<Message.Forward[]>;
  getChatHistory({ type, id, count, newer }: API.Req<"getChatHistory">): Promise<Event.Message[]>;
  getUserList({ refresh }?: API.Req<"getUserList">): Promise<string[]>;
  getUserArray({ refresh }?: API.Req<"getUserArray">): Promise<Contact.User[]>;
  getGroupList({ refresh }?: API.Req<"getGroupList">): Promise<string[]>;
  getGroupArray({ refresh }?: API.Req<"getGroupArray">): Promise<Contact.Group[]>;
  getGroupMemberList({ id, refresh }: API.Req<"getGroupMemberList">): Promise<string[]>;
  getGroupMemberArray({ id, refresh }: API.Req<"getGroupMemberArray">): Promise<Contact.GroupMember[]>;
  getRequestArray({ scene, count }?: API.Req<"getRequestArray">): Promise<Event.Request[]>;
  setRequest({ id, result, reason }: API.Req<"setRequest">): Promise<void>;
  uploadCacheFile(): string;
  clearCache(): void;
  sendPoke({ scene, id, tid }: API.Req<"sendPoke">): Promise<void>;
  getGroupAnnounceList({ id }: API.Req<"getGroupAnnounceList">): Promise<{
    id: string;
    time: number;
    gid: string;
    uid: string;
    content: string;
    image: Message.URLFile;
  }[]>;
  sendGroupAnnounce({ id, content, image }: API.Req<"sendGroupAnnounce">): Promise<void>;
  delGroupAnnounce({ id, gid }: API.Req<"delGroupAnnounce">): Promise<void>;
}
