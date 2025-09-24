import events from "node:events";
import * as Connect from "#connect";
import { type Logger } from "#logger";
import { createAPI } from "#protocol/common";
import type * as Philia from "#protocol/type";
import { User } from "./contact/friend.js";
import { Group } from "./contact/group.js";
import { Member } from "./contact/member.js";
import { type Domain, type FriendInfo, type Gender, type GroupInfo, type MemberInfo, OnlineStatus, type StrangerInfo } from "./contact/types.js";
import Handle from "./event/handle.js";
import { type Forwardable, type ImageElem, type Quotable, type Sendable } from "./message/index.js";
/** 一个应用端 */
export declare class Client extends events {
  uin: string;
  /**
   * 得到一个群对象, 通常不会重复创建、调用
   * @param gid 群号
   * @param strict 严格模式，若群不存在会抛出异常
   * @returns 一个`Group`对象
   */
  readonly pickGroup: (gid: string, strict?: boolean | undefined) => Group;
  /**
   * 得到一个用户对象, 通常不会重复创建、调用
   * @param uid 用户账号
   * @param strict 严格模式，若用户不是好友会抛出异常
   * @returns 一个`Friend`对象
   */
  readonly pickUser: (uid: string, strict?: boolean | undefined) => User;
  /** {@link Client.pickUser} */
  readonly pickFriend: (uid: string, strict?: boolean | undefined) => User;
  /**
   * 得到一个群员对象, 通常不会重复创建、调用
   * @param gid 群员所在的群号
   * @param uid 群员的账号
   * @param strict 严格模式，若群员不存在会抛出异常
   * @returns 一个`Member`对象
   */
  readonly pickMember: (gid: string, uid: string, strict?: boolean | undefined) => Member;
  /** 日志记录器 */
  logger: Logger;
  /** 配置 */
  readonly config: Required<Omit<Config, "logger">>;
  get [Symbol.toStringTag](): string;
  /** 好友列表 */
  fl: Map<string, FriendInfo>;
  /** 陌生人列表 */
  sl: Map<string, StrangerInfo>;
  /** 群列表 */
  gl: Map<string, GroupInfo>;
  /** 群员列表缓存 */
  gml: Map<string, Map<string, MemberInfo>>;
  /** 黑名单列表 */
  blacklist: Set<string>;
  /** 好友分组 */
  classes: Map<number, string>;
  /** 勿手动修改这些属性 */
  /** 自己信息 */
  self_info: Philia.Contact.Self;
  /** 版本信息 */
  version_info: Philia.API.Base["getVersion"]["response"];
  /** 在线状态 */
  status: OnlineStatus;
  /** 昵称 */
  get nickname(): string;
  /** 性别 */
  get sex(): Gender;
  /** 年龄 */
  get age(): number;
  get apk(): {
    id: string;
    name: string;
    version: string;
  };
  protected readonly statistics: {
    start_time: number;
    lost_times: number;
    recv_pkt_cnt: number;
    sent_pkt_cnt: number;
    lost_pkt_cnt: number;
    recv_msg_cnt: number;
    sent_msg_cnt: number;
    msg_cnt_per_min: number;
    remote_ip: string;
    remote_port: number;
    ver: string;
  };
  handle: Handle;
  api: ReturnType<typeof createAPI<Philia.API.API>>;
  client: Connect.Common.Client;
  /** 是否为在线状态 (可以收发业务包的状态) */
  isOnline(): boolean;
  path?: string;
  /** 下线 */
  logout(): Promise<void>;
  /** OICQ 内部方法 */
  writeUni(...args: unknown[]): Promise<void>;
  sendOidb(...args: unknown[]): Promise<Buffer<ArrayBufferLike>>;
  sendPacket(...args: unknown[]): Promise<Buffer<ArrayBufferLike>>;
  sendUni(...args: unknown[]): Promise<Buffer<ArrayBufferLike>>;
  sendOidbSvcTrpcTcp(...args: unknown[]): Promise<unknown>;
  /** csrf token */
  bkn?: number;
  cookies?: {
    [domain in Domain]: string;
  };
  /** 数据统计 */
  get stat(): {
    start_time: number;
    lost_times: number;
    recv_pkt_cnt: number;
    sent_pkt_cnt: number;
    lost_pkt_cnt: number;
    recv_msg_cnt: number;
    sent_msg_cnt: number;
    msg_cnt_per_min: number;
    remote_ip: string;
    remote_port: number;
    ver: string;
  };
  connected_fn: () => Promise<void>;
  closed_fn: () => void;
  /**
   * 继承原版`oicq`的构造方式，建议使用另一个构造函数
   * @param uin 账号
   * @param conf 配置
   */
  constructor(uin: string, conf?: Config);
  /**
   * 账号在调用 {@link login} 时传入
   * @param conf 配置
   */
  constructor(conf?: Config);
  /**
   * 只能在初始化Client时传了`uin`才能调用
   * @param path Socket 连接地址
   */
  login(path?: string): Promise<void>;
  /**
   * @param uin 登录账号
   * @param path Socket 连接地址
   */
  login(uin?: string, path?: string): Promise<void>;
  connect(path?: string | undefined): void;
  online(): Promise<void>;
  /** 上传文件到缓存目录 */
  uploadFile(file: string | Buffer): Promise<string>;
  /** 设置在线状态 */
  setOnlineStatus(online_status?: OnlineStatus.Online | OnlineStatus.Absent | OnlineStatus.Invisible | OnlineStatus.Busy | OnlineStatus.Qme | OnlineStatus.DontDisturb): Promise<void>;
  /** 设置昵称 */
  setNickname(name: string): Promise<void>;
  /**
   * 设置性别
   * @param gender 0：未知，1：男，2：女
   */
  setGender(gender: 0 | 1 | 2): Promise<void>;
  /**
   * 设置生日
   * @param birthday `YYYYMMDD`格式的`string`（会过滤非数字字符）或`number`
   * */
  setBirthday(birthday: string | number): Promise<void>;
  /** 设置个人说明 */
  setDescription(description?: string): Promise<void>;
  /** 设置个性签名 */
  setSignature(signature?: string): Promise<void>;
  /** 获取用户资料卡信息 */
  getProfile(id: string): Promise<Philia.Contact.User>;
  /** 设置头像 */
  setAvatar(avatar: ImageElem["file"]): Promise<void>;
  /** 获取漫游表情 */
  getRoamingStamp(no_cache?: boolean): Promise<string[]>;
  /** 删除表情(支持批量) */
  deleteStamp(id: string | string[]): Promise<void>;
  /** 获取系统消息 */
  getSystemMsg(): Promise<Philia.Event.Request[]>;
  /** 添加好友分组 */
  addClass(name: string): Promise<void>;
  /** 删除好友分组 */
  deleteClass(name: number): Promise<void>;
  /** 重命名好友分组 */
  renameClass(name: number, new_name: string): Promise<void>;
  /** 重载好友列表 */
  reloadFriendList(): Promise<Map<string, FriendInfo>>;
  /** 重载陌生人列表 */
  reloadStrangerList(): Map<string, StrangerInfo>;
  /** 重载群列表 */
  reloadGroupList(): Promise<Map<string, GroupInfo>>;
  /** 重载群成员列表 */
  reloadGroupMemberList(): Promise<Map<string, Map<string, MemberInfo>>>;
  /** 重载黑名单 */
  reloadBlackList(): Set<string>;
  /** 清空缓存文件 */
  cleanCache(): Promise<void>;
  /**
   * 获取视频下载地址
   * use {@link Friend.getVideoUrl}
   */
  getVideoUrl(fid: string): Promise<string | undefined>;
  /**
   * 获取转发消息
   * use {@link Friend.getForwardMsg}
   */
  getForwardMsg(resid: string): Promise<import("./message/message.js").GroupMessage[]>;
  /**
   * 制作转发消息
   * use {@link Friend.makeForwardMsg} or {@link Group.makeForwardMsg}
   */
  makeForwardMsg(fake: Forwardable[], dm?: boolean): import("./message/elements.js").ForwardNode;
  /** Ocr图片转文字 */
  imageOcr(file: ImageElem["file"]): Promise<unknown>;
  /** @cqhttp (cqhttp遗留方法) use {@link cookies[domain]} */
  getCookies(domain?: Domain): string | undefined;
  /** @cqhttp use {@link bkn} */
  getCsrfToken(): number | undefined;
  /** @cqhttp use {@link fl} */
  getFriendList(): Map<string, FriendInfo>;
  /** @cqhttp use {@link gl} */
  getGroupList(): Map<string, GroupInfo>;
  /**
   * 添加群精华消息
   * use {@link Group.addEssence}
   * @param id 消息id
   */
  setEssenceMessage(id: string): Promise<void>;
  /**
   * 移除群精华消息
   * use {@link Group.removeEssence}
   * @param id 消息id
   */
  removeEssenceMessage(id: string): Promise<void>;
  /** @cqhttp use {@link sl} */
  getStrangerList(): Map<string, StrangerInfo>;
  /** @cqhttp use {@link User.getSimpleInfo} */
  getStrangerInfo(user_id: string): Promise<FriendInfo | undefined>;
  /** @cqhttp use {@link Group.info} or {@link Group.renew} */
  getGroupInfo(group_id: string, no_cache?: boolean): GroupInfo | Promise<GroupInfo>;
  /** @cqhttp use {@link Group.getMemberMap} */
  getGroupMemberList(group_id: string, no_cache?: boolean): Map<string, MemberInfo> | Promise<Map<string, MemberInfo>>;
  /** @cqhttp use {@link Member.info} or {@link Member.renew} */
  getGroupMemberInfo(group_id: string, user_id: string, no_cache?: boolean): MemberInfo | Promise<MemberInfo> | undefined;
  /** @cqhttp use {@link Friend.sendMsg} */
  sendPrivateMsg(user_id: string, message: Sendable, source?: Quotable): Promise<import("./index.js").MessageRet>;
  /** @cqhttp use {@link Group.sendMsg} */
  sendGroupMsg(group_id: string, message: Sendable, source?: Quotable): Promise<import("./index.js").MessageRet>;
  /** @cqhttp use {@link Group.sign} */
  sendGroupSign(group_id: string): Promise<void>;
  /** @cqhttp use {@link Member.sendMsg} */
  sendTempMsg(group_id: string, user_id: string, message: Sendable): Promise<import("./index.js").MessageRet>;
  /** @cqhttp use {@link User.recallMsg} or {@link Group.recallMsg} */
  deleteMsg(id: string): Promise<void>;
  /** @cqhttp use {@link User.remarkRead} or {@link Group.remarkRead} */
  reportReaded(id: string): Promise<void>;
  /** @cqhttp use {@link User.getChatHistory} or {@link Group.getChatHistory} */
  getMsg(id: string): Promise<import("./message/message.js").GroupMessage | import("./message/message.js").PrivateMessage>;
  /** @cqhttp use {@link User.getChatHistory} or {@link Group.getChatHistory} */
  getChatHistory(id: string, count?: number): Promise<Philia.Event.Message[]>;
  /** @cqhttp use {@link Group.muteAll} */
  setGroupWholeBan(group_id: string, enable?: boolean): Promise<void>;
  /**
   * 设置当前群成员消息屏蔽状态
   * @param group_id {number} 群号
   * @param member_id {number} 成员QQ号
   * @param isScreen {boolean} 是否屏蔽 默认true
   */
  setGroupMemberScreenMsg(group_id: string, member_id: string, isScreen?: boolean): Promise<void>;
  /** @cqhttp use {@link Group.setName} */
  setGroupName(group_id: string, name: string): Promise<void>;
  /** @cqhttp use {@link Group.announce} */
  sendGroupNotice(group_id: string, content: string): Promise<void>;
  /** @cqhttp use {@link Group.setAdmin} or {@link Member.setAdmin} */
  setGroupAdmin(group_id: string, user_id: string, enable?: boolean): Promise<void>;
  /** @cqhttp use {@link Group.setTitle} or {@link Member.setTitle} */
  setGroupSpecialTitle(group_id: string, user_id: string, special_title: string, duration?: number): Promise<void>;
  /** @cqhttp use {@link Group.setCard} or {@link Member.setCard} */
  setGroupCard(group_id: string, user_id: string, card: string): Promise<void>;
  /** @cqhttp use {@link Group.kickMember} or {@link Member.kick} */
  setGroupKick(group_id: string, user_id: string, reject_add_request?: boolean, message?: string): Promise<void>;
  /** @cqhttp use {@link Group.muteMember} or {@link Member.mute} */
  setGroupBan(group_id: string, user_id: string, duration?: number): Promise<void>;
  /** @cqhttp use {@link Group.quit} */
  setGroupLeave(group_id: string): Promise<void>;
  /** @cqhttp use {@link Group.pokeMember} or {@link Member.poke} */
  sendGroupPoke(group_id: string, user_id: string): Promise<void>;
  /** @cqhttp use {@link Friend.delete} */
  deleteFriend(user_id: string, block?: boolean): Promise<void>;
  /** @cqhttp use {@link Group.invite} */
  inviteFriend(group_id: string, user_id: string): Promise<void>;
  /** @cqhttp use {@link Friend.thumbUp} */
  sendLike(user_id: string, times?: number): Promise<void>;
  /** @cqhttp use {@link setAvatar} */
  setPortrait(file: Parameters<Client["setAvatar"]>[0]): Promise<void>;
  /** @cqhttp use {@link Group.setAvatar} */
  setGroupPortrait(group_id: string, file: Parameters<Group["setAvatar"]>[0]): Promise<void>;
  /** @cqhttp use {@link Group.fs} */
  acquireGfs(group_id: string): import("./index.js").Gfs;
  /** @cqhttp use {@link User.setFriendReq} or {@link User.addFriendBack} */
  setFriendAddRequest(id: string, result?: boolean, reason?: string, block?: boolean): Promise<void>;
  /** @cqhttp use {@link User.setGroupInvite} or {@link User.setGroupReq} */
  setGroupAddRequest(id: string, result?: boolean, reason?: string, block?: boolean): Promise<void>;
  /** emit an event */
  em(name?: string, data?: any): void;
  /** @deprecated use {@link status} */
  get online_status(): OnlineStatus;
}
/** 配置项 */
export interface Config {
  logger?: Logger;
  /** 过滤自己的消息，默认`true` */
  ignore_self?: boolean;
  /**
   * 触发`system.offline.network`事件后的重新登录间隔秒数，默认5(秒)，不建议设置过低
   * 设置为0则不会自动重连，然后你可以监听此事件自己处理
   */
  reconn_interval?: number;
  /** 是否缓存群员列表(默认true)，群多的时候(500~1000)会多占据约100MB+内存，关闭后进程只需不到20MB内存 */
  cache_group_member?: boolean;
}
/** 数据统计 */
export type Statistics = Client["stat"];
/** 创建一个应用端 (=new Client) */
export declare function createClient(...args: ConstructorParameters<typeof Client>): Client;
