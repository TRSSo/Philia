import { WebSocket } from "ws"
import { Encoder, makeError, promiseEvent, StringOrBuffer } from "#util"
import { type, Client as AClient } from "../common/index.js"

export interface ClientOptions extends type.Options {
  ws?: WebSocket | ConstructorParameters<typeof WebSocket>[2]
}

export default class Client extends AClient {
  ws!: WebSocket
  ws_opts?: ConstructorParameters<typeof WebSocket>[2]

  constructor(handle: type.Handles, opts: ClientOptions = {}) {
    super(handle, { compress: true, ...opts })
    if (opts.path) this.path = opts.path
    if (opts.ws instanceof WebSocket) this.ws = opts.ws
    else this.ws_opts = opts.ws
    for (const i in this.listener) this.listener[i] = this.listener[i].bind(this)
  }

  connect(path = this.path) {
    this.ws ??= new WebSocket(path, this.ws_opts).on("open", this.onconnect)
    return promiseEvent(this.ws, "connected", "error") as Promise<this>
  }

  onconnect = async () => {
    await this.onconnectMeta()
    for (const i in this.listener) this.ws.on(i, this.listener[i])
    this.ws.emit("connected", this)
  }

  heartbeat_timeout?: NodeJS.Timeout
  heartbeat = () => {
    this.heartbeat_timeout = setTimeout(
      () =>
        this.request("heartbeat")
          .then(this.heartbeat)
          .catch(() => this.ws.terminate()),
      this.timeout.idle,
    )
  }

  onclose() {
    clearTimeout(this.heartbeat_timeout)
    this.open = false
    for (const i in this.listener) this.ws.off(i, this.listener[i])
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    data: this.receive,
    close(this: Client) {
      this.onclose()
      this.logger.info(`${this.meta.remote?.id} 已断开连接`)
    },
    timeout(this: Client) {
      this.request("heartbeat")
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
    this.ws.send(this.encoder.encode(this.meta.local))

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
        this.ws.off("data", listener)
      }, this.timeout.send)
      this.ws.once("data", listener)
    })
  }

  force_close() {
    this.ws.terminate()
  }

  close() {
    this.ws.close()
    const timeout = setTimeout(this.force_close.bind(this), this.timeout.wait)
    return promiseEvent(this.ws, "close", "error").finally(() => clearTimeout(timeout))
  }

  write(data: type.Base<type.EStatus>) {
    if (data.data === undefined) delete data.data
    this.logger.trace("发送", data)
    return this.ws.send(this.encoder.encode(data))
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
