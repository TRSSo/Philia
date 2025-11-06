/**
 * 创建配置文件
 * @param name 配置文件名
 * @param config 配置文件默认值
 * @param keep 保持不变的配置
 * @param opts.replacer 配置文本替换函数
 */
export default function makeConfig<T extends object>(name: string, config: T, keep?: Partial<T>, opts?: {
	replacer?(data: string): string | Promise<string>;
}): Promise<{
	config: T;
	configSave(): Promise<void>;
}>;
