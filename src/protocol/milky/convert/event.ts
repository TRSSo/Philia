import Client from "../server/client.js"
import * as Milky from "../type/index.js"
import * as Philia from "#protocol/type"
import { makeError } from "#util"
import * as Message from "./message.js"
import * as Common from "./common.js"

/** 事件转换器 */
export default class Event {
  constructor(public client: Client) {}

  convert(event: Milky.Event.Event) {
    if (typeof this[event.event_type] === "function")
      return this[event.event_type](event as never) as Promise<Philia.Event.Event>
    throw makeError(`未知事件：${event.event_type}`, { event })
  }

  async IncomingMessage(data: Milky.Struct.IncomingMessage) {
    const message = await new Message.MilkyToPhilia(this.client, data).convert()
    const event = {
      id: Common.encodeMessageID(data.message_scene, data.peer_id, data.message_seq),
      type: "message",
      time: data.time || Date.now() / 1000,
      scene: "user",
      message: message.after,
      summary: message.summary,
    } as Philia.Event.Message

    switch (data.message_scene) {
      case "friend":
        event.user = this.client.handle._convertUserInfo(data.friend)
        break
      case "group":
        event.scene = "group"
        event.user = this.client.handle._convertUserInfo(data.group_member)
        event.group = this.client.handle._convertGroupInfo(data.group)
      case "temp":
        if (data.group) {
          event.user = await this.client.handle.getGroupMemberInfo({
            id: String(data.group.group_id),
            uid: String(data.sender_id),
          })
          event.group = this.client.handle._convertGroupInfo(data.group)
        } else {
          event.user = { id: String(data.sender_id), name: "未知" }
        }
    }
    return event
  }

  async message_receive(data: Milky.Event.MessageReceive) {
    return this.IncomingMessage(data.data)
  }

  bot_offline(data: Milky.Event.BotOffline) {
    return data
  }
  message_recall(data: Milky.Event.MessageRecall) {
    return data
  }

  FriendRequest(data: Milky.Struct.FriendRequest) {
    return data as unknown as Philia.Event.UserRequest
  }
  friend_request(data: Milky.Event.FriendRequest) {
    return this.FriendRequest(data.data)
  }

  GroupRequest(data: Milky.Struct.GroupRequest) {
    return data as unknown as Philia.Event.GroupRequest
  }
  group_request(data: Milky.Event.GroupRequest) {
    return this.GroupRequest(data.data)
  }

  GroupInvitation(data: Milky.Struct.GroupInvitation) {
    return data as unknown as Philia.Event.GroupRequest
  }
  group_invitation(data: Milky.Event.GroupInvitation) {
    return this.GroupInvitation(data.data)
  }

  friend_nudge(data: Milky.Event.FriendNudge) {
    return data
  }
  friend_file_upload(data: Milky.Event.FriendFileUpload) {
    return data
  }
  group_admin_change(data: Milky.Event.GroupAdminChange) {
    return data
  }
  group_essence_message_change(data: Milky.Event.GroupEssenceMessageChange) {
    return data
  }
  group_member_increase(data: Milky.Event.GroupMemberIncrease) {
    return data
  }
  group_member_decrease(data: Milky.Event.GroupMemberDecrease) {
    return data
  }
  group_name_change(data: Milky.Event.GroupNameChange) {
    return data
  }
  group_message_reaction(data: Milky.Event.GroupMessageReaction) {
    return data
  }
  group_mute(data: Milky.Event.GroupMute) {
    return data
  }
  group_whole_mute(data: Milky.Event.GroupWholeMute) {
    return data
  }
  group_nudge(data: Milky.Event.GroupNudge) {
    return data
  }
  group_file_upload(data: Milky.Event.GroupFileUpload) {
    return data
  }
}
