import type * as Philia from "#protocol/type";
import type Client from "../impl/client.js";
import type * as OBv11 from "../type/index.js";
/** 事件转换器 */
export declare class OBv11toPhilia {
  client: Client;
  event_map: Map<string, Philia.Event.Request>;
  constructor(client: Client);
  convert(event: OBv11.Event.Event): Promise<Philia.Event.Event>;
  message(data: OBv11.Event.Message): Promise<Philia.Event.Message>;
  message_sent(data: OBv11.Event.Message): Promise<Philia.Event.Message>;
  notice(data: OBv11.Event.Notice): OBv11.Event.Notice;
  request(data: OBv11.Event.Request): Promise<Philia.Event.Request>;
  meta_event(data: OBv11.Event.Meta): OBv11.Event.Meta;
}
