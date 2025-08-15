import type { API as PhiliaAPI } from "#protocol/type"
import type * as Message from "./message.js"
import type * as Struct from "./struct.js"

/** 系统 API */
export interface SystemAPI {
  /** 获取登录信息 */
  get_login_info: {
    request: void
    response: {
      /** 登录 QQ 号 */
      uin: number
      /** 登录昵称 */
      nickname: string
    }
  }

  /** 获取协议端信息 */
  get_impl_info: {
    request: void
    response: {
      /** 协议端名称 */
      impl_name: string
      /** 协议端版本 */
      impl_version: string
      /** 协议端使用的 QQ 协议版本 */
      qq_protocol_version: string
      /** 协议端使用的 QQ 协议平台 */
      qq_protocol_type:
        | "windows"
        | "linux"
        | "macos"
        | "android_pad"
        | "android_phone"
        | "ipad"
        | "iphone"
        | "harmony"
        | "watch"
      /** 协议端实现的 Milky 协议版本，目前为 1.0 */
      milky_version: string
    }
  }

  /** 获取用户个人信息 */
  get_user_profile: {
    request: {
      /** 用户 QQ 号 */
      user_id: number
    }
    response: {
      /** 昵称 */
      nickname: string
      /** QID */
      qid?: string
      /** 年龄 */
      age: number
      /** 性别 */
      sex: "male" | "female" | "unknown"
      /** 备注 */
      remark?: string
      /** 个性签名 */
      bio?: string
      /** QQ 等级 */
      level?: number
      /** 国家或地区 */
      country?: string
      /** 城市 */
      city?: string
      /** 学校 */
      school?: string
    }
  }

  /** 获取好友列表 */
  get_friend_list: {
    request: void | {
      /** 是否强制不使用缓存 */
      no_cache?: boolean
    }
    response: {
      /** 好友列表 */
      friends: Struct.Friend[]
    }
  }

  /** 获取好友信息 */
  get_friend_info: {
    request: {
      /** 好友 QQ 号 */
      user_id: number
      /** 是否强制不使用缓存 */
      no_cache?: boolean
    }
    response: {
      /** 好友信息 */
      friend: Struct.Friend
    }
  }

  /** 获取群列表 */
  get_group_list: {
    request: void | {
      /** 是否强制不使用缓存 */
      no_cache?: boolean
    }
    response: {
      /** 群列表 */
      groups: Struct.Group[]
    }
  }

  /** 获取群信息 */
  get_group_info: {
    request: {
      /** 群号 */
      group_id: number
      /** 是否强制不使用缓存 */
      no_cache?: boolean
    }
    response: {
      /** 群信息 */
      group: Struct.Group
    }
  }

  /** 获取群成员列表 */
  get_group_member_list: {
    request: {
      /** 群号 */
      group_id: number
      /** 是否强制不使用缓存 */
      no_cache?: boolean
    }
    response: {
      /** 群成员列表 */
      members: Struct.GroupMember[]
    }
  }

  /** 获取群成员信息 */
  get_group_member_info: {
    request: {
      /** 群号 */
      group_id: number
      /** 群成员 QQ 号 */
      user_id: number
      /** 是否强制不使用缓存 */
      no_cache?: boolean
    }
    response: {
      /** 群成员信息 */
      member: Struct.GroupMember
    }
  }
}

/** 消息 API */
export interface MessageAPI {
  /** 发送私聊消息 */
  send_private_message: {
    request: {
      /** 好友 QQ 号 */
      user_id: number
      /** 消息内容 */
      message: Message.OutgoingSegment[]
    }
    response: {
      /** 消息序列号 */
      message_seq: number
      /** 消息发送时间 */
      time: number
    }
  }

  /** 发送群消息 */
  send_group_message: {
    request: {
      /** 群号 */
      group_id: number
      /** 消息内容 */
      message: Message.OutgoingSegment[]
    }
    response: {
      /** 消息序列号 */
      message_seq: number
      /** 消息发送时间 */
      time: number
    }
  }

  /** 获取消息 */
  get_message: {
    request: {
      /** 消息场景 */
      message_scene: "friend" | "group" | "temp"
      /** 好友 QQ 号或群号 */
      peer_id: number
      /** 消息序列号 */
      message_seq: number
    }
    response: {
      /** 消息内容 */
      message: Struct.IncomingMessage
    }
  }

  /** 获取历史消息 */
  get_history_messages: {
    request: {
      /** 消息场景 */
      message_scene: "friend" | "group" | "temp"
      /** 好友 QQ 号或群号 */
      peer_id: number
      /** 起始消息序列号，不提供则从最新消息开始 */
      start_message_seq?: number
      /** 消息获取方向 */
      direction: "newer" | "older"
      /** 获取的最大消息数量（默认值：20） */
      limit?: number
    }
    response: {
      /** 获取到的消息，部分消息可能不存在，如撤回的消息 */
      messages: Struct.IncomingMessage[]
    }
  }

