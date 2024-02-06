import { z } from "zod";
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
} from "../constants/messageSchema";
import { isAuthenticatedUser, isWsRequest } from "./middlewares";
import { authTokenType, extractToken } from "../utils/extractToken";
import { Events, eventEmitter } from "../constants/events";
import { observable } from "@trpc/server/observable";
import { onlineUsersKey, redis } from "../redis";

import { User } from "@prisma/client";
import { prisma } from "..";

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
					sentAt: Date;

					viewed: boolean;
					receivedAt?: Date;
				} = {
					...input,
					sentAt: new Date(),
					senderId: user.id,
					viewed: false,
				};
				const isReceiverOnline = await redis.sismember(onlineUsersKey, message.recipientId);
				if (isReceiverOnline) {
					message.receivedAt = new Date();
					eventEmitter.emit(Events.SEND_MESSAGE, message);
				}
				const savedMessage = await prisma.individualMessage.create({
					data: {
						...message,
					},
				});
				return { success: true, message: "Message sent", chat: savedMessage };
			} catch (error) {
				console.log(error);
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
					const messages = await prisma.individualMessage.findMany({ where: { chatId: chat.id } });
					return { success: true, message: "chat id fetched!", chatId: chat.id, messages };
				}
				const newChat = await prisma.individualChat.create({
					data: {
						Users: { connect: [recipient, user] },
					},
				});
				return { success: true, message: "Chat created!", chatId: newChat.id, messages: [] };
			} catch (error) {
				console.log(error);
				return { success: false, message: "Something went wrong!" };
			}
		}),

	onSendMessage: isWsRequest.subscription(({ ctx, input }) => {
		return observable<Message>((emit) => {
			try {
				const onMessage = (data: Message) => {
					emit.next(data);
				};
				eventEmitter.on(Events.SEND_MESSAGE, onMessage);
				return () => {
					eventEmitter.off(Events.SEND_MESSAGE, onMessage);
				};
			} catch (error) {
				console.log(error);
			}
		});
	}),

	getAllChats: isAuthenticatedUser.output(AllChatOutput).query(async ({ ctx }) => {
		const userId = ctx.user.id;
		try {
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
						return { user, id: item.id, createdAt: item.createdAt, updatedAt: item.updatedAt };
				  })
				: null;
			if (chats) return { success: true, message: "Chats fetch success!", chats };
			else return { success: true, message: "No Chats found" };
		} catch (error) {
			console.log(error);
			return { success: false, message: "Something went wrong!" };
		}
	}),
});
