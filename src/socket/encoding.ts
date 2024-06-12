import { String } from "../util/index.js"
import { IEncoder, IEncoders } from "./types.js"
import v8 from "node:v8"

export const JSON: IEncoder<any> = {
  encode: data => Buffer.from(String(data)),
  decode: data => global.JSON.parse(data.toString()),
}

export const V8Serializer: IEncoder<any> = {
  encode: v8.serialize,
  decode: v8.deserialize,
}

export default { JSON, V8Serializer } as IEncoders<any>