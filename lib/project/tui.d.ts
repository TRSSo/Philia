import type { Logger } from "#logger";
import { type inquirerSelect } from "#util/tui.js";
export default class Tui {
  logger: Logger;
  impl_path: string;
  app_path: string;
  constructor(logger: Logger);
  main(): Promise<void>;
  list(): Promise<inquirerSelect<string>>;
  create(): Promise<void>;
  exit(): void;
}
