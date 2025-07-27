/** API 转换器 */
export default function createAPI<T extends { [key: string]: (data: any) => unknown }>(client: {
  request: (name: string, data: any) => Promise<unknown>
}) {
  return new Proxy(
    {},
    { get: (_, name: string) => client.request.bind(client, name) as T[typeof name] },
  ) as {
    [K in keyof T]: (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
  }
}
