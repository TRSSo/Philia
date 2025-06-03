import { ulid } from "ulid"
import Client from "../../connect/socket/client.js"
import { makeError } from "#util"
import { Event as IEvent } from "../type/index.js"

export default class Event {
  receive: { [key: string]: NodeJS.Timeout } = {}
  event: Record<string, IEvent.Message> = new Proxy(
    {
      "message.user": {
        id: ulid(),
        time: Date.now() / 1000,
        type: "message",
        scene: "user",
        user: { id: "example", name: "示例" },
        message: [{ type: "text", data: "测试" }],
        summary: "测试",
      },

      "message.group": {
        id: ulid(),
        time: Date.now() / 1000,
        type: "message",
        scene: "group",
        user: { id: "example", name: "示例" },
        group: { id: "example", name: "示例" },
        message: [{ type: "text", data: "测试" }],
        summary: "测试",
      },
    },
    {
      get(target, prop: string) {
        if (prop in target) return target[prop as keyof typeof target]
        const array = Object.keys(this).filter(i =>
          i.startsWith(`${prop}.`),
        ) as (keyof typeof target)[]
        if (array.length) return target[array[Math.floor(Math.random() * array.length)]]
      },
    },
  )

  receiveEvent(event: IEvent.Handle | IEvent.Handle[], client: Client) {
    for (const i of Array.isArray(event) ? event : [event]) {
      if (!(i.type in this.event)) throw makeError("不存在该事件", { target: i })
      if (this.receive[i.type]) clearInterval(this.receive[i.type])
      const handle = (i.handle as string) || `handleEvent.${i.type}`
      this.receive[i.type] = setInterval(() => {
        client.request(handle, this.event[i.type as keyof typeof this.event])
      }, 1e5)
    }
  }

  unreceiveEvent(event: IEvent.Handle | IEvent.Handle[]) {
    for (const i of Array.isArray(event) ? event : [event]) {
      clearInterval(this.receive[i.type])
      delete this.receive[i.type]
    }
  }
}
