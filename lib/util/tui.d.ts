import * as inquirer from "@inquirer/prompts";
/** 不显示提示的读取输入 */
export declare function readLine(): Promise<Buffer<ArrayBufferLike>>;
/** 显示一个按回车键继续的提示 */
export declare function sendEnter(message?: string): Promise<void>;
/** 显示一个返回和退出的选项框 */
export declare function sendInfo(message?: string): Promise<void>;
/** 清除上一行 */
export declare function clearLine(): void;
export type inquirerSelect<T> = Exclude<Parameters<typeof inquirer.select<T>>[0]["choices"][0], string>[];
/**
 * 选项框标序
 * @param value 数值或[数值, 名称] 数组
 * @param desc 描述数组
 */
export declare function selectArray<T>(value: (readonly [T, string])[], desc?: string[]): {
	name: string;
	value: T;
	description?: string;
}[];
export declare function selectArray<T>(value: T[], desc?: string[]): {
	name: string;
	value: T;
	description?: string;
}[];
/**
 * 读取zstd文本并使用less显示
 * @param file 文件路径
 */
export declare function lessZstd(file: string): Promise<void>;
/**
 * 读取文本并使用less显示
 * @param file 文件路径
 * @param follow 是否跟踪更新
 */
export declare function less(file: string, follow: boolean): Promise<void>;
