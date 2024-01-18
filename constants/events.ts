import { EventEmitter } from "stream";

export enum Events {
	SEND_MESSAGE = "SEND_MESSAGE",
}

export const eventEmitter = new EventEmitter();
