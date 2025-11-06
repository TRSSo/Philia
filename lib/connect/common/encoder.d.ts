export interface IEncoder<T> {
	encode(data: T): Buffer;
	decode(data: Buffer): T;
}
export declare const encoder: Map<string, IEncoder<any>>;
export declare const verify: Map<string, IEncoder<Buffer<ArrayBufferLike>>>;
export declare const cryptoHash: (algo: string, length: number) => IEncoder<Buffer>;
export declare const compress: Map<string, IEncoder<Buffer<ArrayBufferLike>>>;
interface Encoders {
	encode: string[];
	verify: string[];
}
export declare class Encoder {
	encoder: IEncoder<any>;
	verify: IEncoder<Buffer>;
	encode: (data: any) => Buffer<ArrayBufferLike>;
	decode: (data: Buffer) => any;
	constructor();
	constructor(local: Encoders, remote: Encoders);
}
export {};
