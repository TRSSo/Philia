import { lock } from "../common.js"
import { MessageRet } from "../event/types.js"
import {
  Sendable,
  Forwardable,
  Quotable,
  ImageElem,
  VideoElem,
  PttElem,
  ForwardNode,
  Message,
  FileElem,
  OICQtoTRSS,
} from "../message/index.js"

type Client = import("../client.js").Client

/** 所有用户和群的基类 */
export abstract class Contactable {
  /** 对方QQ号 */
  protected uid?: string
  /** 对方群号 */
  protected gid?: string

  // 对方账号，可能是群号也可能是QQ号
  get target() {
    return this.uid || this.gid || this.c.uin
  }

  // 是否是 Direct Message (私聊)
  get dm() {
    return !!this.uid
  }

  get key() {
    return this.dm ? "User" : "Group"
  }

  /** 返回所属的客户端对象 */
  get client() {
    return this.c
  }

  protected constructor(protected readonly c: Client) {
    lock(this, "c")
  }

  get [Symbol.unscopables]() {
    return {
      c: true,
    }
  }

  /** 发送网址分享 */
  shareUrl(content: any, config?: any) {
    return this.c.request(`send${this.key}ShareUrl`, { id: this.target, content, config })
  }
  /** 发送音乐分享 */
  shareMusic(platform: any, mid: string) {
    return this.c.request(`send${this.key}ShareMusic`, { id: this.target, platform, mid })
  }

  /** 上传一批图片以备发送(无数量限制)，理论上传一次所有群和好友都能发 */
  async uploadImages(images: ImageElem[]) {
    return images.map(i => this.uploadImage(i))
  }

  async uploadImage(elem: ImageElem): Promise<ImageElem> {
    return { type: "image", file: await this.c.uploadFile(elem.file) }
  }

  /** 上传一个视频以备发送(理论上传一次所有群和好友都能发) */
  async uploadVideo(elem: VideoElem): Promise<VideoElem> {
    return { type: "video", file: await this.c.uploadFile(elem.file) }
  }

  /** 上传一个语音以备发送(理论上传一次所有群和好友都能发) */
  async uploadPtt(elem: PttElem, transcoding: boolean = true, brief: string = ''): Promise<PttElem> {
    return { type: "record", file: await this.c.uploadFile(elem.file), transcoding, brief }
  }

  /**
   * 制作一条合并转发消息以备发送（制作一次可以到处发）
   * 需要注意的是，好友图片和群图片的内部格式不一样，对着群制作的转发消息中的图片，发给好友可能会裂图，反过来也一样
   * 支持4层套娃转发（PC仅显示3层）
   */
  makeForwardMsg(msglist: Forwardable[] | Forwardable): ForwardNode {
    return { type: "node", data: msglist }
  }

  /** 下载并解析合并转发 */
  getForwardMsg(resid: string, fileName: string = "MultiMsg") {
    return this.c.request(`get${this.key}ForwardMsg`, { id: this.target, resid, fileName })
  }

  /** 获取视频下载地址 */
  getVideoUrl(fid: string, md5: string | Buffer) {
    return this.c.request(`get${this.key}VideoUrl`, { id: this.target, fid, md5 })
  }

  /**
   * 发送一条消息
   * @param content 消息内容
   * @param source 引用回复的消息
   */
  async sendMsg(content: Sendable, source?: Quotable) {
    return this.c.request(`send${this.key}Msg`, {
      id: this.target,
      data: await (new OICQtoTRSS(this, content, source)).convert(),
    }) as Promise<MessageRet>
  }

  /**
   * 撤回消息
   * @param message_id 消息id
   */
  recallMsg(message_id: string): Promise<boolean>
  /**
   * 撤回消息
   * @param message 私聊消息对象
   */
  recallMsg(message: Message): Promise<boolean>
  recallMsg(param: string | Message) {
    return this.c.request(`del${this.key}Msg`, {
      id: this.target,
      mid: typeof param === "string" ? param : param.message_id,
    })
  }

  /** 转发消息 */
  forwardMsg(mid: string) {
    return this.c.request(`send${this.key}MsgForward`, {
      id: this.target,
      mid,
    })
  }

  /**
   * 获取文件信息
   * @param fid 文件消息ID
   */
  getFileInfo(fid: string) {
    return this.c.request(`get${this.key}FileInfo`, { id: this.target, fid }) as Promise<Omit<FileElem, "type"> & Record<"url", string>>
  }

  /**
   * 获取离线文件下载地址
   * @param fid 文件消息ID
   */
  async getFileUrl(fid: string) {
    return (await this.getFileInfo(fid)).url
  }

  /**
   * 撤回离线文件
   * @param fid 文件消息ID
   */
  recallFile(fid: string) {
    return this.recallMsg(fid)
  }

  /**
   * 转发离线文件
   * @param fid 文件消息ID
   * @returns 转发成功后新文件的消息ID
   */
  forwardFile(fid: string) {
    return this.forwardMsg(fid)
  }

  /** 设置群名 */
  setName(name: string) {
    return this.c.request(`set${this.key}Name`, { id: this.target, name })
  }

  /** 设置备注 */
  setRemark(mark: string) {
    return this.c.request(`set${this.key}Mark`, { id: this.target, mark })
  }

  /** 设置群头像 */
  setAvatar(avatar: ImageElem["file"]) {
    return this.c.request(`set${this.key}Avatar`, { id: this.target, avatar })
  }
}