  /** 获取临时资源链接 */
  get_resource_temp_url: {
    request: {
      /** 资源 ID */
      resource_id: string
    }
    response: {
      /** 临时资源链接 */
      url: string
    }
  }

  /** 获取合并转发消息内容 */
  get_forwarded_messages: {
    request: {
      /** 转发消息 ID */
      forward_id: string
    }
    response: {
      /** 转发消息内容 */
      messages: Struct.IncomingForwardedMessage[]
    }
  }

  /** 撤回私聊消息 */
  recall_private_message: {
    request: {
      /** 好友 QQ 号 */
      user_id: number
      /** 消息序列号 */
      message_seq: number
    }
    response: void
  }

  /** 撤回群消息 */
  recall_group_message: {
    request: {
      /** 群号 */
      group_id: number
      /** 消息序列号 */
      message_seq: number
    }
    response: void
  }
}

/** 好友 API */
export interface FriendAPI {
  /** 发送好友戳一戳 */
  send_friend_nudge: {
    request: {
      /** 好友 QQ 号 */
      user_id: number
      /** 是否戳自己（默认值：false） */
      is_self?: boolean
    }
    response: void
  }

  /** 发送名片点赞 */
  send_profile_like: {
    request: {
      /** 好友 QQ 号 */
      user_id: number
      /** 点赞数量 */
      count: number
    }
    response: void
  }
}

/** 群聊 API */
export interface GroupAPI {
  /** 设置群名称 */
  set_group_name: {
    request: {
      /** 群号 */
      group_id: number
      /** 新群名称 */
      name: string
    }
    response: void
  }

  /** 设置群头像 */
  set_group_avatar: {
    request: {
      /** 群号 */
      group_id: number
      /** 图像文件 URI，支持 file:// http(s):// base64:// 三种格式 */
      image_uri: string
    }
    response: void
  }

  /** 设置群名片 */
  set_group_member_card: {
    request: {
      /** 群号 */
      group_id: number
      /** 被设置的群成员 QQ 号 */
      user_id: number
      /** 新群名片 */
      card: string
    }
    response: void
  }

  /** 设置群成员专属头衔 */
  set_group_member_special_title: {
    request: {
      /** 群号 */
      group_id: number
      /** 被设置的群成员 QQ 号 */
      user_id: number
      /** 新专属头衔 */
      special_title: string
    }
    response: void
  }

  /** 设置群管理员 */
  set_group_member_admin: {
    request: {
      /** 群号 */
      group_id: number
      /** 被设置的 QQ 号 */
      user_id: number
      /** 是否设置为管理员 */
      is_set?: boolean
    }
    response: void
  }

  /** 设置群成员禁言 */
  set_group_member_mute: {
    request: {
      /** 群号 */
      group_id: number
      /** 被设置的 QQ 号 */
      user_id: number
      /** 禁言持续时间（秒），设为 0 为取消禁言 */
      duration: number
    }
    response: void
  }

  /** 设置群全员禁言 */
  set_group_whole_mute: {
    request: {
      /** 群号 */
      group_id: number
      /** 是否开启全员禁言 */
      is_mute?: boolean
    }
    response: void
  }

  /** 踢出群成员 */
  kick_group_member: {
    request: {
      /** 群号 */
      group_id: number
      /** 被踢的 QQ 号 */
      user_id: number
      /** 是否拒绝加群申请 */
      reject_add_request?: boolean
    }
    response: void
  }

  /** 获取群公告列表 */
  get_group_announcement_list: {
    request: {
      /** 群号 */
      group_id: number
    }
    response: {
      /** 群公告列表 */
      announcements: Struct.GroupAnnouncement[]
    }
  }

  /** 发送群公告 */
  send_group_announcement: {
    request: {
      /** 群号 */
      group_id: number
      /** 公告内容 */
      content: string
      /** 图像文件 URI，支持 file:// http(s):// base64:// 三种格式 */
      image_uri?: string
    }
    response: void
  }

  /** 删除群公告 */
  delete_group_announcement: {
    request: {
      /** 群号 */
      group_id: number
      /** 公告 ID */
      announcement_id: string
    }
    response: void
  }

  /** 退出群 */
  quit_group: {
    request: {
      /** 群号 */
      group_id: number
    }
    response: void
  }

  /** 发送群消息表情回应 */
  send_group_message_reaction: {
    request: {
      /** 群号 */
      group_id: number
      /** 要回应的消息序列号 */
      message_seq: number
      /** 表情 ID */
      reaction: string
      /** 是否添加表情 */
      is_add?: boolean
    }
    response: void
  }

  /** 发送群戳一戳 */
  send_group_nudge: {
    request: {
      /** 群号 */
      group_id: number
      /** 被戳的群成员 QQ 号 */
      user_id: number
    }
    response: void
  }
}

