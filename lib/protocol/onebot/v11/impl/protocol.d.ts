import { Event } from "../convert/index.js";
import type * as OBv11 from "../type/index.js";
import type Client from "./client.js";
export default class Protocol {
  client: Client;
  convert: Event.OBv11toPhilia;
  constructor(client: Client);
  handle(data: object): void | Promise<void>;
  echo(data: OBv11.API.Response): void;
  post(data: OBv11.Event.Event): Promise<void>;
}
