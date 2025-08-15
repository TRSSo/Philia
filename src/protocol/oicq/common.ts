/** unix timestamp (second) */
export const timestamp = () => Math.floor(Date.now() / 1e3)

/** no operation */
export const NOOP = () => {}

/** 隐藏并锁定一个属性 */
export function lock(obj: any, prop: string) {
  Reflect.defineProperty(obj, prop, {
    configurable: false,
    enumerable: false,
    writable: false,
  })
}
export function unlock(obj: any, prop: string) {
  Reflect.defineProperty(obj, prop, {
    configurable: false,
    enumerable: false,
    writable: true,
  })
}

/** 隐藏一个属性 */
export function hide(obj: any, prop: string) {
  Reflect.defineProperty(obj, prop, {
    configurable: true,
    enumerable: false,
    writable: true,
  })
}
