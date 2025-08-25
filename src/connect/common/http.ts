import http from "node:http"
import https from "node:https"
import type { Logger } from "#logger"
import { getRequestInfo, getSocketAddress, promiseEvent } from "#util"
import type Client from "./client.js"
import { compress, encoder } from "./encoder.js"
import Handle from "./handle.js"
import * as type from "./type.js"

export interface Config {
  /** 监听地址 */
  host?: string
  /** 监听端口 */
  port?: number
  /** 服务器选项 */
  opts?: http.ServerOptions
  /** HTTPS 选项 */
  https?: https.ServerOptions
}

export interface Request extends Omit<type.Request, "id"> {
  req: http.IncomingMessage
  res: http.ServerResponse
  reply(code: number, data?: unknown): void
  async: boolean
  id: type.Request["id"] | null
}

export default class HTTP {
  server: http.Server
  handle: Handle
  timeout_idle = 3e5
  headers = {
    "Accept-Encoding": Array.from(compress.keys())
      .map(i => i.toLowerCase())
      .join(", "),
  }

  constructor(
    public config: Config = {},
    public logger: Logger,
    handle: type.HandleMap,
  ) {
    this.handle = new Handle(handle, { logger } as Client)
    this.server = config.https
      ? https.createServer(config.https)
      : http.createServer(config.opts ?? {})
    this.server
      .on("listening", () =>
        this.logger.info(
          `HTTP 服务器已监听在 http${config.https ? "s" : ""}://${getSocketAddress(this.server)}`,
        ),
      )
      .on("request", this.request.bind(this))
      .on("error", err => this.logger.error(err))
      .on("close", () => {
        this.logger.info(`WebSocket 服务器已关闭`)
      })
  }

  start() {
    this.server.listen(this.config.port, this.config.host)
    return promiseEvent(this.server, "listening", "error")
  }

  stop() {
    this.server.close()
    return promiseEvent(this.server, "close", "error")
  }

  readPostData(req: http.IncomingMessage) {
    const { promise, resolve, reject } = Promise.withResolvers()
    const chunks: Buffer[] = []
    req.on("data", chunk => chunks.push(chunk))
    req.on("error", reject)
    req.on("close", () => reject(Error("请求被关闭")))
    req.on("end", () => {
      try {
        let buffer: Buffer = Buffer.concat(chunks)
        if (req.headers["content-encoding"]) {
          const decode = compress.get(req.headers["content-encoding"].toUpperCase())?.decode
          if (!decode) throw Error("不支持的编码格式")
          buffer = decode(buffer)
        }

        if (req.headers["content-type"] === "application/vnd.msgpack")
          resolve(encoder.get("MsgPack")!.decode(buffer))
        else resolve(encoder.get("JSON")!.decode(buffer))
      } catch (err) {
        reject(err)
      }
    })
    return promise.finally(() => req.removeAllListeners())
  }

  async request(req: http.IncomingMessage, res: http.ServerResponse) {
    const [sid, rid] = getRequestInfo(req)
    const reply = (code: number, data?: unknown) => {
      try {
        if (res.closed) return

        let buffer: Buffer | undefined
        if (data !== undefined) {
          if (req.headers["content-type"] === "application/vnd.msgpack") {
            buffer = encoder.get("MsgPack")!.encode(data)
            res.setHeader("Content-Type", "application/vnd.msgpack")
          } else {
            buffer = encoder.get("JSON")!.encode(data)
            res.setHeader("Content-Type", "application/json")
          }

          const encoding: string[] = []
          if (req.headers["content-encoding"]) encoding.push(req.headers["content-encoding"])
          if (req.headers["accept-encoding"])
            encoding.push(...req.headers["accept-encoding"].split(","))
          for (const i of encoding.map(i => i.trim())) {
            const encode = compress.get(i.toUpperCase())?.encode
            if (!encode) continue
            buffer = encode(buffer)
            res.setHeader("Content-Encoding", i)
            break
          }
          res.setHeader("Content-Length", buffer.length)
        }

        res.writeHead(code, this.headers)
        if (buffer) res.write(buffer)
        this.logger.trace("HTTP", req.method, "回复", rid, code, res.getHeaders(), data ?? "")
      } catch (err) {
        this.logger.error("HTTP", req.method, "回复", rid, code, res.getHeaders(), data ?? "", err)
      }
      res.end()
    }

    const url = URL.parse(req.url as string, "http://localhost")
    if (!url) return reply(400)
    const data: Request = {
      req,
      res,
      reply,
      async: Boolean(url.searchParams.get("async")),
      id: url.searchParams.get("id"),
      name: url.pathname.slice(1),
      code: type.EStatus.Request,
    }

    if (req.method === "POST")
      try {
        data.data = await this.readPostData(req)
        this.logger.trace("HTTP", req.method, "请求", rid, sid, req.headers, data.data)
      } catch (err) {
        this.logger.error("HTTP", req.method, "请求", rid, sid, req.headers, err)
        return reply(400)
      }
    else {
      this.logger.trace("HTTP", req.method, "请求", rid, sid, req.headers)
      if (req.method !== "GET") return reply(405)
    }

    if (data.id) {
      const cache = this.handle.reply_cache[data.id]
      if (cache) {
        data.id = null
        return this.reply(data, cache.code, (cache as type.Response).data)
      }
    }

    return this.handle.request(data as type.Request, this.reply.bind(this, data))
  }

  reply(req: Request, code: type.Reply["code"], data?: type.Response["data"]) {
    if (req.id) {
      this.handle.reply_cache[req.id] = { id: req.id, code, data } as type.Reply
      setTimeout(() => delete this.handle.reply_cache[req.id!], this.timeout_idle)
    }
    switch (code) {
      case type.EStatus.Response:
        req.reply(200, data)
        break
      case type.EStatus.Async:
        if (req.async) req.reply(202)
        break
      default:
        if ((data as type.Error["data"]).name === "NotFoundError") req.reply(404)
        else req.reply(500, data)
    }
  }
}
