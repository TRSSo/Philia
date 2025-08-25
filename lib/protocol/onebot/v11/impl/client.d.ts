import { WebSocket } from "ws";
import type { Logger } from "#logger";
import * as Philia from "#project/project/philia.js";
import { EventHandle } from "#protocol/common";
import * as Convert from "../convert/index.js";
import type { API } from "../type/index.js";
import Protocol from "./protocol.js";
export default class Client {
  logger: Logger;
  philia: Philia.Project;
  ws: WebSocket;
  path?: string;
  api: {
    get_version_info: (data?: void | undefined) => Promise<{
      app_name: string;
      app_version: string;
      app_full_name: string;
      protocol_version: string;
    }>;
    get_login_info: (data?: void | undefined) => Promise<{
      user_id: number;
      nickname: string;
      avatar?: string;
    }>;
    set_qq_profile: (data: {
      nickname: string;
      personal_note?: string;
    }) => Promise<void>;
    set_qq_avatar: (data: {
      file: string;
    }) => Promise<void>;
    get_stranger_info: (data: {
      user_id: number;
      no_cache?: boolean;
    }) => Promise<{
      user_id: number;
      nickname: string;
      avatar?: string;
      remark?: string;
      sex: "male" | "female" | "unknown";
      age: number;
      qid: string;
      level: number;
      login_days: number;
    }>;
    get_group_info: (data: {
      group_id: number;
      no_cache?: boolean;
    }) => Promise<{
      group_id: number;
      group_name: string;
      avatar?: string;
      group_memo: string;
      group_create_time: number;
      group_level: number;
      member_count: number;
      max_member_count: number;
    }>;
    get_group_member_info: (data: {
      group_id: number;
      user_id: number;
      no_cache?: boolean;
    }) => Promise<{
      group_id: number;
      user_id: number;
      nickname: string;
      avatar?: string;
      card: string;
      sex: "male" | "female" | "unknown";
      age: number;
      join_time: number;
      last_sent_time: number;
      level: number;
      role: "owner" | "admin" | "member";
      unfriendly: boolean;
      title: string;
      title_expire_time: number;
      card_changeable: boolean;
      shut_up_timestamp: number;
    }>;
    set_friend_remark: (data: {
      user_id: number;
      remark: string;
    }) => Promise<void>;
    set_group_name: (data: {
      group_id: number;
      group_name: string;
    }) => Promise<void>;
    set_group_portrait: (data: {
      group_id: number;
      file: string;
    }) => Promise<void>;
    set_group_remark: (data: {
      group_id: number;
      remark: string;
    }) => Promise<void>;
    set_group_whole_ban: (data: {
      group_id: number;
      enable?: boolean;
    }) => Promise<void>;
    set_group_card: (data: {
      group_id: number;
      user_id: number;
      card: string;
    }) => Promise<void>;
    set_group_admin: (data: {
      group_id: number;
      user_id: number;
      enable: boolean;
    }) => Promise<void>;
    set_group_special_title: (data: {
      group_id: number;
      user_id: number;
      special_title: string;
    }) => Promise<void>;
    set_group_ban: (data: {
      group_id: number;
      user_id: number;
      duration: number;
    }) => Promise<void>;
    delete_friend: (data: {
      user_id: number;
    }) => Promise<void>;
    set_group_leave: (data: {
      group_id: number;
      is_dismiss?: boolean;
    }) => Promise<void>;
    set_group_kick: (data: {
      group_id: number;
      user_id: number;
      reject_add_request?: boolean;
    }) => Promise<void>;
    send_msg: (data: {
      user_id?: number;
      group_id?: number;
      message: import("../type/message.js").MessageSegment[];
    }) => Promise<{
      message_id: number;
    }>;
    send_group_forward_msg: (data: {
      group_id: number;
      messages: import("../type/message.js").ForwardNode[];
    }) => Promise<{
      message_id: number;
      forward_id: number;
    }>;
    send_private_forward_msg: (data: {
      user_id: number;
      messages: import("../type/message.js").ForwardNode[];
    }) => Promise<{
      message_id: number;
      forward_id: number;
    }>;
    get_msg: (data: {
      message_id: number;
    }) => Promise<import("../type/event.js").Message>;
    delete_msg: (data: {
      message_id: number;
    }) => Promise<void>;
    get_forward_msg: (data: {
      message_id: number;
    }) => Promise<{
      message: import("../type/event.js").Message[];
    }>;
    get_friend_list: (data?: void | undefined) => Promise<{
      user_id: number;
      nickname: string;
      avatar?: string;
      remark?: string;
      sex: "male" | "female" | "unknown";
      age: number;
      qid: string;
      level: number;
      login_days: number;
    }[]>;
    get_group_list: (data?: void | undefined) => Promise<{
      group_id: number;
      group_name: string;
      avatar?: string;
      group_memo: string;
      group_create_time: number;
      group_level: number;
      member_count: number;
      max_member_count: number;
    }[]>;
    get_group_member_list: (data: {
      group_id: number;
    }) => Promise<{
      group_id: number;
      user_id: number;
      nickname: string;
      avatar?: string;
      card: string;
      sex: "male" | "female" | "unknown";
      age: number;
      join_time: number;
      last_sent_time: number;
      level: number;
      role: "owner" | "admin" | "member";
      unfriendly: boolean;
      title: string;
      title_expire_time: number;
      card_changeable: boolean;
      shut_up_timestamp: number;
    }[]>;
    set_friend_add_request: (data: {
      flag: string;
      approve?: boolean;
      remark?: string;
    }) => Promise<void>;
    set_group_add_request: (data: {
      flag: string;
      approve?: boolean;
      reason?: string;
    }) => Promise<void>;
    download_file: (data: {
      file?: string;
      base64?: string;
      thread_count?: number;
      headers?: string | string[];
    }) => Promise<{
      file: string;
    }>;
    clean_cache: (data?: void | undefined) => Promise<void>;
    get_friend_msg_history: (data: {
      user_id: number;
      message_seq?: number;
      count?: number;
    }) => Promise<{
      messages: import("../type/event.js").Message[];
    }>;
    get_group_msg_history: (data: {
      group_id: number;
      message_seq?: number;
      count?: number;
    }) => Promise<{
      messages: import("../type/event.js").Message[];
    }>;
    upload_private_file: (data: {
      user_id: number;
      file: string;
      name: string;
    }) => Promise<void>;
    upload_group_file: (data: {
      group_id: number;
      file: string;
      name: string;
      folder?: string;
    }) => Promise<void>;
  };
  handle: Convert.API.PhiliaToOBv11;
  protocol: Protocol;
  event_handle: EventHandle;
  cache: Map<string, PromiseWithResolvers<void | import("../type/event.js").Message | {
    app_name: string;
    app_version: string;
    app_full_name: string;
    protocol_version: string;
  } | {
    user_id: number;
    nickname: string;
    avatar?: string;
  } | {
    user_id: number;
    nickname: string;
    avatar?: string;
    remark?: string;
    sex: "male" | "female" | "unknown";
    age: number;
    qid: string;
    level: number;
    login_days: number;
  } | {
    group_id: number;
    group_name: string;
    avatar?: string;
    group_memo: string;
    group_create_time: number;
    group_level: number;
    member_count: number;
    max_member_count: number;
  } | {
    group_id: number;
    user_id: number;
    nickname: string;
    avatar?: string;
    card: string;
    sex: "male" | "female" | "unknown";
    age: number;
    join_time: number;
    last_sent_time: number;
    level: number;
    role: "owner" | "admin" | "member";
    unfriendly: boolean;
    title: string;
    title_expire_time: number;
    card_changeable: boolean;
    shut_up_timestamp: number;
  } | {
    message_id: number;
  } | {
    message_id: number;
    forward_id: number;
  } | {
    message_id: number;
    forward_id: number;
  } | {
    message: import("../type/event.js").Message[];
  } | {
    user_id: number;
    nickname: string;
    avatar?: string;
    remark?: string;
    sex: "male" | "female" | "unknown";
    age: number;
    qid: string;
    level: number;
    login_days: number;
  }[] | {
    group_id: number;
    group_name: string;
    avatar?: string;
    group_memo: string;
    group_create_time: number;
    group_level: number;
    member_count: number;
    max_member_count: number;
  }[] | {
    group_id: number;
    user_id: number;
    nickname: string;
    avatar?: string;
    card: string;
    sex: "male" | "female" | "unknown";
    age: number;
    join_time: number;
    last_sent_time: number;
    level: number;
    role: "owner" | "admin" | "member";
    unfriendly: boolean;
    title: string;
    title_expire_time: number;
    card_changeable: boolean;
    shut_up_timestamp: number;
  }[] | {
    file: string;
  } | {
    messages: import("../type/event.js").Message[];
  } | {
    messages: import("../type/event.js").Message[];
  }> & {
    request: API.Request;
    timeout: NodeJS.Timeout;
  }>;
  queue: string[];
  timeout: number;
  get open(): boolean;
  constructor(logger: Logger, philia: Philia.IConfig, ws: string | WebSocket, opts?: ConstructorParameters<typeof WebSocket>[2]);
  listener(): void;
  close(): Promise<void>;
  message(event: WebSocket.MessageEvent): Promise<void>;
  sendQueue(): undefined;
  request<T extends keyof API.IAPI>(action: T, params?: {}): Promise<void | import("../type/event.js").Message | {
    app_name: string;
    app_version: string;
    app_full_name: string;
    protocol_version: string;
  } | {
    user_id: number;
    nickname: string;
    avatar?: string;
  } | {
    user_id: number;
    nickname: string;
    avatar?: string;
    remark?: string;
    sex: "male" | "female" | "unknown";
    age: number;
    qid: string;
    level: number;
    login_days: number;
  } | {
    group_id: number;
    group_name: string;
    avatar?: string;
    group_memo: string;
    group_create_time: number;
    group_level: number;
    member_count: number;
    max_member_count: number;
  } | {
    group_id: number;
    user_id: number;
    nickname: string;
    avatar?: string;
    card: string;
    sex: "male" | "female" | "unknown";
    age: number;
    join_time: number;
    last_sent_time: number;
    level: number;
    role: "owner" | "admin" | "member";
    unfriendly: boolean;
    title: string;
    title_expire_time: number;
    card_changeable: boolean;
    shut_up_timestamp: number;
  } | {
    message_id: number;
  } | {
    message_id: number;
    forward_id: number;
  } | {
    message_id: number;
    forward_id: number;
  } | {
    message: import("../type/event.js").Message[];
  } | {
    user_id: number;
    nickname: string;
    avatar?: string;
    remark?: string;
    sex: "male" | "female" | "unknown";
    age: number;
    qid: string;
    level: number;
    login_days: number;
  }[] | {
    group_id: number;
    group_name: string;
    avatar?: string;
    group_memo: string;
    group_create_time: number;
    group_level: number;
    member_count: number;
    max_member_count: number;
  }[] | {
    group_id: number;
    user_id: number;
    nickname: string;
    avatar?: string;
    card: string;
    sex: "male" | "female" | "unknown";
    age: number;
    join_time: number;
    last_sent_time: number;
    level: number;
    role: "owner" | "admin" | "member";
    unfriendly: boolean;
    title: string;
    title_expire_time: number;
    card_changeable: boolean;
    shut_up_timestamp: number;
  }[] | {
    file: string;
  } | {
    messages: import("../type/event.js").Message[];
  } | {
    messages: import("../type/event.js").Message[];
  }>;
}
