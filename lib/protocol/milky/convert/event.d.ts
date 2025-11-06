import type * as Philia from "#protocol/type";
import type Impl from "../impl.js";
import type * as Milky from "../type/index.js";
/** 事件转换器 */
export default class Event {
	impl: Impl;
	constructor(impl: Impl);
	convert(event: Milky.Event.Event): Promise<Philia.Event.Event>;
	IncomingForwardedMessage(data: Milky.Struct.IncomingForwardedMessage): Promise<Philia.Message.Forward>;
	IncomingMessage(data: Milky.Struct.IncomingMessage): Promise<Philia.Event.Message>;
	message_receive(data: Milky.Event.MessageReceive): Promise<Philia.Event.Message>;
	bot_offline(data: Milky.Event.BotOffline): Promise<Philia.Event.BotOffline>;
	message_recall(data: Milky.Event.MessageRecall): Promise<Philia.Event.UserMessageRecall | Philia.Event.GroupMessageRecall>;
	FriendRequest(data: Milky.Struct.FriendRequest): Promise<Philia.Event.UserRequest>;
	friend_request(data: Milky.Event.FriendRequest): Promise<Philia.Event.UserRequest>;
	GroupRequest(data: Milky.Struct.GroupRequest): Promise<Philia.Event.GroupRequest>;
	group_request(data: Milky.Event.GroupRequest): Promise<Philia.Event.GroupRequest>;
	GroupInvitation(data: Milky.Struct.GroupInvitation): Promise<Philia.Event.GroupRequest>;
	group_invitation(data: Milky.Event.GroupInvitation): Promise<Philia.Event.GroupRequest>;
	friend_nudge(data: Milky.Event.FriendNudge): Promise<Philia.Event.UserPoke>;
	friend_file_upload(data: Milky.Event.FriendFileUpload): Promise<Philia.Event.UserFileUpload>;
	group_admin_change(data: Milky.Event.GroupAdminChange): Promise<Philia.Event.GroupMemberInfo>;
	group_essence_message_change(data: Milky.Event.GroupEssenceMessageChange): Promise<Philia.Event.GroupEssenceMessage>;
	group_member_increase(data: Milky.Event.GroupMemberIncrease): Promise<Philia.Event.GroupMember>;
	group_member_decrease(data: Milky.Event.GroupMemberDecrease): Promise<Philia.Event.GroupMember>;
	group_name_change(data: Milky.Event.GroupNameChange): Promise<Philia.Event.GroupInfo>;
	group_message_reaction(data: Milky.Event.GroupMessageReaction): Promise<Philia.Event.GroupMessageReaction>;
	group_mute(data: Milky.Event.GroupMute): Promise<Philia.Event.GroupMemberInfo>;
	group_whole_mute(data: Milky.Event.GroupWholeMute): Promise<Philia.Event.GroupInfo>;
	group_nudge(data: Milky.Event.GroupNudge): Promise<Philia.Event.GroupPoke>;
	group_file_upload(data: Milky.Event.GroupFileUpload): Promise<Philia.Event.GroupFileUpload>;
}
