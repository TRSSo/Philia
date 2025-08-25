import type { API, Contact, Event, Message } from "#protocol/type";
import type Impl from "../impl.js";
export default class PhiliaToTTY implements API.API {
  impl: Impl;
  constructor(impl: Impl);
  getVersion(): {
    impl: {
      id: string;
      name: string;
      version: string;
    };
    proto: {
      id: NodeJS.Platform;
      name: string;
      version: string;
    };
  };
  receiveEvent({ event }: API.Req<"receiveEvent">, client?: Parameters<typeof this.impl.event_handle.receive>[1]): void;
  unreceiveEvent({ event }: API.Req<"unreceiveEvent">, client?: Parameters<typeof this.impl.event_handle.unreceive>[1]): void;
  getSelfInfo(): Contact.Self;
  setSelfInfo({ data }: API.Req<"setSelfInfo">): void;
  getUserInfo({ id }: API.Req<"getUserInfo">): Contact.Self;
  getGroupInfo({ id }: API.Req<"getGroupInfo">): Contact.Group;
  getGroupMemberInfo({ id, uid }: API.Req<"getGroupMemberInfo">): Contact.GroupMember;
  _getInfo({ scene, id, }: {
    scene: Event.Message["scene"];
    id: (Contact.User | Contact.Group)["id"];
  }): Contact.Self;
  setInfo({ scene, id, data }: API.Req<"setInfo">): void;
  setGroupMemberInfo({ id, uid, data }: API.Req<"setGroupMemberInfo">): void;
  delUser({ id }: API.Req<"delUser">): void;
  delGroup({ id }: API.Req<"delGroup">): void;
  delGroupMember({ id, uid }: API.Req<"delGroupMember">): void;
  sendMsg({ scene, id, data }: API.Req<"sendMsg">): Promise<Message.RSendMsg>;
  sendMultiMsg({ scene, id, data }: API.Req<"sendMultiMsg">): Promise<Message.RSendMsg[]>;
  getMsg({ id }: API.Req<"getMsg">): Event.Message;
  delMsg({ id }: API.Req<"delMsg">): void;
  sendMsgForward({ scene, id, mid }: API.Req<"sendMsgForward">): Promise<Message.RSendMsg>;
  getFile({ id }: API.Req<"getFile">): Promise<Message.BinaryFile>;
  getChatHistory({ type, id, count, newer }: API.Req<"getChatHistory">): Event.Message[];
  getUserList(): string[];
  getUserArray(): Contact.Self[];
  getGroupList(): string[];
  getGroupArray(): Contact.Group[];
  getGroupMemberList({ id }: API.Req<"getGroupMemberList">): string[];
  getGroupMemberArray({ id }: API.Req<"getGroupMemberArray">): Contact.GroupMember[];
  getRequestArray({ scene, count }?: API.Req<"getRequestArray">): Event.Request[];
  setRequest({ id, result }: API.Req<"setRequest">): Promise<void>;
  uploadCacheFile({ file }: API.Req<"uploadCacheFile">): Promise<string>;
  clearCache(): Promise<void>;
}
