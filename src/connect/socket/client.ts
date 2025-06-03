import { Socket } from "node:net"
import Path from "node:path"
import { Encoder, makeError, promiseEvent, StringOrBuffer } from "#util"
import { type, Client as AClient } from "../common/index.js"

export interface ClientOptions extends type.Options {
  socket?: Socket | ConstructorParameters<typeof Socket>[0]
}

export default class Client extends AClient {
  socket: Socket & { path?: string }
  buffer = Buffer.alloc(0)

  constructor(handle: type.Handles, opts: ClientOptions = {}) {
    super(handle, opts)
    if (opts.path) this.path = opts.path
    if (opts.socket instanceof Socket) this.socket = opts.socket
    else this.socket = new Socket(opts.socket).on("connect", this.onconnect)
    this.socket.setTimeout(this.timeout.idle)
    for (const i in this.listener) this.listener[i] = this.listener[i].bind(this)
  }

  connect(path = this.path) {
    if (process.platform === "win32") this.socket.path = Path.join("\\\\?\\pipe", path)
    else this.socket.path = `\0${path}`
    this.socket.connect(this.socket.path as string)
    return promiseEvent(this.socket, "connected", "error") as Promise<this | Error>
  }

  onconnect = async () => {
    await this.onconnectMeta()
    for (const i in this.listener) this.socket.on(i, this.listener[i])
    this.socket.emit("connected", this)
  }

  onclose() {
    this.open = false
    this.buffer = Buffer.alloc(0)
    for (const i in this.listener) this.socket.off(i, this.listener[i])
  }

  listener: { [key: string]: (...args: any[]) => void } = {
    data: this.receive,
    end(this: Client) {
      this.logger.info(`${this.meta.remote?.id} 请求关闭`)
    },
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
      this.sender()
    },
    error(this: Client, error) {
      this.logger.error("错误", error)
    },
  }

  getMetaInfo(): Promise<type.MetaInfo> {
    this.encoder = new Encoder()
    this.buffer = Buffer.alloc(0)
    this.socket.write(this.encode(this.meta.local))

    return new Promise((resolve, reject) => {
      const listener = (buffer: Buffer) => {
        try {
          this.buffer = Buffer.concat([this.buffer, buffer])
          const data = this.decode()
          if (data === this.decode_empty) return
          resolve(data)
        } catch (err) {
          reject(
            makeError("解析元数据错误", {
              data: StringOrBuffer(buffer),
              cause: err,
            }),
          )
        }
        clearTimeout(timeout)
        this.socket.off("data", listener)
      }
      const timeout = setTimeout(() => {
        reject(makeError("等待元数据超时", { timeout: this.timeout.send }))
        this.socket.off("data", listener)
      }, this.timeout.send)
      this.socket.on("data", listener)
    })
  }

  force_close() {
    this.socket.destroy()
  }

  close() {
    this.socket.end()
    const timeout = setTimeout(this.force_close.bind(this), this.timeout.wait)
    return promiseEvent(this.socket, "close", "error").finally(() => clearTimeout(timeout))
  }

  encode(data: any) {
    const buffer = this.encoder.encode(data)
    const length = Buffer.alloc(4)
    length.writeUint32BE(buffer.length)
    return Buffer.concat([length, buffer])
  }

  decode_empty = Symbol("decode_empty")
  decode() {
    if (this.buffer.length < 4) return this.decode_empty
    const length = this.buffer.readUint32BE() + 4
    if (this.buffer.length < length) return this.decode_empty

    const data = this.buffer.subarray(4, length)
    this.buffer = this.buffer.subarray(length)
    return this.encoder.decode(data)
  }

  write(data: type.Base<type.EStatus>) {
    if (data.data === undefined) delete data.data
    this.logger.trace("发送", data)
    return this.socket.write(this.encode(data))
  }

  receive(buffer: Buffer) {
    try {
      this.buffer = Buffer.concat([this.buffer, buffer])
      let data
      while ((data = this.decode()) !== this.decode_empty) this.handle.data(data)
    } catch (err) {
      this.close()
      throw makeError("处理数据错误", { data: buffer, cause: err })
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
