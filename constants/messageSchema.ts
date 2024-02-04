import { z } from "zod";

const IndividualMessageSchema = z.object({
	id: z.string(),
	sentAt: z.date(),
	message: z.string(),
	chatId: z.string(),
	senderId: z.number(),
	recipientId: z.number(),
	viewed: z.boolean(),
	receivedAt: z.date().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

const userSchema = z.object({
	id: z.number(),
	email: z.string().email(), // Ensure a valid email format
	username: z.string(),
});

export const OutputTemplate = z.object({
	success: z.boolean(),
	message: z.string(),
});

export const SendMessageInput = z.object({
	message: z.string(),
	chatId: z.string(),
	senderId: z.number(),
	recipientId: z.number(),
});

export const MessageSchema = z.object({
	id: z.string(),
	sentAt: z.date(),
	message: z.string(),
	chatId: z.string(),
	senderId: z.number(),
	recipientId: z.number(),
	viewed: z.boolean(),
	receivedAt: z.date().nullable().default(null),
});

export const SendMessageOutput = z.object({
	success: z.boolean(),
	message: z.string(),
	chat: IndividualMessageSchema.optional(),
});

export const LoadChatInput = z.object({ recipientId: z.number() });

export const LoadChatOutput = z.object({
	success: z.boolean(),
	message: z.string(),
	chatId: z.string().optional(),
	messages: z.optional(z.array(MessageSchema)),
});

export const AllChatOutput = z.object({
	chats: z
		.array(
			z.object({
				user: userSchema,
				id: z.string(),
				createdAt: z.date(),
				updatedAt: z.date(),
			})
		)
		.nullable(),
});

export interface ProcessedChat {
	user: {
		id: number;
		email: string;
		username: string;
	};
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

export type Message = z.TypeOf<typeof MessageSchema>;
