import { Server } from "socket.io";
import { addSocketId, getOnlineUsers, getSocketId, removeSocketId, removeUser } from "./redis";
import { EventTypes } from "./constants/events";
import { Message } from "./constants/messageSchema";

export const ioServer = require("http").createServer();

export const io = new Server(ioServer, {
	cors: {
		origin: "http://localhost:3000",
	},
});

io.on("connection", (socket) => {
	console.log(socket.handshake.auth.id);
	console.log(socket.id);

	addSocketId(+socket.handshake.auth.id, socket.id);

	// Doing the socket.on so that event is created for each socket connection
	socket.on("disconnect", () => {
		console.log("➖➖ Disconnect");
		removeUser(+socket.handshake.auth.id);
		removeSocketId(+socket.handshake.auth.id);
	});

	console.log(`➕➕ Connection (${io.engine.clientsCount})`);
	socket.on(EventTypes.SEND_MESSAGE, async (message: Message) => {
		console.log("Message received:", message);

		const receiverSocketId = await getSocketId(message.recipientId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit(EventTypes.SEND_MESSAGE, message);
		}
	});

	socket.on(EventTypes.GET_ONLINE_USERS, async (userId: number) => {
		const socketId = await getSocketId(userId);
		const userIds = await getOnlineUsers();
		if (socketId) {
			io.to(socketId).emit(EventTypes.GET_ONLINE_USERS, userIds);
		}
	});
	io.once("close", () => {
		console.log(`➖➖ Connection (${io.engine.clientsCount})`);
	});
});

io.on("disconnect", (socket) => {
	console.log("➖➖ Disconnect");
	removeUser(+socket.handshake.auth.id);
	removeSocketId(+socket.handshake.auth.id);
});
