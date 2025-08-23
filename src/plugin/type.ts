import type schedule from "node-schedule"
import type * as Philia from "#protocol/type"
import type { BaseContext, Context, GlobalContext } from "./context.js"

/** 插件 */
export interface Plugin {
  /** 插件名 */
  name: string
  /** 插件描述 */
  desc: string
  /** 优先级 */
  priority: number
  /** 命令组 */
  command?: Command[]
  /** 中间件组 */
  middleware?: Middleware[]
  /** 事件组 */
  event?: Event[]
  /** 定时任务组 */
  schedule?: Schedule[]
  /** 开启插件 */
  start?(ctx: GlobalContext): void | Promise<void>
  /** 关闭插件 */
  stop?(ctx: GlobalContext): void | Promise<void>
  /** 机器人连接 */
  connect?(ctx: BaseContext): void | Promise<void>
  /** 机器人断开 */
  close?(ctx: BaseContext): void | Promise<void>
}

export type ClassMethod<C, T extends Command | Middleware | Event | Schedule> = Omit<
  T,
  "method" | "type" | "scene"
> & {
  method: {
    [K in keyof C]: C[K] extends (
      T["method"] extends (...args: infer Args) => infer R
        ? (...args: Args extends [unknown, ...infer Rest] ? Rest : []) => R
        : never
    )
      ? K
      : never
  }[keyof C]
}

/** 类插件 */
export interface ClassPlugin<T, E extends Philia.Event.Event> {
  /** 插件名 */
  name: string
  /** 插件描述 */
  desc: string
  /** 优先级 */
  priority?: number
  /** 事件类型 */
  type: E["type"]
  /** 事件场景 */
  scene?: E["scene"]
  /** 命令组 */
  command?: E extends Philia.Event.Message
    ? ClassMethod<T, Command<E>> | ClassMethod<T, Command<E>>[]
    : never
  /** 中间件组 */
  middleware?: ClassMethod<T, Middleware> | ClassMethod<T, Middleware>[]
  /** 事件组 */
  event?: ClassMethod<T, Event> | ClassMethod<T, Event>[]
  /** 定时任务组 */
  schedule?: ClassMethod<T, Schedule> | ClassMethod<T, Schedule>[]
  /** 开启插件 */
  start?: { [K in keyof T]: T[K] extends () => void | Promise<void> ? K : never }[keyof T]
  /** 关闭插件 */
  stop?: ClassPlugin<T, E>["start"]
  /** 机器人连接 */
  connect?: ClassPlugin<T, E>["start"]
  /** 机器人断开 */
  close?: ClassPlugin<T, E>["start"]
}

/** 权限等级 */
export enum PermissionLevel {
  /** 所有者 */
  Owner,
  /** 管理员 */
  Admin,
  /** 用户 */
  User,
  /** 禁止 */
  Ban,
}

/** 命令插件基类 */
export interface ACommand<T extends Philia.Event.Message> {
  /** 命令 */
  cmd: string | string[] | RegExp
  /** 命令场景 */
  scene?: T["scene"]
  /** 命令权限 */
  permission?: PermissionLevel
}
/** 单命令插件 */
export interface SingleCommand<T extends Philia.Event.Message = Philia.Event.Message>
  extends ACommand<T> {
  cmd: string
  /**
   * 命令方法
   * @param args 命令参数，将命令去除后的消息
   */
  method(ctx: Context<T>, args: string): void | Promise<void>
}
/** 多命令插件 */
export interface MultiCommand<T extends Philia.Event.Message = Philia.Event.Message>
  extends ACommand<T> {
  cmd: string[]
  /**
   * 命令方法
   * @param cmd 匹配到的命令
   * @param args 命令参数，将命令去除后的消息
   */
  method(ctx: Context<T>, cmd: string, args: string): void | Promise<void>
}
/** 正则命令插件 */
export interface RegExpCommand<T extends Philia.Event.Message = Philia.Event.Message>
  extends ACommand<T> {
  cmd: RegExp
  /**
   * 命令方法
   * @param match 匹配到的正则结果
   */
  method(ctx: Context<T>, match: RegExpMatchArray): void | Promise<void>
}
/** 命令插件 */
export type Command<T extends Philia.Event.Message = Philia.Event.Message> =
  | SingleCommand<T>
  | MultiCommand<T>
  | RegExpCommand<T>

/** 中间件插件 */
export interface Middleware<T extends Philia.Event.Event = Philia.Event.Event> {
  /** 中间件事件类型 */
  type: T["type"]
  /** 中间件事件场景 */
  scene?: T["scene"]
  /**
   * 中间件方法
   * @param next 继续执行，返回 true 表示处理完成，false 最终没有插件处理
   * @returns true 表示处理完成，false 没有处理
   */
  method(ctx: Context<T>, next: () => Promise<boolean>): boolean | Promise<boolean>
}

/** 事件插件 */
export interface Event<T extends Philia.Event.Event = Philia.Event.Event> {
  /** 事件类型 */
  type: T["type"]
  /** 事件场景 */
  scene?: T["scene"]
  method(ctx: Context<T>): void | Promise<void>
}

/** 定时任务插件 */
export interface Schedule {
  spec: schedule.Spec
  method(ctx: GlobalContext): void | Promise<void>
}
