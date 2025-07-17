import type * as Philia from "../project/Philia.js"

export interface ManagerConfig {
  /** 启动后立即启动项目 */
  start_project: boolean
  /** 进程管理监听端口 */
  philia: Philia.IConfig & { role: "Server" }
}
