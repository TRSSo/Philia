import type { Client } from "#connect/common"
import type Manager from "./server.js"

export default function API(manager: Manager) {
  return {
    stop: () => {
      process.nextTick(manager.stop.bind(manager))
    },
    getLog: manager.logger_manager.get.bind(manager.logger_manager),
    followLog: manager.logger_manager.follow.bind(manager.logger_manager) as (
      data: Parameters<typeof manager.logger_manager.follow>[0],
    ) => ReturnType<typeof manager.logger_manager.follow>,
    unfollowLog: ((_: undefined, client: Client) =>
      manager.logger_manager.unfollow(client)) as () => ReturnType<
      typeof manager.logger_manager.unfollow
    >,
  }
}
