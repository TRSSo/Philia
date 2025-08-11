/** API 转换器 */
export default function createAPI<T extends { [key: string]: (data: any) => unknown }>(client: {
  request: (name: string, data: any) => Promise<unknown>
}) {
  return new Proxy(Object.create(null), {
    get: (_, name: string) => client.request.bind(client, name) as T[typeof name],
  }) as {
    [K in keyof T]: // 可选参数
    T[K] extends { (): any; (arg: infer P, ...args: any[]): unknown }
      ? unknown extends P
        ? () => Promise<Awaited<ReturnType<T[K]>>>
        : (data?: P) => Promise<Awaited<ReturnType<T[K]>>>
      : // 未定义参数
        T[K] extends (arg: undefined, ...args: any[]) => unknown
        ? () => Promise<Awaited<ReturnType<T[K]>>>
        : // 必选参数
          T[K] extends (arg: infer P, ...args: any[]) => unknown
          ? (data: P) => Promise<Awaited<ReturnType<T[K]>>>
          : never
  }
}
