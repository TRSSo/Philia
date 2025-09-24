import type { Event } from "#protocol/type";
import type { Client } from "../app.js";
import type { Friend, Gender, Group, GroupRole, Member } from "../contact/index.js";
import type { MessageRet } from "../event/types.js";
import { PhiliaToOICQ } from "./converter.js";
import type { Forwardable, MessageElem, Quotable, Sendable } from "./elements.js";
/** 一条消息 */
export declare abstract class Message implements Quotable, Forwardable {
  protected readonly c: Client;
  protected event: Event.Message;
  protected readonly parsed: PhiliaToOICQ;
  /**
   * 私聊永远指向对方，群聊指向消息发送者。
   * 对于私聊消息，请使用`from_id`和`to_id`来确定发送者和接收者。
   */
  get user_id(): string;
  /** 发送方昵称 */
  get nickname(): string;
  post_type: "message";
  /** 消息时间 */
  time: number;
  /** 消息元素数组 */
  message: MessageElem[];
  /** 字符串形式的消息 */
  raw_message: string;
  font: string;
  /** @cqhttp 方法用 */
  message_id: string;
  /** 消息编号，在群消息中是唯一的 (私聊消息建议至少使用time,seq,rand中的两个判断唯一性) */
  seq: number | string;
  /** 消息随机数 */
  rand: number;
  /** 发送方信息 */
  sender: {
    /** 账号 */
    user_id: string;
    /** 昵称 */
    nickname: string;
    /** 群号，当消息来自群聊时有效 */
    group_id?: string;
    /** @todo 未知属性 */
    sub_id: number;
    /** 名片 */
    card: string;
    /** 性别，@deprecated */
    sex: Gender;
    /** 年龄，@deprecated */
    age: string;
    /** 地区，@deprecated */
    area: string;
    /** 等级 */
    level: number;
    /** 权限 */
    role: GroupRole;
    /** 头衔 */
    title: string;
    /** 平台额外字段 */
    [k: string]: any;
  };
  /** 引用回复 */
  source?: Quotable;
  /**
   * 快速回复
   * @param content 消息内容
   * @param quote 引用这条消息(默认false)
   */
  abstract reply(content: Sendable, quote?: boolean): Promise<MessageRet>;
  /** 反序列化一条消息 */
  static deserialize(c: Client, event: Event.Message): Promise<GroupMessage> | Promise<PrivateMessage>;
  constructor(c: Client, event: Event.Message);
  parse(): Promise<this>;
  /** 将消息序列化保存 */
  serialize(): string;
  /** 以适合人类阅读的形式输出 */
  toString(): string;
  toJSON(keys: string[]): Record<string, any>;
  /** @deprecated 转换为CQ码 */
  toCqcode(): string;
}
/** 一条私聊消息 */
export declare class PrivateMessage extends Message {
  message_type: "private";
  /**
   * @type {"friend"} 好友
   * @type {"group"} 群临时会话
   * @type {"other"} 其他途径的临时会话
   * @type {"self"} 我的设备
   */
  sub_type: "friend" | "group" | "other" | "self";
  /** 发送方账号 */
  from_id: string;
  /** 接收方账号 */
  to_id: string;
  /** 好友对象 */
  friend: Friend;
  /** 反序列化一条私聊消息 */
  static deserialize(c: Client, event: Event.UserMessage): Promise<PrivateMessage>;
  constructor(c: Client, event: Event.UserMessage);
  reply(content: Sendable, quote?: boolean): Promise<MessageRet>;
}
/** 一条群消息 */
export declare class GroupMessage extends Message {
  message_type: "group";
  /** 普通消息 */
  sub_type: "normal";
  /** 群号 */
  group_id: string;
  /** 群名 */
  group_name: string;
  /** 是否AT我 */
  atme: boolean;
  /** 是否AT全体成员 */
  atall: boolean;
  /** 群对象 */
  group: Group;
  /** 发送者群员对象 */
  member: Member;
  /** 反序列化一条群消息 */
  static deserialize(c: Client, event: Event.GroupMessage): Promise<GroupMessage>;
  constructor(c: Client, event: Event.GroupMessage);
  /** 快速撤回 */
  recall(): Promise<boolean>;
  reply(content: Sendable, quote?: boolean): Promise<MessageRet>;
}
