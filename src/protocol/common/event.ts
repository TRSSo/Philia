import { Client } from "../../socket/index.js"
import { Event } from "../type/index.js"
import { isEqualObj } from "../../util/index.js"
export class Handle {
  client: Client
  handles: Map<string, [Omit<Event.Handle, "type" | "scene">]> = new Map()
  constructor(client: Client) {
    this.client = client
  }

  receive(event: Event.Handle | Event.Handle[]) {
    for (const i of Array.isArray(event) ? event : [event]) {
      const key = `${i.type}.${i.scene || ""}`
      delete (i as Partial<Event.Handle>).type
      delete i.scene
      const value = this.handles.get(key)

      if (value) {
        if (!value.some(j => isEqualObj(i, j))) value.push(i)
      } else {
        this.handles.set(key, [i])
      }
    }
  }

  unreceive(event: Event.Handle | Event.Handle[]) {
    for (const i of Array.isArray(event) ? event : [event]) {
      const key = `${i.type}.${i.scene || ""}`
      delete (i as Partial<Event.Handle>).type
      delete i.scene
      const value = this.handles.get(key)

      if (!value) continue
      const index = value.findIndex(j => isEqualObj(i, j))
      if (index === -1) continue
      value.splice(index, 1)
      if (!value.length) this.handles.delete(key)
    }
  }

  handle(event: Event.Event) {
    const handles = [
      ...(this.handles.get(`${event.type}.`) || []),
      ...(this.handles.get(`${event.type}.${event.scene}`) || []),
    ]
    for (const i of handles) {
      if ("uid" in i && i.uid !== event.user?.id) continue
      if ("gid" in i && i.gid !== event.group?.id) continue
      this.client.request(i.handle, event)
    }
  }
}
