import Client from "./client.js"

export interface MetaInfo {
  id: string
  name: string
  version: number
  encode: string[]
  verify: string[]
}

export interface Meta {
  local: MetaInfo
  remote?: MetaInfo
}

export interface Options {
  meta?: MetaInfo
  timeout?: {
    send?: number
    wait?: number
    idle?: number
    retry?: number
  }
  path?: string
}

export const enum ESocketStatus {
  New,
  dle,
  Send,
  Close,
}
export const enum EStatus {
  Request,
  Receive,
  Async,
  Error,
}
export interface Base<T extends EStatus> {
  id: string
  code: T
  name?: string
  data?: unknown
}

export interface Request extends Base<EStatus.Request> {
  name: string
}
export type Receive = Base<EStatus.Receive>
export type Async = Base<EStatus.Async>
export interface Error extends Base<EStatus.Error> {
  data: {
    name: string
    message: string
    error?: unknown
  }
}

export class CError {
  data: Error["data"]
  constructor(name: string, message: string, error?: object) {
    this.data = { name, message, ...error }
  }
}

export interface Cache {
  data: Request
  retry: number
  promise: Promise<(Receive | Error)["data"]>
  resolve(data: any): void
  reject(data: any): void
  finally(): void
  timeout?: NodeJS.Timeout
}

export type HandleDefault = (
  name: Request["name"],
  data: Request["data"],
  client: Client,
) => Receive["data"] | Promise<Receive["data"]>
export type Handle = (
  data: Request["data"],
  client: Client,
) => Receive["data"] | Promise<Receive["data"]>
export type OHandle = {
  [key: Request["name"]]: Handle | unknown
  default?: HandleDefault
}
export type Handles = OHandle | OHandle[]
