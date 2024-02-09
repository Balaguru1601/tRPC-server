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
import { Events, eventEmitter } from "../constants/events";
import { observable } from "@trpc/server/observable";
import { isUserOnline } from "../redis";
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
					sentAt: string;
					viewed: boolean;
					receivedAt?: string;
				} = {
					...input,
					sentAt: new Date().toISOString(),
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
					sentAt: savedMessage.sentAt.toString(),
					receivedAt: savedMessage.receivedAt ? savedMessage.receivedAt.toString() : null,
				};
				if (isReceiverOnline) {
					eventEmitter.emit(Events.SEND_MESSAGE, savedMessage);
				}
				return { success: true, message: "Message sent", chat: msg };
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
					const messages: { date: Date; messages: Message[] }[] =
						await prisma.$queryRaw`SELECT DATE_TRUNC('day',  ("sentAt" AT TIME ZONE 'Z') AT TIME ZONE 'Asia/Kolkata') AS date,
					            json_agg(json_build_object('id',id,'message',message,'sentAt',"sentAt",'receivedAt',"receivedAt",'viewed',viewed,'chatId',"chatId",'senderId',"senderId",'recipientId',"recipientId")) AS messages
					            FROM "chatapp_individualmessage"
					            GROUP BY DATE_TRUNC('day',  ("sentAt" AT TIME ZONE 'Z') AT TIME ZONE 'Asia/Kolkata')
					            ORDER BY date;`;
					return {
						success: true,
						message: "chat id fetched!",
						chatId: chat.id,
						messages,
					};
				}
				const newChat = await prisma.individualChat.create({
					data: {
						Users: { connect: [recipient, user] },
					},
				});
				return {
					success: true,
					message: "Chat created!",
					chatId: newChat.id,
					messages: [],
				};
			} catch (error) {
				console.log(error);
				return { success: false, message: "Something went wrong!" };
			}
		}),

	onSendMessage: isWsRequest.subscription(() => {
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
});
