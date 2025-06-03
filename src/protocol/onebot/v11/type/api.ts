import { API as PhiliaAPI } from "#protocol/type"
import * as Message from "./message.js"
import * as Event from "./event.js"

export interface API {
  [key: string]: {
    request: unknown
    response: unknown
  }

  get_login_info: {
    request: void
    response: {
      user_id: number
      nickname: string
      avatar?: string
    }
  }

  set_qq_profile: {
    request: {
      nickname: string
      personal_note?: string
    }
    response: void
  }

  set_qq_avatar: {
    request: {
      file: string
    }
    response: void
  }

  get_stranger_info: {
    request: {
      user_id: number
      no_cache?: boolean
    }
    response: {
      user_id: number
      nickname: string
      avatar?: string
      remark?: string
      sex: "male" | "female" | "unknown"
      age: number
      qid: string
      level: number
      login_days: number
    }
  }

  get_group_info: {
    request: {
      group_id: number
      no_cache?: boolean
    }
    response: {
      group_id: number
      group_name: string
      avatar?: string
      group_memo: string
      group_create_time: number
      group_level: number
      member_count: number
      max_member_count: number
    }
  }

  get_group_member_info: {
    request: {
      group_id: number
      user_id: number
      no_cache?: boolean
    }
    response: {
      group_id: number
      user_id: number
      nickname: string
      avatar?: string
      card: string
      sex: "male" | "female" | "unknown"
      age: number
      join_time: number
      last_sent_time: number
      level: number
      role: "owner" | "admin" | "member"
      unfriendly: boolean
      title: string
      title_expire_time: number
      card_changeable: boolean
      shut_up_timestamp: number
    }
  }

  set_friend_remark: {
    request: {
      user_id: number
      remark: string
    }
    response: void
  }

  set_group_name: {
    request: {
      group_id: number
      group_name: string
    }
    response: void
  }

  set_group_portrait: {
    request: {
      group_id: number
      file: string
    }
    response: void
  }

  set_group_remark: {
    request: {
      group_id: number
      remark: string
    }
    response: void
  }

  set_group_whole_ban: {
    request: {
      group_id: number
      enable?: boolean
    }
    response: void
  }

  set_group_card: {
    request: {
      group_id: number
      user_id: number
      card: string
    }
    response: void
  }

  set_group_admin: {
    request: {
      group_id: number
      user_id: number
      enable: boolean
    }
    response: void
  }

  set_group_special_title: {
    request: {
      group_id: number
      user_id: number
      special_title: string
    }
    response: void
  }

  set_group_ban: {
    request: {
      group_id: number
      user_id: number
      duration: number
    }
    response: void
  }

  delete_friend: {
    request: {
      user_id: number
    }
    response: void
  }

  set_group_leave: {
    request: {
      group_id: number
      is_dismiss?: boolean
    }
    response: void
  }

  set_group_kick: {
    request: {
      group_id: number
      user_id: number
      reject_add_request?: boolean
    }
    response: void
  }

  send_msg: {
    request: {
      user_id?: number
      group_id?: number
      message: Message.MessageSegment[]
    }
    response: {
      message_id: number
    }
  }

  send_group_forward_msg: {
    request: {
      group_id: number
      messages: Message.ForwardNode[]
    }
    response: {
      message_id: number
      forward_id: number
    }
  }

  send_private_forward_msg: {
    request: {
      user_id: number
      messages: Message.ForwardNode[]
    }
    response: {
      message_id: number
      forward_id: number
    }
  }

  get_msg: {
    request: {
      message_id: number
    }
    response: Event.Message
  }

  delete_msg: {
    request: {
      message_id: number
    }
    response: void
  }

  get_forward_msg: {
    request: {
      message_id: number
    }
    response: {
      message: Event.Message[]
    }
  }

  get_friend_list: {
    request: void
    response: API["get_stranger_info"]["response"][]
  }

  get_group_list: {
    request: void
    response: API["get_group_info"]["response"][]
  }

  get_group_member_list: {
    request: {
      group_id: number
    }
    response: API["get_group_member_info"]["response"][]
  }

  set_friend_add_request: {
    request: {
      flag: string
      approve?: boolean
      remark?: string
    }
    response: void
  }

  set_group_add_request: {
    request: {
      flag: string
      approve?: boolean
      reason?: string
    }
    response: void
  }

  download_file: {
    request: {
      file?: string
      base64?: string
      thread_count?: number
      headers?: string | string[]
    }
    response: {
      file: string
    }
  }

  clean_cache: {
    request: void
    response: void
  }

  get_friend_msg_history: {
    request: {
      user_id: number
      message_seq?: number
      count?: number
    }
    response: {
      messages: Event.Message[]
    }
  }

  get_group_msg_history: {
    request: {
      group_id: number
      message_seq?: number
      count?: number
    }
    response: {
      messages: Event.Message[]
    }
  }

  upload_private_file: {
    request: {
      user_id: number
      file: string
      name: string
    }
    response: void
  }

  upload_group_file: {
    request: {
      group_id: number
      file: string
      name: string
      folder?: string
    }
    response: void
  }
}

export interface Request<T extends keyof API> {
  /** 请求的 API 名称 */
  action: T
  /** 请求参数 */
  params: API[T]["request"]
  /** '回声', 如果指定了 echo 字段, 那么响应包也会同时包含一个 echo 字段, 它们会有相同的值 */
  echo: string
}

export interface Response<T extends keyof API> {
  /**
   * 状态, 表示 API 是否调用成功
   * ok 表示操作成功，同时 retcode （返回码）会等于 0
   * async 表示请求已提交异步处理，此时 retcode 为 1，具体成功或失败将无法获知
   * failed 表示操作失败，此时 retcode 既不是 0 也不是 1，具体错误信息应参考 OneBot 实现的日志
   */
  status: "ok" | "async" | "failed"
  retcode: number
  /** 错误消息, 仅在 API 调用失败时有该字段 */
  msg?: string
  /** 对错误的详细解释(中文), 仅在 API 调用失败时有该字段 */
  wording?: string
  /**
   * data 字段为 API 返回数据的内容，对于踢人、禁言等不需要返回数据的操作，这里为 null，
   * 对于获取群成员信息这类操作，这里为所获取的数据的对象，具体的数据内容将会在相应的 API 描述中给出。
   * 注意，异步版本的 API，data 永远是 null，即使其相应的同步接口本身是有数据。
   */
  data: API[T]["response"]
  /** '回声', 如果请求时指定了 echo, 那么响应也会包含 echo */
  echo: string
}

export type IAPI = PhiliaAPI.IAPI<API>
export type ServerAPI = IAPI["Server"]
export type ClientAPI = IAPI["Client"]
