import Client from "./client.js"
import { Event as OBv11Event, API as OBv11API } from "../type/index.js"
import { Event as EventConvert } from "../convert/index.js"

export default class Protocol {
  client: Client
  convert: EventConvert.OBv11toPhilia
  constructor(client: Client) {
    this.client = client
    this.convert = new EventConvert.OBv11toPhilia(this.client)
  }

  handle(data: object) {
    if ("echo" in data) this.echo(data as OBv11API.Response<string>)
    else if ("post_type" in data) this.post(data as OBv11Event.Event)
    else this.client.logger.warn("未知消息", data)
  }

  echo(data: OBv11API.Response<string>) {
    const cache = this.client.cache[data.echo]
    if (!cache) return
    if ([0, 1].includes(data.retcode)) cache.resolve(data.data)
    else cache.reject(Object.assign(cache.error, cache.request, { error: data }))
    clearTimeout(cache.timeout)
    delete this.client.cache[data.echo]
  }

  async post(data: OBv11Event.Event) {
    this.client.event_handle.handle(await this.convert.convert(data))
  }
}
