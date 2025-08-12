import type { Client } from "#connect/common"
import type Manager from "./manager.js"

export default function API(manager: Manager) {
  return {
    stop() {
      process.nextTick(() => manager.stop().finally(() => process.exit()))
    },
    closeConsole() {
      process.stdin.destroy()
      process.stdout.end()
      process.stderr.end()
    },
    getLog: manager.logger_manager.get.bind(manager.logger_manager),
    followLog: manager.logger_manager.follow.bind(manager.logger_manager) as (
      data: Parameters<typeof manager.logger_manager.follow>[0],
    ) => ReturnType<typeof manager.logger_manager.follow>,
    unfollowLog: (_: undefined, client: Client) => manager.logger_manager.unfollow(client),
    countNotice: manager.notice.count.bind(manager.notice),
    listNotice: manager.notice.list.bind(manager.notice),
    handleNotice: manager.notice.handle.bind(manager.notice),
  }
}
