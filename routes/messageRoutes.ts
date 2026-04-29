import { trpc } from "../trpc";
import {
	AllChatOutput,
	LoadChatInput,
	LoadChatOutput,
	Message,
	OutputTemplate,
	ProcessedChat,
	SendMessageInput,
	SendMessageOutput,
	createChatInput,
	createChatOutput,
	deleteMessageInput,
	deleteMessageOutput,
	editMessageInput,
	editMessageOutput,
} from "../constants/messageSchema";
import { isAuthenticatedUser, isWsRequest } from "./middlewares";
import { EventTypes, eventEmitter } from "../constants/events";
import { observable } from "@trpc/server/observable";
import { getOnlineUsers, getSocketId, isUserOnline } from "../redis";
import { prisma } from "..";
import { EventEmitter } from "stream";
import { io } from "../socket";

export const messageRouter = trpc.router({
	sendIndividualMessage: isAuthenticatedUser
		.input(SendMessageInput)
		.output(SendMessageOutput)
		.mutation(async ({ ctx, input }) => {
			try {
				const user = ctx.user;
				const message: {
					message: string;
					chatId: string;
					senderId: number;
					recipientId: number;
					sentAt: string;
					viewed: boolean;
					receivedAt?: string;
				} = {
					...input,
					sentAt: input.sentAt ?? new Date().toISOString(),
					senderId: user.id,
					viewed: false,
				};
				const isReceiverOnline = await isUserOnline(message.recipientId);
				if (isReceiverOnline) {
					message.receivedAt = new Date().toISOString();
				}
				const savedMessage = await prisma.individualMessage.create({
					data: {
						...message,
					},
				});

				const msg: Message = {
					...savedMessage,
					deletedAt: savedMessage.deletedAt ? savedMessage.deletedAt.toISOString() : null,
					sentAt: savedMessage.sentAt.toISOString(),
					receivedAt: savedMessage.receivedAt
						? savedMessage.receivedAt.toISOString()
						: null,
					editedAt: savedMessage.editedAt ? savedMessage.editedAt.toISOString() : null,
				};
				if (isReceiverOnline) {
					// eventEmitter.emit(Events.SEND_MESSAGE, savedMessage);
					const socketId = await getSocketId(message.recipientId);
					if (socketId) io.to(socketId).emit(EventTypes.SEND_MESSAGE, msg);
				}
				return { success: true, message: "Message sent", chat: msg };
			} catch (error) {
				console.log(error);
				return { success: false, message: "Something went wrong!" };
			}
		}),

	createChat: isAuthenticatedUser
		.input(createChatInput)
		.output(createChatOutput)
		.mutation(async ({ ctx, input }) => {
			try {
				const user = ctx.user;
				const chat = await prisma.individualChat.findFirst({
					where: {
						AND: [{ Users: { every: { id: { in: [user.id, input.recipientId] } } } }],
					},
				});
				if (chat)
					return {
						message: "Chat exists",
						success: true,
						chatId: chat.id,
						recipientId: input.recipientId,
					};
				const newChat = await prisma.individualChat.create({
					data: {
						Users: { connect: [{ id: user.id }, { id: input.recipientId }] },
					},
				});
				return {
					success: true,
					message: "Chat created!",
					chatId: newChat.id,
					recipientId: input.recipientId,
				};
			} catch (error) {
				console.log("create chat -->", error);
				return { success: false, message: "Something went wrong!" };
			}
		}),

	loadIndividualChat: isAuthenticatedUser
		.input(LoadChatInput)
		.output(LoadChatOutput)
		.mutation(async ({ ctx, input }) => {
			try {
				const user = ctx.user;
				const recipient = await prisma.user.findFirst({
					where: { id: input.recipientId },
				});
				if (!recipient) return { success: false, message: "No user found" };
				const chat = await prisma.individualChat.findFirst({
					where: {
						AND: [{ Users: { every: { id: { in: [user.id, input.recipientId] } } } }],
					},
				});
				if (chat) {
					const messages: { date: Date; messages: Message[] }[] = await prisma.$queryRaw`
                        SELECT
                        DATE_TRUNC('day', ("sentAt" AT TIME ZONE 'Z')) AS date,
                        json_agg(messages.* ORDER BY messages."sentAt") AS messages
                        FROM (
                        SELECT
                            id, message, "sentAt", "receivedAt", viewed, "chatId",
                            "senderId", "recipientId", "deletedAt", "deletedBy",
                            "deletionScope", "editedAt"
                        FROM "chatapp_individualmessage"
                        WHERE "chatId" = ${chat.id} AND ("deletedBy" IS NULL OR ("deletedBy" = ${user.id} AND "deletionScope" = 'SELF'))
                        ORDER BY "sentAt"
                        ) messages
                        GROUP BY DATE_TRUNC('day', ("sentAt" AT TIME ZONE 'Z'))
                        ORDER BY date;
                        `;
					// prisma.$queryRawSELECT DATE_TRUNC('day',  ("sentAt" AT TIME ZONE 'Z')) AS date,
					//             json_agg(json_build_object('id',id,'message',message,'sentAt',"sentAt",'receivedAt',"receivedAt",'viewed',
					//             viewed,'chatId',"chatId",'senderId',"senderId",'recipientId',"recipientId",'deletedAt',"deletedAt",
					//             'deletedBy',"deletedBy",'deletionScope',"deletionScope",'editedAt',"editedAt"))
					//             AS messages
					//             FROM "chatapp_individualmessage"
					//             WHERE "chatId" = ${chat.id}
					//             GROUP BY DATE_TRUNC('day',  ("sentAt" AT TIME ZONE 'Z'))
					//             ORDER BY date;
					// console.log("messages", messages);
					return {
						success: true,
						message: "chat id fetched!",
						chatId: chat.id,
						messages,
					};
				}
				return {
					success: false,
					message: "Chat not available",
				};
			} catch (error) {
				console.log("individual chat  -->", error);
				return { success: false, message: "Something went wrong!" };
			}
		}),

	// onSendMessage: isWsRequest.subscription((d) => {
	// 	return observable<Message>((emit) => {
	// 		try {
	// 			const onMessage = (data: Message) => {
	// 				emit.next(data);
	// 			};
	// 			eventEmitter.on(EventTypes.SEND_MESSAGE, onMessage);
	// 			return () => {
	// 				eventEmitter.off(EventTypes.SEND_MESSAGE, onMessage);
	// 			};
	// 		} catch (error) {
	// 			console.log(error);
	// 		}
	// 	});
	// }),

	getAllChats: isAuthenticatedUser.output(AllChatOutput).query(async ({ ctx }) => {
		const userId = ctx.user.id;
		try {
			await prisma.individualMessage.updateMany({
				where: {
					recipientId: userId,
					receivedAt: null,
				},
				data: {
					receivedAt: new Date(),
				},
			});
			const chatsFromDb = await prisma.user.findFirst({
				where: {
					id: userId,
				},
				include: {
					individualChats: {
						include: {
							Users: {
								select: {
									username: true,
									id: true,
									email: true,
								},
							},
						},
					},
				},
			});

			const chats: ProcessedChat[] | null = chatsFromDb
				? chatsFromDb.individualChats.map((item) => {
						const user = item.Users[0].id === userId ? item.Users[1] : item.Users[0];
						return {
							user,
							id: item.id,
							createdAt: item.createdAt,
							updatedAt: item.updatedAt,
						};
				  })
				: null;
			if (chats) return { success: true, message: "Chats fetch success!", chats };
			else return { success: true, message: "No Chats found" };
		} catch (error) {
			console.log(error);
			return { success: false, message: "Something went wrong!" };
		}
	}),

	// TODO - check if you want to implement time limit for deleting messages
	deleteMessage: isAuthenticatedUser
		.input(deleteMessageInput)
		.output(deleteMessageOutput)
		.mutation(async ({ ctx, input }) => {
			try {
				const user = ctx.user;
				const { message, all } = input;
				const msg = await prisma.individualMessage.findUnique({
					where: { id: input.message.id },
				});
				if (msg && msg.deletedBy && msg.deletedBy != user.id) {
					await prisma.individualMessage.delete({
						where: { id: message.id },
					});
				} else {
					const deletedMsg = await prisma.individualMessage.update({
						where: { id: message.id },
						data: {
							deletedBy: user.id,
							deletedAt: new Date(),
							deletionScope: message.senderId == user.id && all ? "ALL" : "SELF",
						},
					});
					// console.log("deleted message", deletedMsg);
					if (all) {
						const socketId = await getSocketId(deletedMsg.recipientId);
						if (socketId)
							io.to(socketId).emit(EventTypes.DETELE_MESSAGE, {
								success: true,
								message: deletedMsg,
							});
					}
				}
				return { success: true, message: "Message deleted!" };
			} catch (error) {
				console.log(error);
				return { success: false, message: "Something went wrong!" };
			}
		}),

	editMessage: isAuthenticatedUser
		.input(editMessageInput)
		.output(editMessageOutput)
		.mutation(async ({ ctx, input }) => {
			try {
				const user = ctx.user;
				const { message, messageId, editedAt } = input;
				const msg = await prisma.individualMessage.findUnique({
					where: { id: messageId },
				});
				if (msg && (msg.deletedBy == user.id || msg.deletionScope == "ALL")) {
					return { success: false, message: "Message not found" };
				} else {
					const savedMsg = await prisma.individualMessage.update({
						where: { id: messageId },
						data: {
							message,
							editedAt,
						},
					});
					const socketId = await getSocketId(msg!.recipientId);
					if (socketId) {
						io.to(socketId).emit(EventTypes.EDIT_MESSAGE, {
							success: true,
							message: savedMsg,
						});
					}
					return { success: true, message: "Message edited!" };
				}
			} catch (error) {
				console.log(error);
				return { success: false, message: "Something went wrong!" };
			}
		}),
});
