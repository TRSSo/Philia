import * as Milky from "../type/index.js"

export enum MessageScene {
  friend,
  group,
  temp,
}

export function encodeMessageID(
  message_scene: Milky.Struct.IncomingMessage["message_scene"],
  peer_id: Milky.Struct.IncomingMessage["peer_id"],
  message_seq: Milky.Struct.IncomingMessage["message_seq"],
) {
  const buffer = Buffer.allocUnsafe(9)
  buffer.writeUint8(MessageScene[message_scene])
  buffer.writeUint32BE(peer_id, 1)
  buffer.writeUint32BE(message_seq, 5)
  return buffer.toString("base64url")
}

export function decodeMessageID(id: string): {
  message_scene: Milky.Struct.IncomingMessage["message_scene"]
  peer_id: Milky.Struct.IncomingMessage["peer_id"]
  message_seq: Milky.Struct.IncomingMessage["message_seq"]
} {
  const buffer = Buffer.from(id, "base64url")
  return {
    message_scene: MessageScene[buffer.readUint8()] as keyof typeof MessageScene,
    peer_id: buffer.readUint32BE(1),
    message_seq: buffer.readUint32BE(5),
  }
}

export enum FileScene {
  Resource,
  Private,
  Group,
}

export function encodeFileID(scene: FileScene, id: string, peer_id: number) {
  let buffer: Buffer
  if (scene === FileScene.Resource) {
    buffer = Buffer.allocUnsafe(1)
    buffer.writeUint8(scene)
  } else {
    buffer = Buffer.allocUnsafe(5)
    buffer.writeUint8(scene)
    buffer.writeUint32BE(peer_id, 1)
  }
  return `${buffer.toString("base64url")}|${id}`
}

export function decodeFileID(file_id: string): { scene: FileScene; id: string; peer_id?: number } {
  const match = file_id.match(/^([A-Za-z0-9-_]+)\|/)
  if (!match) return { scene: FileScene.Resource, id: file_id }
  const buffer = Buffer.from(match[1], "base64url")
  const scene = buffer.readUint8() as FileScene
  return {
    scene,
    id: file_id.replace(match[0], ""),
    peer_id: scene === FileScene.Resource ? undefined : buffer.readUint32BE(1),
  }
}
