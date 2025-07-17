import { WebSocket } from "ws"
import { Encoder, makeError, promiseEvent, StringOrBuffer } from "#util"
import { Client as AClient, type type } from "../common/index.js"

export interface ClientOptions extends type.Options {
  ws?: WebSocket | ConstructorParameters<typeof WebSocket>[2]
}

export default class Client extends AClient {
  event!: WebSocket
  ws_opts?: ConstructorParameters<typeof WebSocket>[2]

  constructor(handle: type.Handles, opts: ClientOptions = {}) {
    super(handle, { compress: true, ...opts })
    if (opts.path) this.path = opts.path
    if (opts.ws instanceof WebSocket) this.event = opts.ws
    else this.ws_opts = opts.ws
    for (const i in this.listener) this.listener[i] = this.listener[i].bind(this)
  }

  connect(path = this.path) {
    this.event ??= new WebSocket(path, this.ws_opts).on("open", this.onconnect.bind(this))
    return promiseEvent<this>(this.event, "connected", "error")
  }

  heartbeat_timeout?: NodeJS.Timeout
  heartbeat = () => {
    this.heartbeat_timeout = setTimeout(
      () => this.request("heartbeat").then(this.heartbeat).catch(this.forceClose),
      this.timeout.idle,
    )
  }

  onclose() {
    clearTimeout(this.heartbeat_timeout)
    this.open = false
    for (const i in this.listener) this.event.off(i, this.listener[i])
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    message: this.receive,
    close(this: Client) {
      this.onclose()
      this.logger.info(`${this.meta.remote?.id} 已断开连接`)
    },
    connected(this: Client) {
      this.logger.info("已连接", this.meta.remote)
      this.open = true
      this.heartbeat()
      this.sender()
    },
    error(this: Client, error) {
      this.logger.error("错误", error)
    },
  }

  getMetaInfo(): Promise<type.MetaInfo> {
    this.encoder = new Encoder()
    this.write(this.encoder.encode(this.meta.local))

    return new Promise((resolve, reject) => {
      const listener = (buffer: Buffer) => {
        try {
          resolve(this.encoder.decode(buffer))
        } catch (err) {
          reject(
            makeError("解析元数据错误", {
              data: StringOrBuffer(buffer),
              cause: err,
            }),
          )
        }
        clearTimeout(timeout)
      }
      const timeout = setTimeout(() => {
        reject(makeError("等待元数据超时", { timeout: this.timeout.send }))
        this.event.off("message", listener)
      }, this.timeout.send)
      this.event.once("message", listener)
    })
  }

  forceClose = () => this.event.terminate()
  close() {
    this.event.close()
    const timeout = setTimeout(this.forceClose, this.timeout.wait)
    return promiseEvent<void>(this.event, "close", "error").finally(() => clearTimeout(timeout))
  }

  write(data: Buffer) {
    return this.event.send(data)
  }

  receive(data: Buffer) {
    try {
      this.handle.data(this.encoder.decode(data))
    } catch (err) {
      this.close()
      throw makeError("处理数据错误", { data, cause: err })
    }
  }

  static create(
    path: string | Client,
    handle: ConstructorParameters<typeof Client>[0],
    opts?: ConstructorParameters<typeof Client>[1],
  ) {
    if (path instanceof Client) {
      path.handle.set(handle)
      return path
    }
    return new Client(handle, { ...opts, path })
  }
}
