import type { API, Contact, Event, Message } from "#protocol/type";
import type Client from "../impl/client.js";
import type * as OBv11 from "../type/index.js";
/** API 转换器 */
export declare class PhiliaToOBv11 implements API.API {
	client: Client;
	cache: Map<string, unknown>;
	user_cache: Map<string, Contact.User>;
	group_cache: Map<string, Contact.Group>;
	group_member_cache: Map<string, Map<string, Contact.GroupMember>>;
	constructor(client: Client);
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
	receiveEvent({ event }: API.Req<"receiveEvent">, client?: Parameters<typeof this.client.event_handle.receive>[1]): void;
	unreceiveEvent({ event }: API.Req<"unreceiveEvent">, client?: Parameters<typeof this.client.event_handle.unreceive>[1]): void;
	getSelfInfo({ refresh }?: API.Req<"getSelfInfo">): Promise<Contact.Self>;
	setSelfInfo({ data }: API.Req<"setSelfInfo">): Promise<void>;
	_convertUserInfo(res: OBv11.API.IAPI["get_stranger_info"]["response"] | OBv11.Event.Sender): Contact.User;
	getUserInfo({ id, refresh }: API.Req<"getUserInfo">): Promise<Contact.User>;
	_convertGroupInfo(res: OBv11.API.IAPI["get_group_info"]["response"]): Contact.Group;
	getGroupInfo({ id, refresh }: API.Req<"getGroupInfo">): Promise<Contact.Group>;
	_convertGroupMemberInfo(gid: Contact.Group["id"], res: OBv11.API.IAPI["get_group_member_info"]["response"] | OBv11.Event.GroupSender): Contact.GroupMember;
	getGroupMemberInfo({ id, uid, refresh }: API.Req<"getGroupMemberInfo">): Promise<Contact.GroupMember>;
	setInfo({ scene, id, data }: API.Req<"setInfo">): Promise<void>;
	setGroupMemberInfo({ id, uid, data }: API.Req<"setGroupMemberInfo">): Promise<void>;
	delUser({ id }: API.Req<"delUser">): Promise<void>;
	delGroup({ id, dismiss }: API.Req<"delGroup">): Promise<void>;
	delGroupMember({ id, uid, block }: API.Req<"delGroupMember">): Promise<void>;
	sendMsg({ scene, id, data }: API.Req<"sendMsg">): Promise<Message.RSendMsg>;
	sendMultiMsg({ scene, id, data }: API.Req<"sendMultiMsg">): Promise<Message.RSendMsg[]>;
	_sendFile({ scene, id, data }: API.Req<"_sendFile">): Promise<void>;
	getMsg({ id }: API.Req<"getMsg">): Promise<Event.Message>;
	delMsg({ id }: API.Req<"delMsg">): Promise<void>;
	sendMsgForward({ scene, id, mid }: API.Req<"sendMsgForward">): Promise<Message.RSendMsg>;
	getFile({ id }: API.Req<"getFile">): Message.URLFile;
	getForwardMsg({ id }: API.Req<"getForwardMsg">): Promise<Event.Message[]>;
	getChatHistory({ type, id, count, newer }: API.Req<"getChatHistory">): Promise<Event.Message[]>;
	getUserList({ refresh }?: API.Req<"getUserList">): Promise<string[]>;
	getUserArray({ refresh }?: API.Req<"getUserArray">): Promise<Contact.User[]>;
	getGroupList({ refresh }?: API.Req<"getGroupList">): Promise<string[]>;
	getGroupArray({ refresh }?: API.Req<"getGroupArray">): Promise<Contact.Group[]>;
	getGroupMemberList({ id, refresh }: API.Req<"getGroupMemberList">): Promise<string[]>;
	getGroupMemberArray({ id, refresh }: API.Req<"getGroupMemberArray">): Promise<Contact.GroupMember[]>;
	getRequestArray({ scene, count }?: API.Req<"getRequestArray">): Event.Request[];
	setRequest({ id, result, reason }: API.Req<"setRequest">): Promise<void>;
	uploadCacheFile({ file }: API.Req<"uploadCacheFile">): Promise<string>;
	clearCache(): Promise<void>;
}
