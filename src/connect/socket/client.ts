import { Socket } from "node:net"
import Path from "node:path"
import { Encoder, makeError, promiseEvent, StringOrBuffer } from "#util"
import { Client as AClient, type type } from "../common/index.js"

export interface ClientOptions extends type.Options {
  socket?: Socket | ConstructorParameters<typeof Socket>[0]
}

export default class Client extends AClient {
  event: Socket & { path?: string }
  buffer!: Buffer
  buffer_split?: Buffer

  constructor(handle: type.Handles, opts: ClientOptions = {}) {
    super(handle, opts)
    if (opts.path) this.path = opts.path
    if (opts.socket instanceof Socket) this.event = opts.socket
    else this.event = new Socket(opts.socket).on("connect", this.onconnect.bind(this))
    this.event.setTimeout(this.timeout.idle)
    for (const i in this.listener) this.listener[i] = this.listener[i].bind(this)
  }

  connect(path = this.path) {
    if (process.platform === "win32") this.event.path = Path.join("\\\\?\\pipe", path)
    else this.event.path = `\0${path}`
    this.event.connect(this.event.path as string)
    return promiseEvent<this>(this.event, "connected", "error")
  }

  onclose() {
    this.open = false
    this.buffer = Buffer.alloc(0)
    for (const i in this.listener) this.event.off(i, this.listener[i])
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
      this.request("heartbeat").catch(this.forceClose)
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
    this.write(this.encoder.encode(this.meta.local))

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
        this.event.off("data", listener)
      }
      const timeout = setTimeout(() => {
        reject(makeError("等待元数据超时", { timeout: this.timeout.send }))
        this.event.off("data", listener)
      }, this.timeout.send)
      this.event.on("data", listener)
    })
  }

  forceClose = () => this.event.destroy()
  close() {
    this.event.end()
    const timeout = setTimeout(this.forceClose, this.timeout.wait)
    return promiseEvent<void>(this.event, "close", "error").finally(() => clearTimeout(timeout))
  }

  decode_empty = Symbol("decode_empty")
  decode(): typeof this.decode_empty | ReturnType<typeof this.encoder.decode> {
    if (this.buffer.length < 4) return this.decode_empty
    const length = this.buffer.readUint32BE() + 4
    if (this.buffer.length < length) return this.decode_empty

    let data = this.buffer.subarray(4, length)
    if (this.buffer_split) {
      data = Buffer.concat([this.buffer_split, data])
      this.buffer_split = undefined
    }
    this.buffer = this.buffer.subarray(length)

    if (length === 4294967295 + 4) {
      this.buffer_split = data
      return this.decode()
    }
    return this.encoder.decode(data)
  }

  write(data: Buffer) {
    while (data.length >= 4294967295) {
      const length = Buffer.allocUnsafe(4)
      length.writeUint32BE(4294967295)
      this.event.write(Buffer.concat([length, data.subarray(0, 4294967295)]))
      data = data.subarray(4294967295)
    }

    const length = Buffer.allocUnsafe(4)
    length.writeUint32BE(data.length)
    return this.event.write(Buffer.concat([length, data]))
  }

  receive(buffer: Buffer) {
    try {
      this.buffer = Buffer.concat([this.buffer, buffer])
      let data: ReturnType<typeof this.decode>
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
