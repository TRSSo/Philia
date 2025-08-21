/** API 转换器 */
export default function createAPI<T>(client: {
  request: (name: keyof T, data: any) => Promise<unknown>
}) {
  return new Proxy(Object.create(null), {
    get: (target, name) =>
      target[name] ?? (target[name] = client.request.bind(client, name as keyof T)),
  }) as {
    [K in keyof Required<T>]: // 可选参数
    Required<T>[K] extends { (): any; (arg: infer P, ...args: any[]): unknown }
      ? unknown extends P
        ? () => Promise<Awaited<ReturnType<Required<T>[K]>>>
        : (data?: P) => Promise<Awaited<ReturnType<Required<T>[K]>>>
      : // 未定义参数
        Required<T>[K] extends (arg: undefined, ...args: any[]) => unknown
        ? () => Promise<Awaited<ReturnType<Required<T>[K]>>>
        : // 必选参数
          Required<T>[K] extends (arg: infer P, ...args: any[]) => unknown
          ? (data: P) => Promise<Awaited<ReturnType<Required<T>[K]>>>
          : never
  }
}
