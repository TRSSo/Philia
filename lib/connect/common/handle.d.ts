import type Client from "./client.js";
import * as type from "./type.js";
export default class Handle {
  client: Client;
  default_handle: [keyof type.HandleMap, type.HandleMap[keyof type.HandleMap]][];
  map: Map<keyof type.HandleMap, string | number | boolean | object | type.Handle<unknown, unknown> | undefined>;
  reply_cache: {
    [key: string]: type.Reply;
  };
  constructor(handle: type.HandleMap, client: Client);
  /**
   * 设置处理器
   * @param name 名称
   * @param handle 函数
   */
  set(...args: Parameters<typeof this.map.set>): Map<keyof type.HandleMap, string | number | boolean | object | type.Handle<unknown, unknown> | undefined>;
  /**
   * 设置处理器对象
   * @param handle \{ 名称: 函数 }
   */
  setMap(handle: type.HandleMap): void;
  /**
   * 设置单次处理器
   * @param name 名称
   * @param handle 函数
   */
  setOnce(name: Parameters<typeof this.map.set>[0], handle: Parameters<typeof this.map.set>[1]): Map<keyof type.HandleMap, string | number | boolean | object | type.Handle<unknown, unknown> | undefined>;
  /**
   * 删除处理器
   * @param name 名称或名称数组
   */
  del(name: Parameters<typeof this.map.delete>[0] | Parameters<typeof this.map.delete>[0][]): boolean | boolean[];
  /** 清空处理器 */
  clear(): void;
  data(req: type.Status): void | Promise<void>;
  reply(req: type.Request, code: type.Reply["code"], data?: type.Response["data"]): void;
  request(req: type.Request, reply: (code: type.Reply["code"], data?: type.Response["data"]) => void): Promise<void>;
  getCache(req: type.Base<type.EStatus>): type.Cache;
  response(req: type.Response): void;
  async(req: type.Async): void;
  error(req: type.Error): void;
}
