import Client from "../client.js"
import * as Milky from "../type/index.js"
import * as Philia from "#protocol/type"
import { makeError } from "#util"
import * as Message from "./message.js"
import * as Common from "./common.js"
import { ulid } from "ulid"

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
      time: data.time,
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

  async bot_offline(data: Milky.Event.BotOffline) {
    const event: Philia.Event.BotOffline = {
      id: ulid(),
      type: "notice",
      scene: "bot_offline",
      time: data.time,
      user: await this.client.handle.getSelfInfo(),
      reason: data.data.reason,
    }
    return event
  }

  async message_recall(data: Milky.Event.MessageRecall) {
    let event: Philia.Event.UserMessageRecall | Philia.Event.GroupMessageRecall
    const temp = {
      id: ulid(),
      type: "notice" as const,
      time: data.time,
      message_id: Common.encodeMessageID(
        data.data.message_scene,
        data.data.peer_id,
        data.data.message_seq,
      ),
    }

    switch (data.data.message_scene) {
      case "temp":
      case "friend":
        event = {
          ...temp,
          scene: "user_message_recall",
          user: await this.client.handle.getUserInfo({ id: String(data.data.peer_id) }),
        }
        if (data.data.peer_id === data.data.sender_id) event.is_self = true
        break
      case "group":
        event = {
          ...temp,
          scene: "group_message_recall",
          user: await this.client.handle.getGroupMemberInfo({
            id: String(data.data.peer_id),
            uid: String(data.data.operator_id),
          }),
          group: await this.client.handle.getGroupInfo({ id: String(data.data.peer_id) }),
        }
        if (data.data.operator_id !== data.data.sender_id)
          event.target = await this.client.handle.getGroupMemberInfo({
            id: String(data.data.peer_id),
            uid: String(data.data.sender_id),
          })
        break
    }
    return event
  }

  async FriendRequest(data: Milky.Struct.FriendRequest) {
    const event: Philia.Event.UserRequest = {
      id: data.request_id,
      type: "request",
      time: data.time,
      scene: "user",
      user: await this.client.handle.getUserInfo({ id: String(data.initiator_id) }),
      state: data.state,
      reason: data.comment,
    }
    return event
  }
  friend_request(data: Milky.Event.FriendRequest) {
    return this.FriendRequest(data.data)
  }

  async GroupRequest(data: Milky.Struct.GroupRequest) {
    const event: Philia.Event.GroupRequest = {
      id: data.request_id,
      type: "request",
      time: data.time,
      scene: "group_add",
      user: await this.client.handle.getUserInfo({ id: String(data.initiator_id) }),
      group: await this.client.handle.getGroupInfo({ id: String(data.group_id) }),
      state: data.state,
    }
    switch (data.request_type) {
      case "invite":
        event.user = await this.client.handle.getGroupMemberInfo({
          id: String(data.group_id),
          uid: String(data.initiator_id),
        })
        event.target = await this.client.handle.getUserInfo({ id: String(data.invitee_id) })
        break
      case "join":
        event.reason = data.comment
        break
    }
    return event
  }
  group_request(data: Milky.Event.GroupRequest) {
    return this.GroupRequest(data.data)
  }

  async GroupInvitation(data: Milky.Struct.GroupInvitation) {
    const event: Philia.Event.GroupRequest = {
      id: data.request_id,
      type: "request",
      time: data.time,
      scene: "group_invite",
      user: await this.client.handle.getUserInfo({ id: String(data.initiator_id) }),
      group: await this.client.handle.getGroupInfo({ id: String(data.group_id) }),
      state: data.state,
    }
    return event
  }
  group_invitation(data: Milky.Event.GroupInvitation) {
    return this.GroupInvitation(data.data)
  }

  async friend_nudge(data: Milky.Event.FriendNudge) {
    const event: Philia.Event.UserPoke = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "user_poke",
      user: await this.client.handle.getUserInfo({ id: String(data.data.user_id) }),
    }
    if (data.data.is_self_send) event.is_self = true
    if (data.data.is_self_receive) event.is_self_target = true
    return event
  }

  async friend_file_upload(data: Milky.Event.FriendFileUpload) {
    const event: Philia.Event.UserFileUpload = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "user_file_upload",
      user: await this.client.handle.getUserInfo({ id: String(data.data.user_id) }),
      file: {
        type: "file",
        name: data.data.file_name,
        size: data.data.file_size,
        data: "id",
        id: Common.encodeFileID(Common.FileScene.Private, data.data.file_id, data.data.user_id),
      },
    }
    if (data.data.is_self) event.is_self = true
    return event
  }

  async group_admin_change(data: Milky.Event.GroupAdminChange) {
    const event: Philia.Event.GroupMemberInfo = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_member_info",
      user: (
        await this.client.handle.getGroupMemberArray({
          id: String(data.data.group_id),
        })
      ).find(i => i.role === "owner")!,
      target: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.user_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
      change: { role: data.data.is_set ? "admin" : "member" },
    }
    return event
  }

  async group_essence_message_change(data: Milky.Event.GroupEssenceMessageChange) {
    const message = await this.client.handle.getMsg({
      id: Common.encodeMessageID("group", data.data.group_id, data.data.message_seq),
    })
    const event: Philia.Event.GroupEssenceMessage = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: `group_essence_message_${data.data.is_set ? "add" : "del"}`,
      user: message.user as Philia.Contact.GroupMember,
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
      message_id: message.id,
    }
    return event
  }

  async group_member_increase(data: Milky.Event.GroupMemberIncrease) {
    const event: Philia.Event.GroupMember = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_member_add",
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.user_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
    }
    if (data.data.operator_id)
      event.operator = await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.operator_id),
      })
    if (data.data.invitor_id)
      event.invitor = await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.invitor_id),
      })
    return event
  }

  async group_member_decrease(data: Milky.Event.GroupMemberDecrease) {
    const event: Philia.Event.GroupMember = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_member_del",
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.user_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
    }
    if (data.data.operator_id)
      event.operator = await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.operator_id),
      })
    return event
  }

  async group_name_change(data: Milky.Event.GroupNameChange) {
    const event: Philia.Event.GroupInfo = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_info",
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.operator_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
      change: { name: data.data.name },
    }
    return event
  }

  async group_message_reaction(data: Milky.Event.GroupMessageReaction) {
    const event: Philia.Event.GroupMessageReaction = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: `group_message_reaction_${data.data.is_add === false ? "del" : "add"}`,
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.user_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
      message_id: Common.encodeMessageID("group", data.data.group_id, data.data.message_seq),
      data: { type: "face", id: data.data.face_id },
    }
    return event
  }

  async group_mute(data: Milky.Event.GroupMute) {
    const event: Philia.Event.GroupMemberInfo = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_member_info",
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.operator_id),
      }),
      target: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.user_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
      change: { mute_time: data.data.duration },
    }
    return event
  }

  async group_whole_mute(data: Milky.Event.GroupWholeMute) {
    const event: Philia.Event.GroupInfo = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_info",
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.operator_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
      change: { whole_mute: data.data.is_mute },
    }
    return event
  }

  async group_nudge(data: Milky.Event.GroupNudge) {
    const event: Philia.Event.GroupPoke = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_poke",
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.sender_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
    }
    if (data.data.sender_id !== data.data.receiver_id)
      event.target = await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.receiver_id),
      })
    return event
  }

  async group_file_upload(data: Milky.Event.GroupFileUpload) {
    const event: Philia.Event.GroupFileUpload = {
      id: ulid(),
      type: "notice",
      time: data.time,
      scene: "group_file_upload",
      user: await this.client.handle.getGroupMemberInfo({
        id: String(data.data.group_id),
        uid: String(data.data.user_id),
      }),
      group: await this.client.handle.getGroupInfo({ id: String(data.data.group_id) }),
      file: {
        type: "file",
        name: data.data.file_name,
        size: data.data.file_size,
        data: "id",
        id: Common.encodeFileID(Common.FileScene.Group, data.data.file_id, data.data.group_id),
      },
    }
    return event
  }
}
