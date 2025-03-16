import { Socket, Server } from "node:net"
import Client from "./client.js"

export interface IMetaInfo {
  id: string
  name: string
  version: number
  encode: string[]
}

export interface IMeta {
  local: IMetaInfo
  remote?: IMetaInfo
}

export interface IOptions {
  meta?: IMetaInfo
  timeout?: {
    send?: number
    wait?: number
    idle?: number
    retry?: number
  }
  socket?: Socket | Server
}

export interface IServerOptions extends IOptions {
  socket?: Server
  limit?: number
}

export enum ESocketStatus { New, Idle, Send, Close }
export enum EStatus { Request, Receive, Async, Error }
export interface IBase<T extends EStatus> {
  id: string
  code: T
  name?: string
  data?: unknown
}

export interface IRequest extends IBase<EStatus.Request> {
  name: string
}
export type IReceive = IBase<EStatus.Receive>
export type IAsync = IBase<EStatus.Async>
export interface IError extends IBase<EStatus.Error> {
  data: {
    name: string
    message: string
    error?: unknown
  }
}

export class CError {
  data: IError["data"]
  constructor(name: string, message: string, error?: object) {
    this.data = { name, message, ...error }
  }
}

export interface ICache {
  data: IRequest
  retry: number
  promise: Promise<(IReceive | IError)["data"]>
  resolve(data: any): void
  reject(data: any): void
  finally(): void
  timeout?: NodeJS.Timeout
}

export type IHandleDefault = (name: IRequest["name"], data: IRequest["data"], client: Client) => (IReceive["data"] | Promise<IReceive["data"]>)

export type IHandle = {
  [key: IRequest["name"]]:
    ((data: IRequest["data"], client: Client) => (IReceive["data"] | Promise<IReceive["data"]>))
} & {
  default?: IHandleDefault
}