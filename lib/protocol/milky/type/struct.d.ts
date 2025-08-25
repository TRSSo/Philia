import type * as Message from "./message.js";
/** 用户 */
export interface User {
  /** 用户QQ号 */
  user_id: number;
  /** 用户昵称 */
  nickname: string;
  /** 用户性别 */
  sex: "male" | "female" | "unknown";
}
/** 好友 */
export interface Friend extends User {
  /** 好友QID */
  qid?: string;
  /** 好友备注 */
  remark: string;
  /** 好友分组 */
  category?: FriendCategory;
}
/** 好友分组 */
export interface FriendCategory {
  /** 好友分组ID */
  category_id: number;
  /** 好友分组名称 */
  category_name: string;
}
/** 群聊 */
export interface Group {
  /** 群号 */
  group_id: number;
  /** 群名称 */
  name: string;
  /** 群成员数量 */
  member_count: number;
  /** 群容量 */
  max_member_count: number;
}
/** 群成员 */
export interface GroupMember extends User {
  /** 群号 */
  group_id: number;
  /** 成员备注 */
  card: string;
  /** 专属头衔 */
  title?: string;
  /** 群等级，注意和QQ等级区分 */
  level: number;
  /** 权限等级 */
  role: "owner" | "admin" | "member";
  /** 入群时的Unix时间戳（秒） */
  join_time: number;
  /** 最后发言时的Unix时间戳（秒） */
  last_sent_time: number;
  /** 禁言结束时的Unix时间戳（秒） */
  shut_up_end_time: number;
}
/** 群公告 */
export interface GroupAnnouncement {
  /** 群号 */
  group_id: number;
  /** 公告ID */
  announcement_id: string;
  /** 发送者QQ号 */
  user_id: number;
  /** Unix时间戳（秒） */
  time: number;
  /** 公告内容 */
  content: string;
  /** 公告图片URL */
  image_url?: string;
}
/** 群文件 */
export interface GroupFile {
  /** 群号 */
  group_id: number;
  /** 文件ID */
  file_id: string;
  /** 文件名称 */
  file_name: string;
  /** 父文件夹ID*/
  parent_folder_id: string;
  /** 文件大小（字节） */
  file_size: number;
  /** 上传时的Unix时间戳（秒） */
  uploaded_time: number;
  /** 过期时的Unix时间戳（秒） */
  expire_time?: number;
  /** 上传者QQ号 */
  uploader_id: number;
  /** 下载次数 */
  downloaded_times: number;
}
/** 群文件夹 */
export interface GroupFolder {
  /** 群号 */
  group_id: number;
  /** 文件夹ID */
  folder_id: string;
  /** 父文件夹ID */
  parent_folder_id: string;
  /** 文件夹名称 */
  folder_name: string;
  /** 创建时的Unix时间戳（秒） */
  created_time: number;
  /** 最后修改时的Unix时间戳（秒） */
  last_modified_time: number;
  /** 创建者QQ号 */
  creator_id: number;
  /** 文件数量 */
  file_count: number;
}
/** 好友请求 */
export interface FriendRequest {
  /** 请求ID，用于同意/拒绝请求 */
  request_id: string;
  /** 请求发起时的Unix时间戳（秒） */
  time: number;
  /** 请求是否被过滤（发起自风险账户） */
  is_filtered: boolean;
  /** 发起请求的用户QQ号 */
  initiator_id: number;
  /** 请求状态 */
  state: "pending" | "accepted" | "rejected" | "ignored";
  /** 好友请求附加信息 */
  comment?: string;
  /** 好友请求来源 */
  via?: string;
}
/** 入群请求基类 */
export interface AGroupRequest {
  /** 请求ID，用于同意/拒绝请求 */
  request_id: string;
  /** 请求发起时的Unix时间戳（秒） */
  time: number;
  /** 请求是否被过滤（发起自风险账户） */
  is_filtered: boolean;
  /** 发起请求的用户QQ号 */
  initiator_id: number;
  /** 请求状态 */
  state: "pending" | "accepted" | "rejected" | "ignored";
  /** 群号 */
  group_id: number;
  /** 处理请求的用户QQ号 */
  operator_id?: number;
  /** 请求类型标识符 */
  request_type: string;
}
/** 自主申请入群请求 */
export interface JoinGroupRequest extends AGroupRequest {
  request_type: "join";
  /** 入群请求附加信息 */
  comment?: string;
}
/** 他人邀请入群请求 */
export interface InviteGroupRequest extends AGroupRequest {
  request_type: "invite";
  /** 被邀请者QQ号 */
  invitee_id: number;
}
/** 入群请求 */
export type GroupRequest = JoinGroupRequest | InviteGroupRequest;
/** 他人邀请 Bot 入群请求 */
export interface GroupInvitation {
  /** 请求ID，用于同意/拒绝请求 */
  request_id: string;
  /** 请求发起时的Unix时间戳（秒） */
  time: number;
  /** 请求是否被过滤（发起自风险账户） */
  is_filtered: boolean;
  /** 发起请求的用户QQ号 */
  initiator_id: number;
  /** 请求状态 */
  state: "pending" | "accepted" | "rejected" | "ignored";
  /** 群号 */
  group_id: number;
}
/** 接收消息基类 */
export interface AIncomingMessage {
  /** 好友QQ号或群号 */
  peer_id: number;
  /** 消息序列号 */
  message_seq: number;
  /** 发送者QQ号 */
  sender_id: number;
  /** 消息时的Unix时间戳（秒） */
  time: number;
  /** 消息段列表 */
  segments: Message.IncomingSegment[];
  /** 消息场景标识符 */
  message_scene: string;
}
/** 好友消息 */
export interface FriendIncomingMessage extends AIncomingMessage {
  message_scene: "friend";
  /** 好友信息 */
  friend: Friend;
}
/** 群消息 */
export interface GroupIncomingMessage extends AIncomingMessage {
  message_scene: "group";
  /** 群信息 */
  group: Group;
  /** 群成员信息 */
  group_member: GroupMember;
}
/** 临时会话消息 */
export interface TempIncomingMessage extends AIncomingMessage {
  message_scene: "temp";
  /** 临时会话发送者的所在群信息 */
  group?: Group;
}
/** 接收消息 */
export type IncomingMessage = FriendIncomingMessage | GroupIncomingMessage | TempIncomingMessage;
/** 接收转发消息 */
export interface IncomingForwardedMessage {
  /** 发送者名称 */
  name: string;
  /** 发送者头像 URL */
  avatar_url: string;
  /** 消息 Unix 时间戳（秒） */
  time: number;
  /** 消息段列表 */
  segments: Message.IncomingSegment[];
}
/** 发送的转发消息 */
export interface OutgoingForwardedMessage {
  /** 发送者QQ号 */
  user_id: number;
  /** 发送者名称（昵称或备注） */
  name: string;
  /** 消息段列表 */
  segments: Message.OutgoingSegment[];
}
