import { String } from "./common.js"
import v8 from "node:v8"

export interface IEncoder<T> {
  encode(data: T): Buffer
  decode(data: Buffer): T
}

export interface IEncoders<T> {
  [key: string]: IEncoder<T>
}

export const JSON: IEncoder<any> = {
  encode: data => Buffer.from(String(data)),
  decode: global.JSON.parse as (data: string | Buffer) => any,
}

export const V8Serializer: IEncoder<any> = {
  encode: data => { try {
    return v8.serialize(data)
  } catch {
    return v8.serialize((JSON.decode as (data: string | Buffer) => any)(String(data)))
  }},
  decode: v8.deserialize,
}

export default { V8Serializer, JSON } as IEncoders<any>