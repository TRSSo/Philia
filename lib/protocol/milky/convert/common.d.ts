import type * as Milky from "../type/index.js";
export declare enum MessageScene {
	friend = 0,
	group = 1,
	temp = 2
}
export declare function encodeMessageID(message_scene: Milky.Struct.IncomingMessage["message_scene"], peer_id: Milky.Struct.IncomingMessage["peer_id"], message_seq: Milky.Struct.IncomingMessage["message_seq"]): string;
export declare function decodeMessageID(id: string): {
	message_scene: Milky.Struct.IncomingMessage["message_scene"];
	peer_id: Milky.Struct.IncomingMessage["peer_id"];
	message_seq: Milky.Struct.IncomingMessage["message_seq"];
};
export declare const enum FileScene {
	Resource = 0,
	Private = 1,
	Group = 2
}
export declare function encodeFileID(scene: FileScene, id: string, peer_id?: number): string;
export declare function decodeFileID(file_id: string): {
	scene: FileScene;
	id: string;
	peer_id?: number;
};
export declare const enum RequestScene {
	Friend = 0,
	Group = 1,
	GroupInvitation = 2
}
export declare function encodeRequestID(scene: RequestScene, id: string): string;
export declare function decodeRequestID(id: string): {
	scene: RequestScene;
	id: string;
};
