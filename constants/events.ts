import { EventEmitter } from "stream";

export enum Events {
	SEND_MESSAGE = "SEND_MESSAGE",
	GET_ONLINE_USERS = "GET_ONLINE_USERS",
}

export const eventEmitter = new EventEmitter();
