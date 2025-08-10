import { Event } from "../convert/index.js"
import type * as OBv11 from "../type/index.js"
import type Client from "./client.js"

export default class Protocol {
  convert: Event.OBv11toPhilia
  constructor(public client: Client) {
    this.convert = new Event.OBv11toPhilia(this.client)
  }

  handle(data: object) {
    if ("echo" in data) return this.echo(data as OBv11.API.Response<string>)
    if ("post_type" in data) return this.post(data as OBv11.Event.Event)
    this.client.logger.warn("未知消息", data)
  }

  echo(data: OBv11.API.Response<string>) {
    const cache = this.client.cache.get(data.echo)
    if (!cache) return
    if (data.retcode === 0 || data.retcode === 1)
      cache.resolve((data as OBv11.API.ResponseOK<string>).data)
    else cache.reject(data)
  }

  async post(data: OBv11.Event.Event) {
    return this.client.event_handle.handle(await this.convert.convert(data))
  }
}
