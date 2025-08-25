import type { Client } from "#connect/common";
import type { Logger } from "#logger";
import type { createAPI } from "#protocol/common";
import type { API, Contact, Event, Message } from "#protocol/type";
import type { Project } from "./app.js";
import type * as type from "./type.js";
/** 基本上下文 */
export interface BaseContext {
  /** API 调用 */
  api: ReturnType<typeof createAPI<API.API>>;
  /** 自己信息 */
  self: Contact.Self;
  /** 客户端 */
  client: Client;
  /** 日志 */
  logger: Logger;
}
/** 全局上下文 */
export interface GlobalContext {
  /** 日志 */
  logger: Logger;
  /** 所有上下文 */
  ctx_map: Map<Client, BaseContext>;
}
/** 事件上下文 */
export declare class Context<T extends Event.Event> {
  /** 事件 */
  event: T;
  /** 插件 */
  plugin: type.Plugin;
  /** 项目 */
  project: Project;
  /** API 调用 */
  api: ReturnType<typeof createAPI<API.API>>;
  /** 自己信息 */
  self: Contact.Self;
  /** 客户端 */
  client: Client;
  /** 日志 */
  logger: Logger;
  constructor(
  /** 事件 */
  event: T, 
  /** 插件 */
  plugin: type.Plugin, 
  /** 项目 */
  project: Project, 
  /** 基本上下文 */
  ctx: BaseContext);
  /** 钩子 */
  get hook(): {
    set: <U extends Event.Event = T>(method: (ctx: Context<U>, cancel: () => void) => (void | boolean) | Promise<void | boolean>, opts?: ContextHookOpts<U>) => void;
    once: <U extends Event.Event = T>(method: (ctx: Context<U>) => (void | boolean) | Promise<void | boolean>, opts?: ContextHookOpts<U>) => void;
    promise: <U extends Event.Event = T>(opts?: ContextHookOpts<U>) => Promise<Context<U>>;
  };
  /** 快速回复 */
  reply(data: Message.Message): Promise<Message.RSendMsg>;
  /** 快速处理，仅请求事件可用 */
  request(result: boolean, reason?: string, block?: boolean): Promise<void>;
}
/** 钩子选项 */
export interface ContextHookOpts<T extends Event.Event = Event.Event> {
  /** 事件类型 */
  type: T["type"];
  /** 事件场景 */
  scene?: T["scene"];
  /** 发起事件用户ID */
  uid?: T["user"]["id"];
  /** 发起事件群ID */
  gid?: T["group"] extends Contact.Group ? T["group"]["id"] : never;
}
/** 钩子 */
export interface ContextHook<D extends Event.Event> {
  /** 添加钩子 */
  set<T extends Event.Event = D>(
  /**
   * 钩子方法
   * @param ctx 上下文
   * @param cancel 取消钩子
   * @returns false 继续执行插件
   */
  method: (ctx: Context<T>, cancel: () => void) => (void | boolean) | Promise<void | boolean>, opts?: ContextHookOpts<T>): void;
  /** 添加一次性钩子 */
  once<T extends Event.Event = D>(
  /**
   * 钩子方法
   * @param ctx 上下文
   * @returns false 继续执行插件
   */
  method: (ctx: Context<T>) => (void | boolean) | Promise<void | boolean>, opts?: ContextHookOpts<T>): void;
  /** Promise 钩子 */
  promise<T extends Event.Event = D>(opts?: ContextHookOpts<T>): Promise<Context<T>>;
}
/** 钩子插件 */
export type ContextHookPlugin<T extends Event.Event = any> = ContextHookOpts<T> & {
  plugin: type.Plugin;
  method(ctx: Context<T>): (void | boolean) | Promise<void | boolean>;
};