/** 请求 API */
export interface RequestAPI {
  /** 获取好友请求列表 */
  get_friend_requests: {
    request: void | {
      /** 获取的最大请求数量（默认值：20） */
      limit?: number
    }
    response: {
      /** 好友请求列表 */
      requests: Struct.FriendRequest[]
    }
  }

  /** 获取群请求列表 */
  get_group_requests: {
    request: void | {
      /** 获取的最大请求数量（默认值：20） */
      limit?: number
    }
    response: {
      /** 群请求列表 */
      requests: Struct.GroupRequest[]
    }
  }

  /** 获取群邀请列表 */
  get_group_invitations: {
    request: void | {
      /** 获取的最大邀请数量（默认值：20） */
      limit?: number
    }
    response: {
      /** 群邀请列表 */
      invitations: Struct.GroupInvitation[]
    }
  }

  /** 同意好友请求 */
  accept_friend_request: {
    request: {
      /** 请求 ID */
      request_id: string
    }
    response: void
  }

  /** 拒绝好友请求 */
  reject_friend_request: {
    request: {
      /** 请求 ID */
      request_id: string
      /** 拒绝理由 */
      reason?: string
    }
    response: void
  }

  /** 同意群请求 */
  accept_group_request: {
    request: {
      /** 请求 ID */
      request_id: string
    }
    response: void
  }

  /** 拒绝群请求 */
  reject_group_request: {
    request: {
      /** 请求 ID */
      request_id: string
      /** 拒绝理由 */
      reason?: string
    }
    response: void
  }

  /** 同意群邀请 */
  accept_group_invitation: {
    request: {
      /** 请求 ID */
      request_id: string
    }
    response: void
  }

  /** 拒绝群邀请 */
  reject_group_invitation: {
    request: {
      /** 请求 ID */
      request_id: string
    }
    response: void
  }
}

/** 文件 API */
export interface FileAPI {
  /** 上传私聊文件 */
  upload_private_file: {
    request: {
      /** 好友 QQ 号 */
      user_id: number
      /** 文件 URI，支持 file:// http(s):// base64:// 三种格式 */
      file_uri: string
      /** 文件名称 */
      file_name: string
    }
    response: {
      /** 文件 ID */
      file_id: string
    }
  }

  /** 上传群文件 */
  upload_group_file: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件 URI，支持 file:// http(s):// base64:// 三种格式 */
      file_uri: string
      /** 文件名称 */
      file_name: string
      /** 目标文件夹 ID，默认为根目录 */
      parent_folder_id?: string
    }
    response: {
      /** 文件 ID */
      file_id: string
    }
  }

  /** 获取私聊文件下载链接 */
  get_private_file_download_url: {
    request: {
      /** 好友 QQ 号 */
      user_id: number
      /** 文件 ID */
      file_id: string
    }
    response: {
      /** 文件下载链接 */
      download_url: string
    }
  }

  /** 获取群文件下载链接 */
  get_group_file_download_url: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件 ID */
      file_id: string
    }
    response: {
      /** 文件下载链接 */
      download_url: string
    }
  }

  /** 获取群文件列表 */
  get_group_files: {
    request: {
      /** 群号 */
      group_id: number
      /** 父文件夹 ID，默认为根目录 */
      parent_folder_id?: string
    }
    response: {
      /** 文件列表 */
      files: Struct.GroupFile[]
      /** 文件夹列表 */
      folders: Struct.GroupFolder[]
    }
  }

  /** 移动群文件 */
  move_group_file: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件 ID */
      file_id: string
      /** 目标文件夹 ID，默认为根目录 */
      target_folder_id?: string
    }
    response: void
  }

  /** 重命名群文件 */
  rename_group_file: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件 ID */
      file_id: string
      /** 新文件名称 */
      new_name: string
    }
    response: void
  }

  /** 删除群文件 */
  delete_group_file: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件 ID */
      file_id: string
    }
    response: void
  }

  /** 创建群文件夹 */
  create_group_folder: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件夹名称 */
      folder_name: string
    }
    response: {
      /** 文件夹 ID */
      folder_id: string
    }
  }

  /** 重命名群文件夹 */
  rename_group_folder: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件夹 ID */
      folder_id: string
      /** 新文件夹名 */
      new_name: string
    }
    response: void
  }

  /** 删除群文件夹 */
  delete_group_folder: {
    request: {
      /** 群号 */
      group_id: number
      /** 文件夹 ID */
      folder_id: string
    }
    response: void
  }
}

export type IAPI = SystemAPI & MessageAPI & FriendAPI & GroupAPI & RequestAPI & FileAPI

export type Request<T extends keyof IAPI = keyof IAPI> = IAPI[T]["request"]
export interface ResponseOK<T extends keyof IAPI = keyof IAPI> {
  status: "ok"
  retcode: 0
  data: IAPI[T]["response"]
}
export interface ResponseFailed {
  status: "failed"
  retcode: number
  message: string
}

export type Response<T extends keyof IAPI = keyof IAPI> = ResponseOK<T> | ResponseFailed
export type API = PhiliaAPI.IAPI<IAPI>
