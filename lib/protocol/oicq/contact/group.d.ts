import type * as Philia from "#protocol/type";
import type { GroupAdminEvent, GroupInviteEvent, GroupMessageEvent, GroupMuteEvent, GroupPokeEvent, GroupRecallEvent, GroupRequestEvent, GroupSignEvent, GroupTransferEvent, MemberDecreaseEvent, MemberIncreaseEvent } from "../event/types.js";
import { GroupMessage } from "../message/index.js";
import { Contactable } from "./contactable.js";
import { Gfs, type GfsFileStat } from "./gfs.js";
import type { GroupInfo, MemberInfo } from "./types.js";
type Client = import("../app.js").Client;
/** 群聊消息事件 */
export interface GroupMessageEventMap {
  message(event: GroupMessageEvent): void;
  /** 普通消息 */
  "message.normal"(event: GroupMessageEvent): void;
  /** 匿名消息 */
  "message.anonymous"(event: GroupMessageEvent): void;
}
/** 群聊通知事件 */
export interface GroupNoticeEventMap {
  notice(event: MemberIncreaseEvent | GroupSignEvent | MemberDecreaseEvent | GroupRecallEvent | GroupAdminEvent | GroupMuteEvent | GroupTransferEvent | GroupPokeEvent): void;
  /** 群员新增 */
  "notice.increase"(event: MemberIncreaseEvent): void;
  /** 群员减少 */
  "notice.decrease"(event: MemberDecreaseEvent): void;
  /** 消息撤回 */
  "notice.recall"(event: GroupRecallEvent): void;
  /** 管理员变更 */
  "notice.admin"(event: GroupAdminEvent): void;
  /** 群禁言 */
  "notice.ban"(event: GroupMuteEvent): void;
  /** 群打卡 */
  "notice.sign"(event: GroupSignEvent): void;
  /** 群转让 */
  "notice.transfer"(event: GroupTransferEvent): void;
  /** 戳一戳 */
  "notice.poke"(event: GroupPokeEvent): void;
}
/** 群聊申请事件 */
export interface GroupRequestEventMap {
  request(event: GroupRequestEvent | GroupInviteEvent): void;
  /** 加群申请 */
  "request.add"(event: GroupRequestEvent): void;
  /** 群邀请 */
  "request.invite"(event: GroupInviteEvent): void;
}
/** 所有的群聊事件 */
export interface GroupEventMap extends GroupMessageEventMap, GroupNoticeEventMap, GroupRequestEventMap {
}
/** 群 */
export declare class Group extends Contactable {
  readonly gid: string;
  private _info?;
  static as(this: Client, gid: string, strict?: boolean): Group;
  /** 群资料 */
  get info(): GroupInfo | undefined;
  /** 群名 */
  get name(): string | undefined;
  /** 我是否是群主 */
  get is_owner(): boolean;
  /** 我是否是管理 */
  get is_admin(): boolean;
  /** 是否全员禁言 */
  get all_muted(): boolean | undefined;
  /** 我的禁言剩余时间 */
  get mute_left(): number;
  /** 群文件系统 */
  readonly fs: Gfs;
  protected constructor(c: Client, gid: string, _info?: GroupInfo | undefined);
  /**
   * 获取群员实例
   * @param uid 群员账号
   * @param strict 严格模式，若群员不存在会抛出异常
   */
  pickMember(uid: string, strict?: boolean): import("./member.js").Member;
  /**
   * 获取群头像url
   * @param size 头像大小，默认`0`
   * @param history 历史头像记录，默认`0`，若要获取历史群头像则填写1,2,3...
   * @returns 头像的url地址
   */
  getAvatarUrl(size?: 0 | 40 | 100 | 140, history?: number): string;
  /** 强制刷新群资料 */
  renew(): Promise<GroupInfo>;
  private _fetchMembers;
  /** 获取群员列表 */
  getMemberMap(no_cache?: boolean): Map<string, MemberInfo> | Promise<Map<string, MemberInfo>>;
  /**
   * 添加精华消息
   * @param seq 消息序号
   * @param rand 消息的随机值
   */
  addEssence(seq: number | string, rand?: number): Promise<void>;
  /**
   * 移除精华消息
   * @param seq 消息序号
   * @param rand 消息的随机值
   */
  removeEssence(seq: number | string, rand?: number): Promise<void>;
  /**
   * 发送一个文件
   * @param file `string`表示从该本地文件路径上传，`Buffer`表示直接上传这段内容
   * @param pid 上传的目标目录id，默认根目录
   * @param name 上传的文件名，`file`为`Buffer`时，若留空则自动以md5命名
   */
  sendFile(file: string | Buffer, pid?: string, name?: string): Promise<GfsFileStat | {
    fid: string;
  }>;
  /**
   * 设置当前群成员消息屏蔽状态
   * @param member_id
   * @param isScreen
   */
  setScreenMemberMsg(member_id: string, isScreen?: boolean): Promise<void>;
  /** 全员禁言 */
  muteAll(yes?: boolean): Promise<void>;
  /** 发送简易群公告 */
  announce(content: string): Promise<void>;
  /**
   * 设置发言限频
   * @param {number} times - 每分钟发言次数
   * - 10: 每分钟十条
   * - 5: 每分钟五条
   * - 0: 无限制
   */
  setMessageRateLimit(times: number): Promise<void>;
  /**
   * 设置加群方式
   * @param {string} type - 加群方式的类型。可选值包括：
   * - "AnyOne"：允许任何人加群
   * - "None"：不允许任何人加群
   * - "requireAuth"：需要身份验证
   * - "QAjoin"：需要回答问题并由管理员审核
   * - "Correct"：正确回答问题
   * @param {string} [question] - 在 `type` 为 "QAjoin" 或 "Correct" 时需要传入。问题的内容。
   * @param {string} [answer] - 在 `type` 为 "Correct" 时需要传入。正确回答的问题答案。
   */
  setGroupJoinType(type: string, question?: string, answer?: string): Promise<void>;
  /** 设置群备注 */
  setRemark(remark?: string): Promise<void>;
  /** 获取 @全体成员 的剩余次数 */
  getAtAllRemainder(): Promise<number>;
  /**
   * 标记`seq`之前的消息为已读
   * @param seq 消息序号，默认为`0`，表示标记所有消息
   */
  markRead(seq?: number): Promise<void>;
  /**
   * 获取`seq`之前的`cnt`条聊天记录，默认从最后一条发言往前，`cnt`默认20不能超过20
   * @param seq 消息序号，默认为`0`，表示从最后一条发言往前
   * @param count 聊天记录条数，默认`20`，超过`20`按`20`处理
   * @returns 群聊消息列表，服务器记录不足`cnt`条则返回能获取到的最多消息记录
   */
  getChatHistory(seq?: number, count?: number): Promise<Philia.Event.Message[] | GroupMessage[]>;
  /**
   * 邀请好友入群
   * @param uid 好友账号
   */
  invite(uid: string): Promise<void>;
  /** 打卡 */
  sign(): Promise<void>;
  /** 退群，若为群主则解散该群 */
  quit(): Promise<void>;
  /**
   * 设置管理员，use {@link Member.setAdmin}
   * @param uid 群员账号
   * @param yes 是否设为管理员
   */
  setAdmin(uid: string, yes?: boolean): Promise<void>;
  /**
   * 设置头衔，use {@link Member.setTitle}
   * @param uid 群员账号
   * @param title 头衔名
   * @param duration 持续时间，默认`-1`，表示永久
   */
  setTitle(uid: string, title?: string, duration?: number): Promise<void>;
  /**
   * 设置名片，use {@link Member.setCard}
   * @param uid 群员账号
   * @param card 名片
   */
  setCard(uid: string, card?: string): Promise<void>;
  /**
   * 踢出此群，use {@link Member.kick}
   * @param uid 群员账号
   * @param msg @todo 未知参数
   * @param block 是否屏蔽群员
   */
  kickMember(uid: string, msg?: string, block?: boolean): Promise<void>;
  /**
   * 禁言群员，use {@link Member.mute}
   * @param uid 群员账号
   * @param duration 禁言时长（秒），默认`600`
   */
  muteMember(uid: string, duration?: number): Promise<void>;
  /**
   * 戳一戳
   * @param uid 群员账号
   */
  pokeMember(uid: string): Promise<void>;
  /**
   * 获取群内被禁言人
   * @returns
   */
  getMuteMemberList(): Promise<{
    uin: string;
    unMuteTime: string;
  }[]>;
  /**
   * 添加表情表态，参考（https://bot.q.qq.com/wiki/develop/api-v2/openapi/emoji/model.html#EmojiType）
   * @param seq 消息序号
   * @param eid 表情ID
   * @param etype 表情类型 EmojiType
   */
  setReaction(seq: number | string, eid: string, etype?: number): Promise<void>;
  /**
   * 删除表情表态，参考（https://bot.q.qq.com/wiki/develop/api-v2/openapi/emoji/model.html#EmojiType）
   * @param seq 消息序号
   * @param eid 表情ID
   * @param type 表情类型 EmojiType
   */
  delReaction(seq: number, eid: string, etype?: number): Promise<void>;
}
export {};
