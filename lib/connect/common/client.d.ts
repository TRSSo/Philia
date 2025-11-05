import type { Logger } from "#logger";
import { Encoder } from "./encoder.js";
import Handle from "./handle.js";
import * as type from "./type.js";
export default abstract class Client {
  logger: Logger;
  handle: Handle;
  timeout: {
    send: number;
    wait: number;
    idle: number;
    retry: number;
  };
  meta: type.Meta;
  encoder: Encoder;
  cache: Map<string, type.Cache>;
  queue: type.Cache["data"]["id"][];
  idle: boolean;
  open: boolean;
  path: string;
  connected_fn?(client: this): void;
  closed_fn?(client: this): void;
  constructor(logger: Logger, handle: type.HandleMap, opts?: type.Options);
  /** 连接事件监听器 */
  abstract listener: {
    [key: string]: (...args: any[]) => void;
  };
  /** 连接对象 */
  abstract event: NodeJS.EventEmitter;
  /** 最终发送的二进制数据 */
  abstract write(data: Buffer): void;
  /** 获取元信息 */
  abstract getMetaInfo(): Promise<type.MetaInfo>;
  /** 打开连接 */
  abstract connectOpen(path: string): void;
  /** 关闭连接 */
  abstract close(): Promise<void>;
  /** 强制关闭连接 */
  abstract forceClose(): void;
  /**
   * 连接到服务端
   * @param path 连接地址，为空则从构造函数读取
   * @param reconnect 自动重连毫秒，为0则不重连
   * @returns 开启自动重连返回 void，否则 Promise
   */
  connect(path: string | undefined, reconnect: 0): Promise<this>;
  connect(path?: string, reconnect?: number): void;
  /** 发送数据 */
  send(data: type.Status): void;
  /** 处理开启连接 */
  onconnect(): Promise<void>;
  /** 处理连接成功 */
  onconnected(info?: string): void;
  /** 处理连接时错误 */
  onconnectError(reconnect?: number): Promise<this> | undefined;
  reconnect_allow: boolean;
  reconnect_timeout?: NodeJS.Timeout;
  /** 处理重连 */
  reconnect(delay?: number): void;
  /** 准备关闭连接 */
  prepareClose(): void;
  /** 处理连接关闭 */
  onclose(info?: string): void;
  /** 处理连接错误 */
  onerror(error: Error): void;
  /** 设置请求超时 */
  setTimeout(cache: type.Cache, timeout?: number): void;
  /** 启动发送数据队列 */
  sender(): true | undefined;
  /** 发送请求 */
  request(name: type.Request["name"], data?: type.Request["data"]): Promise<unknown>;
}
