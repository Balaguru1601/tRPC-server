import { z } from "zod";
import { trpc } from "../trpc";
import { Message, MessageSchema, SendMessageSchema } from "../constants/messageSchema";
import { isExpressRequest } from "../context";
import { isAuthenticatedUser, isWsRequest } from "./middlewares";
import { authTokenType, extractToken } from "../utils/extractToken";
import { randomUUID } from "crypto";
import { Events, eventEmitter } from "../constants/events";
import { observable } from "@trpc/server/observable";

export const messageRouter = trpc.router({
	sendMessage: isAuthenticatedUser
		.input(SendMessageSchema)
		.output(
			z.object({
				success: z.boolean(),
				message: z.string(),
				chat: z.optional(MessageSchema),
			})
		)
		.mutation(({ ctx, input }) => {
			try {
				const payload = extractToken(ctx.req.cookies.token, "auth") as authTokenType;
				const message: Message = {
					...input,
					sentAt: new Date(),
					senderId: payload.id,
					chatId: input.chatId ? input.chatId : randomUUID(),
					id: randomUUID(),
					viewed: false,
				};
				eventEmitter.emit(Events.SEND_MESSAGE, message);
				return { success: true, message: "Message sent", chat: message };
			} catch (error) {
				console.log(error);
				return { success: false, message: "Something went wrong!" };
			}
		}),

	onSendMessage: isWsRequest.input(z.object({ chatId: z.string() })).subscription(({ ctx, input }) => {
		return observable<Message>((emit) => {
			try {
				const onMessage = (data: Message) => {
					if (input.chatId === data.chatId) emit.next(data);
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
