import { EventEmitter } from "stream";

export const EventTypes = {
	SEND_MESSAGE: "SEND_MESSAGE",
	GET_ONLINE_USERS: "GET_ONLINE_USERS",
	DETELE_MESSAGE: "DETELE_MESSAGE",
};

// TODO - broadcast online
// TODO - mark read

export const eventEmitter = new EventEmitter();
