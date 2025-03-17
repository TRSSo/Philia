import { type } from "../../socket/index.js";
import Event from "./event.js";
import Group from "./group.js";
import Meta from "./meta.js";
import Self from "./self.js";
import User from "./user.js";

export default function example() {
  return [new Meta, new Self, new User, new Group, new Event] as unknown as type.OHandle[]
}