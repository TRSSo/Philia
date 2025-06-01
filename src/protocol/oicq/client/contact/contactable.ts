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
  OICQtoPhilia,
  GroupMessage,
  FileIDElem,
} from "../message/index.js"
import { Message as PhiliaMessage } from "../../../type/index.js"

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

  get scene() {
    return this.dm ? "user" : "group"
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
    return this.sendMsg({ type: "share", ...content, config })
  }
  /** 发送音乐分享 */
  shareMusic(platform: string, id: string) {
    return this.sendMsg({ type: "music", platform, id })
  }

  /** 上传一批图片以备发送(无数量限制)，理论上传一次所有群和好友都能发 */
  async uploadImages(images: ImageElem[]) {
    return Promise.all(images.map(this.uploadImage.bind(this)))
  }

  async uploadImage(elem: ImageElem): Promise<FileIDElem> {
    if (elem.fid) return elem as unknown as FileIDElem
    return { type: "image", fid: await this.c.uploadFile(elem.file) }
  }

  /** 上传一个视频以备发送(理论上传一次所有群和好友都能发) */
  async uploadVideo(elem: VideoElem): Promise<FileIDElem> {
    if (elem.fid) return elem as unknown as FileIDElem
    return { type: "video", fid: await this.c.uploadFile(elem.file) }
  }

  /** 上传一个语音以备发送(理论上传一次所有群和好友都能发) */
  async uploadPtt(
    elem: PttElem,
    transcoding: boolean = true,
    brief: string = "",
  ): Promise<FileIDElem> {
    if (elem.fid) return elem as unknown as FileIDElem
    return {
      type: "record",
      fid: await this.c.uploadFile(elem.file),
      transcoding,
      brief,
    }
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
  async getForwardMsg(id: string) {
    return Promise.all(
      (await this.c.api.getForwardMsg({ id })).map(i => {
        i.user ||= {} as NonNullable<typeof i.user>
        i.group ||= {} as NonNullable<typeof i.group>
        return new GroupMessage(
          this.client,
          i as ConstructorParameters<typeof GroupMessage>[1],
        ).parse()
      }),
    )
  }

  /** 获取视频下载地址 */
  getVideoUrl(fid: string) {
    return this.getFileUrl(fid)
  }

  /**
   * 发送一条消息
   * @param content 消息内容
   * @param source 引用回复的消息
   */
  async sendMsg(content: Sendable, source?: Quotable): Promise<MessageRet> {
    const message = new OICQtoPhilia(this, content, source)
    await message.convert()
    if (message.response) return message.response
    if (!message.after.length) throw new Error("空消息")
    const ret = await this.c.api.sendMsg({
      scene: this.scene,
      id: this.target,
      data: message.after,
    })
    return {
      message_id: ret.id,
      time: ret.time,
      rand: ret.rand as number,
      seq: ret.seq as number,
    }
  }

  async sendForwardMsg(node: ForwardNode["data"]) {
    const data: PhiliaMessage.Forward[] = []
    let ret: MessageRet | undefined = undefined
    for (const i of Array.isArray(node) ? node : [node]) {
      const message = new OICQtoPhilia(this, i.message)
      await message.convert()
      if (message.response) {
        ret ??= message.response
        continue
      }
      if (!message.after.length) continue
      data.push({
        message: message.after,
        time: i.time,
        user: { id: i.user_id, name: i.nickname as string },
      })
    }
    if (data.length) {
      const res = (
        await this.c.api.sendMultiMsg({
          scene: this.scene,
          id: this.target,
          data,
        })
      )[0]
      ret = {
        message_id: res.id,
        time: res.time,
        rand: res.rand as number,
        seq: res.seq as number,
      }
    }
    if (!ret) throw Error("空合并转发消息")
    return ret
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
  async recallMsg(param: string | Message) {
    await this.c.api.delMsg({ id: typeof param === "string" ? param : param.message_id })
    return true
  }

  /** 转发消息 */
  forwardMsg(mid: string) {
    return this.c.api.sendMsgForward({ scene: this.scene, id: this.target, mid })
  }

  /**
   * 获取文件信息
   * @param id 文件消息ID
   */
  getFileInfo(id: string) {
    return this.c.api.getFile({ id })
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
    return this.sendMsg({ type: "file", fid })
  }

  /** 设置群名 */
  setName(name: string) {
    return this.c.api.setInfo({ scene: this.scene, id: this.target, data: { name } })
  }

  /** 设置备注 */
  setRemark(remark: string) {
    return this.c.api.setInfo({ scene: this.scene, id: this.target, data: { remark } })
  }

  /** 设置群头像 */
  setAvatar(avatar: ImageElem["file"]) {
    return this.c.api.setInfo({ scene: this.scene, id: this.target, data: { avatar } })
  }
}
