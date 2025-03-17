import Client from "./client.js"
import { type as SocketType } from "../../../socket/index.js"

export default class Handle implements SocketType.OHandle {
  [key: string]: ((data: unknown) => unknown) | unknown;
  client: Client
  constructor(client: Client) {
    this.client = client
  }
}