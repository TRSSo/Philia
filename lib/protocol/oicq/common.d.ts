/** unix timestamp (second) */
export declare const timestamp: () => number;
/** no operation */
export declare const NOOP: () => void;
/** 隐藏并锁定一个属性 */
export declare function lock(obj: any, prop: string): void;
export declare function unlock(obj: any, prop: string): void;
/** 隐藏一个属性 */
export declare function hide(obj: any, prop: string): void;
