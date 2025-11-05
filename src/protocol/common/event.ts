import type { Client } from "#connect/common"
import type * as Philia from "#project/project/philia.js"
import type { Event } from "#protocol/type"
import { isEqualObj, modeMatch } from "#util"

type HandleMap = Omit<Event.Handle, "type" | "scene"> & { client: Client }

export default class EventHandle {
  philia: Philia.Project
  handles = new Map<string, HandleMap[]>()
  constructor(philia: Philia.Project) {
    this.philia = philia
  }

  receive(event: Event.Handle | Event.Handle[], client: Client) {
    for (const i of Array.isArray(event) ? event : [event]) {
      const key = `${i.type}.${i.scene || ""}`
      delete (i as Partial<Event.Handle>).type
      delete i.scene
      const value: HandleMap = { client, ...i }
      const values = this.handles.get(key)

      if (values) {
        if (!values.some(j => isEqualObj(value, j, 2))) values.push(value)
      } else {
        this.handles.set(key, [value])
      }
    }
  }

  unreceive(event: Event.Handle | Event.Handle[], client: Client) {
    for (const i of Array.isArray(event) ? event : [event]) {
      const key = `${i.type}.${i.scene || ""}`
      delete (i as Partial<Event.Handle>).type
      delete i.scene
      const values = this.handles.get(key)

      if (!values) continue
      const value: HandleMap = { client, ...i }
      const index = values.findIndex(j => isEqualObj(value, j, 2))
      if (index === -1) continue
      values.splice(index, 1)
      if (!values.length) this.handles.delete(key)
    }
  }

  handle(event: Event.Event) {
    for (const handles of [
      this.handles.get(`${event.type}.`),
      this.handles.get(`${event.type}.${event.scene}`),
    ]) {
      if (!handles) continue
      for (const index in handles) {
        const i = handles[index]
        if (i.uid && !(event.user?.id && modeMatch(i.uid, event.user.id))) continue
        if (i.gid && !(event.group?.id && modeMatch(i.gid, event.group.id))) continue
        if (!this.philia.clients.has(i.client)) {
          handles.splice(+index, 1)
          continue
        }
        i.client.request(i.handle, event).catch(err => i.client.logger.error("处理事件错误", err))
      }
    }
  }
}
