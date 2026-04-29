import { Server } from "socket.io";
import { addSocketId, getOnlineUsers, getSocketId, removeSocketId, removeUser } from "./redis";
import { EventTypes } from "./constants/events";
import { Message } from "./constants/messageSchema";
import { registerSocketEvents } from "./routes/socketRoutes";

export const ioServer = require("http").createServer();

export const io = new Server(ioServer, {
	cors: {
		origin: "http://localhost:3000",
	},
});

// TODO - add onmessagedelete and onmessageupdate to update the message in the chat - socket.io
// TODO - add typing to the chat input
// TODO - show online users in the chat - socket.io
// TODO - send online users whenever a user connects or disconnects - socket.io
// TODO - track last seen time of the user - socket.io

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

	registerSocketEvents(io, socket); // Registering socket events for each connection

	io.once("close", () => {
		console.log(`➖➖ Connection (${io.engine.clientsCount})`);
	});
});

io.on("disconnect", (socket) => {
	console.log("➖➖ Disconnect");
	removeUser(+socket.handshake.auth.id);
	removeSocketId(+socket.handshake.auth.id);
});
