import type * as Struct from "./struct.js"

export interface AEvent {
  /** 事件 Unix 时间戳（秒） */
  time: number
  /** 机器人 QQ 号 */
  self_id: number
  /** 类型标识符 */
  event_type: string
  /** 结构体 */
  data: unknown
}

/** 机器人下线事件 */
export interface BotOffline extends AEvent {
  event_type: "bot_offline"
  data: {
    /** 下线原因 */
    reason: string
  }
}

/** 接收消息 */
export interface MessageReceive extends AEvent {
  event_type: "message_receive"
  data: Struct.IncomingMessage
}

/** 撤回消息 */
export interface MessageRecall extends AEvent {
  event_type: "message_recall"
  data: {
    /** 消息场景 */
    message_scene: "friend" | "group" | "temp"
    /** 好友 QQ 号或群号 */
    peer_id: number
    /** 消息序列号 */
    message_seq: number
    /** 被撤回的消息的发送者 QQ 号 */
    sender_id: number
    /** 操作者 QQ 号 */
    operator_id: number
  }
}

/** 好友请求 */
export interface FriendRequest extends AEvent {
  event_type: "friend_request"
  data: Struct.FriendRequest
}

/** 入群请求 */
export interface GroupRequest extends AEvent {
  event_type: "group_request"
  data: Struct.GroupRequest
}

/** 他人邀请 Bot 入群请求 */
export interface GroupInvitation extends AEvent {
  event_type: "group_invitation"
  data: Struct.GroupInvitation
}

/** 好友戳一戳 */
export interface FriendNudge extends AEvent {
  event_type: "friend_nudge"
  data: {
    /** 好友 QQ 号 */
    user_id: number
    /** 是否是自己发送的戳一戳 */
    is_self_send: boolean
    /** 是否是自己接收的戳一戳 */
    is_self_receive: boolean
  }
}

/** 好友文件上传 */
export interface FriendFileUpload extends AEvent {
  event_type: "friend_file_upload"
  data: {
    /** 好友 QQ 号 */
    user_id: number
    /** 文件 ID */
    file_id: string
    /** 文件名称 */
    file_name: string
    /** 文件大小 */
    file_size: number
    /** 是否是自己发送的文件 */
    is_self: boolean
  }
}

/** 群管理员变更 */
export interface GroupAdminChange extends AEvent {
  event_type: "group_admin_change"
  data: {
    /** 群号 */
    group_id: number
    /** 发生变更的用户 QQ 号 */
    user_id: number
    /** 是否被设置为管理员，false 表示被取消管理员 */
    is_set: boolean
  }
}

/** 群精华消息变更 */
export interface GroupEssenceMessageChange extends AEvent {
  event_type: "group_essence_message_change"
  data: {
    /** 群号 */
    group_id: number
    /** 发生变更的消息序列号 */
    message_seq: number
    /** 是否被设置为精华，false 表示被取消精华 */
    is_set: boolean
  }
}

/** 群成员增加 */
export interface GroupMemberIncrease extends AEvent {
  event_type: "group_member_increase"
  data: {
    /** 群号 */
    group_id: number
    /** 发生变更的用户 QQ 号 */
    user_id: number
    /** 管理员 QQ 号，如果是管理员同意入群 */
    operator_id?: number
    /** 邀请者 QQ 号，如果是邀请入群 */
    invitor_id?: number
  }
}

/** 群成员减少 */
export interface GroupMemberDecrease extends AEvent {
  event_type: "group_member_decrease"
  data: {
    /** 群号 */
    group_id: number
    /** 发生变更的用户 QQ 号 */
    user_id: number
    /** 管理员 QQ 号，如果是管理员踢出 */
    operator_id?: number
  }
}

/** 群名称变更 */
export interface GroupNameChange extends AEvent {
  event_type: "group_name_change"
  data: {
    /** 群号 */
    group_id: number
    /** 新的群名称 */
    name: string
    /** 操作者 QQ 号 */
    operator_id: number
  }
}

/** 群消息表情回应 */
export interface GroupMessageReaction extends AEvent {
  event_type: "group_message_reaction"
  data: {
    /** 群号 */
    group_id: number
    /** 发送回应者 QQ 号 */
    user_id: number
    /** 消息序列号 */
    message_seq: number
    /** 表情 ID */
    face_id: string
    /** 是否为添加，false 表示取消回应 */
    is_add?: boolean
  }
}

/** 群成员禁言状态变更 */
export interface GroupMute extends AEvent {
  event_type: "group_mute"
  data: {
    /** 群号 */
    group_id: number
    /** 发生变更的用户 QQ 号 */
    user_id: number
    /** 操作者 QQ 号 */
    operator_id: number
    /** 禁言时长（秒），为 0 表示取消禁言 */
    duration: number
  }
}

/** 群全员禁言状态变更 */
export interface GroupWholeMute extends AEvent {
  event_type: "group_whole_mute"
  data: {
    /** 群号 */
    group_id: number
    /** 操作者 QQ 号 */
    operator_id: number
    /** 是否全员禁言，false 表示取消全员禁言 */
    is_mute: boolean
  }
}

/** 群戳一戳 */
export interface GroupNudge extends AEvent {
  event_type: "group_nudge"
  data: {
    /** 群号 */
    group_id: number
    /** 发送者 QQ 号 */
    sender_id: number
    /** 接收者 QQ 号 */
    receiver_id: number
  }
}

/** 群文件上传 */
export interface GroupFileUpload extends AEvent {
  event_type: "group_file_upload"
  data: {
    /** 群号 */
    group_id: number
    /** 发送者 QQ 号 */
    user_id: number
    /** 文件 ID */
    file_id: string
    /** 文件名称 */
    file_name: string
    /** 文件大小 */
    file_size: number
  }
}

export type Event =
  | BotOffline
  | MessageReceive
  | MessageRecall
  | FriendRequest
  | GroupRequest
  | GroupInvitation
  | FriendNudge
  | FriendFileUpload
  | GroupAdminChange
  | GroupEssenceMessageChange
  | GroupMemberIncrease
  | GroupMemberDecrease
  | GroupNameChange
  | GroupMessageReaction
  | GroupMute
  | GroupWholeMute
  | GroupNudge
  | GroupFileUpload
