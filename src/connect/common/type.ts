import type Client from "./client.js"

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
  compress?: boolean
}

export interface ServerOptions extends Options {
  limit?: number
}

export const enum ESocketStatus {
  New,
  dle,
  Send,
  Close,
}
export const enum EStatus {
  Request,
  Response,
  Async,
  Error,
}
export interface Base<T extends EStatus> {
  id: string
  code: T
}

export interface Request extends Base<EStatus.Request> {
  name: string
  data?: unknown
}
export interface Response extends Base<EStatus.Response> {
  data?: unknown
}
export interface Async extends Base<EStatus.Async> {
  time?: number
}
export interface Error extends Base<EStatus.Error> {
  data: {
    name: string
    message: string
    error?: unknown
  }
}
export type Status = Request | Response | Async | Error
export type Reply = Response | Async | Error

export class CError {
  data: Error["data"]
  constructor(name: string, message: string, error?: object) {
    this.data = { name, message, ...error }
  }
}

export interface Cache extends ReturnType<typeof Promise.withResolvers<Response["data"]>> {
  data: Request
  retry: number
  finally(): void
  timeout?: NodeJS.Timeout
}

export type HandleDefault = (
  name: Request["name"],
  data: Request["data"],
  client: Client,
) => Response["data"] | Promise<Response["data"]>
export type Handle = (
  data: Request["data"],
  client: Client,
) => Response["data"] | Promise<Response["data"]>
export interface HandleMap {
  [key: Request["name"]]: Handle | undefined | string | number | boolean | object
  default?: HandleDefault
}
