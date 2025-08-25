import type { Client } from "#connect/common";
import type * as Philia from "#project/project/philia.js";
import type { Event } from "#protocol/type";
type HandleMap = Omit<Event.Handle, "type" | "scene"> & {
  client: Client;
};
export default class EventHandle {
  philia: Philia.Project;
  handles: Map<string, HandleMap[]>;
  constructor(philia: Philia.Project);
  receive(event: Event.Handle | Event.Handle[], client: Client): void;
  unreceive(event: Event.Handle | Event.Handle[], client: Client): void;
  handle(event: Event.Event): void;
}
export {};
