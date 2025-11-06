import type { Logger } from "#logger";
import * as Philia from "#project/project/philia.js";
import { EventHandle } from "#protocol/common";
import * as Convert from "./convert/index.js";
import type { API } from "./type/index.js";
export default class Client {
	logger: Logger;
	philia: Philia.Project;
	url: URL;
	ws: WebSocket;
	timeout: number;
	open: boolean;
	api: {
		get_login_info: (data?: void | undefined) => Promise<{
			uin: number;
			nickname: string;
		}>;
		get_impl_info: (data?: void | undefined) => Promise<{
			impl_name: string;
			impl_version: string;
			qq_protocol_version: string;
			qq_protocol_type: "windows" | "linux" | "macos" | "android_pad" | "android_phone" | "ipad" | "iphone" | "harmony" | "watch";
			milky_version: string;
		}>;
		get_user_profile: (data: {
			user_id: number;
		}) => Promise<{
			nickname: string;
			qid?: string;
			age: number;
			sex: "male" | "female" | "unknown";
			remark?: string;
			bio?: string;
			level?: number;
			country?: string;
			city?: string;
			school?: string;
		}>;
		get_friend_list: (data?: void | {
			no_cache?: boolean;
		} | undefined) => Promise<{
			friends: import("./type/struct.js").Friend[];
		}>;
		get_friend_info: (data: {
			user_id: number;
			no_cache?: boolean;
		}) => Promise<{
			friend: import("./type/struct.js").Friend;
		}>;
		get_group_list: (data?: void | {
			no_cache?: boolean;
		} | undefined) => Promise<{
			groups: import("./type/struct.js").Group[];
		}>;
		get_group_info: (data: {
			group_id: number;
			no_cache?: boolean;
		}) => Promise<{
			group: import("./type/struct.js").Group;
		}>;
		get_group_member_list: (data: {
			group_id: number;
			no_cache?: boolean;
		}) => Promise<{
			members: import("./type/struct.js").GroupMember[];
		}>;
		get_group_member_info: (data: {
			group_id: number;
			user_id: number;
			no_cache?: boolean;
		}) => Promise<{
			member: import("./type/struct.js").GroupMember;
		}>;
		send_private_message: (data: {
			user_id: number;
			message: import("./type/message.js").OutgoingSegment[];
		}) => Promise<{
			message_seq: number;
			time: number;
		}>;
		send_group_message: (data: {
			group_id: number;
			message: import("./type/message.js").OutgoingSegment[];
		}) => Promise<{
			message_seq: number;
			time: number;
		}>;
		get_message: (data: {
			message_scene: "friend" | "group" | "temp";
			peer_id: number;
			message_seq: number;
		}) => Promise<{
			message: import("./type/struct.js").IncomingMessage;
		}>;
		get_history_messages: (data: {
			message_scene: "friend" | "group" | "temp";
			peer_id: number;
			start_message_seq?: number;
			direction: "newer" | "older";
			limit?: number;
		}) => Promise<{
			messages: import("./type/struct.js").IncomingMessage[];
		}>;
		get_resource_temp_url: (data: {
			resource_id: string;
		}) => Promise<{
			url: string;
		}>;
		get_forwarded_messages: (data: {
			forward_id: string;
		}) => Promise<{
			messages: import("./type/struct.js").IncomingForwardedMessage[];
		}>;
		recall_private_message: (data: {
			user_id: number;
			message_seq: number;
		}) => Promise<void>;
		recall_group_message: (data: {
			group_id: number;
			message_seq: number;
		}) => Promise<void>;
		send_friend_nudge: (data: {
			user_id: number;
			is_self?: boolean;
		}) => Promise<void>;
		send_profile_like: (data: {
			user_id: number;
			count: number;
		}) => Promise<void>;
		set_group_name: (data: {
			group_id: number;
			name: string;
		}) => Promise<void>;
		set_group_avatar: (data: {
			group_id: number;
			image_uri: string;
		}) => Promise<void>;
		set_group_member_card: (data: {
			group_id: number;
			user_id: number;
			card: string;
		}) => Promise<void>;
		set_group_member_special_title: (data: {
			group_id: number;
			user_id: number;
			special_title: string;
		}) => Promise<void>;
		set_group_member_admin: (data: {
			group_id: number;
			user_id: number;
			is_set?: boolean;
		}) => Promise<void>;
		set_group_member_mute: (data: {
			group_id: number;
			user_id: number;
			duration: number;
		}) => Promise<void>;
		set_group_whole_mute: (data: {
			group_id: number;
			is_mute?: boolean;
		}) => Promise<void>;
		kick_group_member: (data: {
			group_id: number;
			user_id: number;
			reject_add_request?: boolean;
		}) => Promise<void>;
		get_group_announcement_list: (data: {
			group_id: number;
		}) => Promise<{
			announcements: import("./type/struct.js").GroupAnnouncement[];
		}>;
		send_group_announcement: (data: {
			group_id: number;
			content: string;
			image_uri?: string;
		}) => Promise<void>;
		delete_group_announcement: (data: {
			group_id: number;
			announcement_id: string;
		}) => Promise<void>;
		quit_group: (data: {
			group_id: number;
		}) => Promise<void>;
		send_group_message_reaction: (data: {
			group_id: number;
			message_seq: number;
			reaction: string;
			is_add?: boolean;
		}) => Promise<void>;
		send_group_nudge: (data: {
			group_id: number;
			user_id: number;
		}) => Promise<void>;
		get_friend_requests: (data?: void | {
			limit?: number;
		} | undefined) => Promise<{
			requests: import("./type/struct.js").FriendRequest[];
		}>;
		get_group_requests: (data?: void | {
			limit?: number;
		} | undefined) => Promise<{
			requests: import("./type/struct.js").GroupRequest[];
		}>;
		get_group_invitations: (data?: void | {
			limit?: number;
		} | undefined) => Promise<{
			invitations: import("./type/struct.js").GroupInvitation[];
		}>;
		accept_friend_request: (data: {
			request_id: string;
		}) => Promise<void>;
		reject_friend_request: (data: {
			request_id: string;
			reason?: string;
		}) => Promise<void>;
		accept_group_request: (data: {
			request_id: string;
		}) => Promise<void>;
		reject_group_request: (data: {
			request_id: string;
			reason?: string;
		}) => Promise<void>;
		accept_group_invitation: (data: {
			request_id: string;
		}) => Promise<void>;
		reject_group_invitation: (data: {
			request_id: string;
		}) => Promise<void>;
		upload_private_file: (data: {
			user_id: number;
			file_uri: string;
			file_name: string;
		}) => Promise<{
			file_id: string;
		}>;
		upload_group_file: (data: {
			group_id: number;
			file_uri: string;
			file_name: string;
			parent_folder_id?: string;
		}) => Promise<{
			file_id: string;
		}>;
		get_private_file_download_url: (data: {
			user_id: number;
			file_id: string;
		}) => Promise<{
			download_url: string;
		}>;
		get_group_file_download_url: (data: {
			group_id: number;
			file_id: string;
		}) => Promise<{
			download_url: string;
		}>;
		get_group_files: (data: {
			group_id: number;
			parent_folder_id?: string;
		}) => Promise<{
			files: import("./type/struct.js").GroupFile[];
			folders: import("./type/struct.js").GroupFolder[];
		}>;
		move_group_file: (data: {
			group_id: number;
			file_id: string;
			target_folder_id?: string;
		}) => Promise<void>;
		rename_group_file: (data: {
			group_id: number;
			file_id: string;
			new_name: string;
		}) => Promise<void>;
		delete_group_file: (data: {
			group_id: number;
			file_id: string;
		}) => Promise<void>;
		create_group_folder: (data: {
			group_id: number;
			folder_name: string;
		}) => Promise<{
			folder_id: string;
		}>;
		rename_group_folder: (data: {
			group_id: number;
			folder_id: string;
			new_name: string;
		}) => Promise<void>;
		delete_group_folder: (data: {
			group_id: number;
			folder_id: string;
		}) => Promise<void>;
	};
	handle: Convert.API;
	event: Convert.Event;
	event_handle: EventHandle;
	constructor(logger: Logger, philia: Philia.IConfig, url: string | URL);
	event_promise?: ReturnType<typeof Promise.withResolvers<Event>>;
	promiseEvent(): Promise<Event>;
	start(): Promise<void> | Promise<Event>;
	reconnect_delay: number;
	reconnect_timeout?: NodeJS.Timeout;
	reconnect(): void;
	close(): Promise<void | Event>;
	message(event: MessageEvent): Promise<void>;
	request<T extends keyof API.IAPI>(name: T, data?: API.Request<T>): Promise<API.IAPI[T]["response"]>;
}
