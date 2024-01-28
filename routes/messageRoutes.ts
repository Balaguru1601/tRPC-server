import { z } from "zod";
import { trpc } from "../trpc";
import {
	LoadChatInput,
	LoadChatOutput,
	Message,
	MessageSchema,
	SendMessageInput,
	SendMessageOutput,
} from "../constants/messageSchema";
import { isExpressRequest } from "../context";
import { isAuthenticatedUser, isWsRequest } from "./middlewares";
import { authTokenType, extractToken } from "../utils/extractToken";
import { randomUUID } from "crypto";
import { Events, eventEmitter } from "../constants/events";
import { observable } from "@trpc/server/observable";
import { redis } from "../redis";

import { User } from "@prisma/client";
import { prisma } from "..";

export const messageRouter = trpc.router({
	sendIndividualMessage: isAuthenticatedUser
		.input(SendMessageInput)
		.output(SendMessageOutput)
		.mutation(async ({ ctx, input }) => {
			try {
				const user = ctx.req.body.user as User;
				const message: Message = {
					...input,
					sentAt: new Date(),
					senderId: user.id,
					viewed: false,
				};
				const isReceiverOnline = await redis.sismember("users:online", message.recipientId);
				if (isReceiverOnline) {
					message.receivedAt = new Date();
					eventEmitter.emit(Events.SEND_MESSAGE, message);
				}
				// store message in db here
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
		.query(async ({ ctx, input }) => {
			try {
				const user = ctx.req.body.user as User;
				const recipient = await prisma.user.findFirst({
					where: { id: input.recipientId },
				});
				if (!recipient) return { success: false, message: "No user found" };
				const chat = await prisma.individualChat.findFirst({
					where: {
						AND: [
							// { users: { some: { id: user1Id } } }, // Check if user1 is a participant
							// { users: { some: { id: user2Id } } },
							{ Users: { every: { id: { in: [user.id, input.recipientId] } } } },
						],
					},
				});
				if (chat) return { success: true, message: "chat id fetched!" };
				const newChat = await prisma.individualChat.create({
					data: {
						Users: { create: [recipient, user] },
					},
				});
				return { success: true, message: "Chat created!", chatId: newChat.id };
			} catch (error) {
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
});
