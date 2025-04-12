// socketHandlers.ts
import { Socket, Server } from "socket.io";
import { EventTypes } from "../constants/events"; // adjust path
import { getSocketId, getOnlineUsers } from "../redis"; // adjust path
import { Message } from "../constants/messageSchema"; // adjust path
import { prisma } from "..";

export const registerSocketEvents = (io: Server, socket: Socket) => {
	// Message sending logic
	socket.on(EventTypes.SEND_MESSAGE, async (message: Message) => {
		console.log("Message received:", message);
		const receiverSocketId = await getSocketId(message.recipientId);
		if (receiverSocketId) {
			io.to(receiverSocketId).emit(EventTypes.SEND_MESSAGE, message);
		}
	});

	// Online users logic
	socket.on(EventTypes.GET_ONLINE_USERS, async (userId: number) => {
		const socketId = await getSocketId(userId);
		const userIds = await getOnlineUsers();
		if (socketId) {
			io.to(socketId).emit(EventTypes.GET_ONLINE_USERS, userIds);
		}
	});

	// Handle deleting messages
	// socket.on(EventTypes.DETELE_MESSAGE, async (messageId: string,all: boolean) => {
	//     // Logic to delete the message from the database
	//     // For example, using Prisma:
	//     const message = await prisma.individualMessage.findUnique({
	//         where: { id: messageId },
	//     });

	//     const deletedMsg = await prisma.individualMessage.update({
	//         where: { id: messageId },
	//         data: { deletedBy: socket.handshake.auth.id, deletedAt: new Date(), deletionScope: message && message.senderId == socket.handshake.auth.id  && all ? "ALL" : "SELF" },
	//     });

	//     if (all) {
	//         const socketId = await getSocketId(deletedMsg.deletedBy == deletedMsg.senderId ? deletedMsg.recipientId : deletedMsg.senderId);
	//         if(socketId)
	//         // Notify the sender about the deletion
	//         io.to(socketId).emit(EventTypes.DETELE_MESSAGE, {
	//             success: true,
	//             message: deletedMsg,
	//         });
	//     }
	// });
};
