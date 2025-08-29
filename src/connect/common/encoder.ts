import crypto from "node:crypto"
import v8 from "node:v8"
import zlib from "node:zlib"
import * as msgpack from "msgpackr"
import { findArrays, makeError, toJSON } from "#util"

export interface IEncoder<T> {
  encode(data: T): Buffer
  decode(data: Buffer): T
}

export const encoder = new Map<string, IEncoder<any>>()

encoder.set("MsgPack", { encode: msgpack.pack, decode: msgpack.unpack })

encoder.set("V8Serializer", {
  encode(data) {
    try {
      return v8.serialize(data)
    } catch {
      return v8.serialize(JSON.parse(toJSON(data)))
    }
  },
  decode: v8.deserialize,
})

encoder.set("JSON", {
  encode: data => Buffer.from(toJSON(data)),
  decode: JSON.parse as (data: string | Buffer) => any,
})

export const verify = new Map<string, IEncoder<Buffer>>()

verify.set("None", {} as IEncoder<Buffer>)

verify.set("CRC32", {
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
})

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

verify.set("MD5", cryptoHash("md5", 16))
verify.set("SHA256", cryptoHash("sha256", 32))
verify.set("SHA3-512", cryptoHash("sha3-512", 64))

export const compress = new Map<string, IEncoder<Buffer>>()

compress.set("ZSTD", { encode: zlib.zstdCompressSync, decode: zlib.zstdDecompressSync })
compress.set("GZIP", { encode: zlib.gzipSync, decode: zlib.gunzipSync })

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
      this.encoder = encoder.get("JSON")!
      this.verify = verify.get("CRC32")!
      return
    }

    let encode = findArrays(local.encode, remote.encode) as string
    if (!encode) throw makeError("协议编码不支持", { local, remote })
    let decode = findArrays(remote.encode, local.encode) as string
    this.encoder = {
      encode: encoder.get(encode)!.encode,
      decode: encoder.get(decode)!.decode,
    }

    encode = findArrays(local.verify, remote.verify) as string
    if (!encode) throw makeError("协议校验不支持", { local, remote })
    decode = findArrays(remote.verify, local.verify) as string
    this.verify = {
      encode: (verify.get(encode) ?? compress.get(encode))!.encode,
      decode: (verify.get(decode) ?? compress.get(decode))!.decode,
    }

    if (this.verify.encode === undefined) this.encode = (data: any) => this.encoder.encode(data)
    if (this.verify.decode === undefined) this.decode = (data: Buffer) => this.encoder.decode(data)
  }
}
