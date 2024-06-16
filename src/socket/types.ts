import { Socket, Server } from "node:net"
import Client from "./client.js"

export interface IMetaInfo {
  id: string
  name: string
  version: number
  encoding: string[]
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
  socket?: Socket
}

export interface IServerOptions extends IOptions {
  server?: Server
}

export interface IEncoder<T> {
  encode(data: T): Buffer
  decode(data: Buffer): T
}

export interface IEncoders<T> {
  [key: string]: IEncoder<T>
}

export enum EStatus { Request, Receive, Async, Error }
export interface IBase<T extends EStatus> {
  id: string
  code: T
  name?: string
  data?: unknown
}

export interface IRequest extends IBase<EStatus.Request> {
  name: string
  data: object
}
export type IReceive = IBase<EStatus.Receive>
export type IAsync = IBase<EStatus.Async>
export interface IError extends IBase<EStatus.Error> {
  data: {
    name: string
    message: string
    stack?: string
  }
}

export interface ICache {
  data: IRequest
  retry: number
  promise: Promise<(IReceive | IError)["data"]>
  resolve(data: any): void
  reject(data: any): void
  timeout?: NodeJS.Timeout
}

export type IHandle = {
  [key: IRequest["name"]]: (data: IRequest["data"], client: Client) => (IReceive["data"] | Promise<IReceive["data"]>)
} & {
  default?: (name: IRequest["name"], data: IRequest["data"], client: Client) => (IReceive["data"] | Promise<IReceive["data"]>)
}