import type { Logger } from "#logger";
import * as Philia from "#project/project/philia.js";
import { EventHandle } from "#protocol/common";
import type * as Type from "#protocol/type";
import * as Convert from "./convert/index.js";
export default class Impl {
  logger: Logger;
  handle: Convert.API;
  philia: Philia.Project;
  event_handle: EventHandle;
  path: string;
  self: Type.Contact.Self;
  user: Type.Contact.User;
  group: Type.Contact.Group;
  event_message_map: Map<string, Type.Event.Message>;
  event_request_map: Map<string, Type.Event.Request>;
  constructor(logger: Logger, philia: Philia.IConfig);
  start(): Promise<import("../../connect/socket/server.js").Server | PromiseSettledResult<void>[] | import("../../connect/websocket/server.js").Server | undefined>;
}
