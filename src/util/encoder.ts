import crypto from "node:crypto"
import v8 from "node:v8"
import zlib from "node:zlib"
import { findArrays, makeError, toJSON } from "./common.js"

export interface IEncoder<T> {
  encode(data: T): Buffer
  decode(data: Buffer): T
}

export interface IEncoders<T> {
  [key: string]: IEncoder<T>
}

export const encoder: IEncoders<any> = {}

encoder.MsgPack = {
  encode: (await import("msgpackr")).pack,
  decode: (await import("msgpackr")).unpack,
}

encoder.CBOR = {
  encode: (await import("cbor-x")).encode,
  decode: (await import("cbor-x")).decode,
}

encoder.V8Serializer = {
  encode(data) {
    try {
      return v8.serialize(data)
    } catch {
      return v8.serialize(JSON.parse(toJSON(data)))
    }
  },
  decode: v8.deserialize,
}

encoder.JSON = {
  encode: data => Buffer.from(toJSON(data)),
  decode: JSON.parse as (data: string | Buffer) => any,
}

export const verify: IEncoders<Buffer> = {}

verify.None = {
  encode: data => data,
  decode: data => data,
}

verify.CRC32 = {
  encode(data) {
    const head = Buffer.allocUnsafe(4)
    head.writeUint32BE(zlib.crc32(data))
    return Buffer.concat([head, data])
  },
  decode(data) {
    const hash = data.readUint32BE()
    data = data.subarray(4)
    const now = zlib.crc32(data)
    if (now !== hash) throw makeError("数据校验失败", { now, hash, data })
    return data
  },
}

export const cryptoHash = (algo: string, length: number): IEncoder<Buffer> => ({
  encode(data) {
    const head = crypto.createHash(algo).update(data).digest()
    return Buffer.concat([head, data])
  },
  decode(data) {
    const hash = data.subarray(0, length)
    data = data.subarray(length)
    const now = crypto.createHash(algo).update(data).digest()
    if (!hash.equals(now)) throw makeError("数据校验失败", { now, hash, data })
    return data
  },
})

verify.MD5 = cryptoHash("md5", 16)
verify.SHA256 = cryptoHash("sha256", 32)
verify["SHA3-512"] = cryptoHash("sha3-512", 64)

export const compress: IEncoders<Buffer> = {}

compress.ZSTD = {
  encode: zlib.zstdCompressSync,
  decode: zlib.zstdDecompressSync,
}

compress.GZIP = {
  encode: zlib.gzipSync,
  decode: zlib.gunzipSync,
}

interface Encoders {
  encode: string[]
  verify: string[]
}

export class Encoder {
  encoder: IEncoder<any>
  verify: IEncoder<Buffer>
  encode = (data: any) => this.verify.encode(this.encoder.encode(data))
  decode = (data: Buffer) => this.encoder.decode(this.verify.decode(data))

  constructor()
  constructor(local: Encoders, remote: Encoders)
  constructor(local?: Encoders, remote?: Encoders) {
    if (!local || !remote) {
      this.encoder = encoder.JSON
      this.verify = verify.CRC32
      return
    }

    let encode = findArrays(local.encode, remote.encode) as string
    if (!encode) throw makeError("协议编码不支持", { local, remote })
    let decode = findArrays(remote.encode, local.encode) as string
    this.encoder = {
      encode: encoder[encode].encode,
      decode: encoder[decode].decode,
    }

    encode = findArrays(local.verify, remote.verify) as string
    if (!encode) throw makeError("协议校验不支持", { local, remote })
    decode = findArrays(remote.verify, local.verify) as string
    this.verify = {
      encode: (verify[encode] ?? compress[encode]).encode,
      decode: (verify[decode] ?? compress[encode]).decode,
    }

    if (encode === "None") this.encode = (data: any) => this.encoder.encode(data)
    if (decode === "None") this.decode = (data: Buffer) => this.encoder.decode(data)
  }
}
