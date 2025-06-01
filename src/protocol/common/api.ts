/** API 转换器 */
export default function createAPI<T extends { [key: string]: (data: any) => unknown }>(client: {
  request: (name: string, data: any) => Promise<unknown>
}) {
  return new Proxy(
    {},
    {
      get: (_, name: string) => {
        return client.request.bind(client, name) as T[typeof name]
      },
    },
  ) as T
}
