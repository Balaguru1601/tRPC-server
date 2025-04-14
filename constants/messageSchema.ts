import { z } from "zod";

const IndividualMessageSchema = z.object({
	id: z.string(),
	sentAt: z.string(),
	message: z.string(),
	chatId: z.string(),
	senderId: z.number(),
	recipientId: z.number(),
	viewed: z.boolean(),
	receivedAt: z.string().nullable(),
});

const userSchema = z.object({
	id: z.number(),
	email: z.string(), // Ensure a valid email format
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

export const createChatInput = z.object({
	recipientId: z.number(),
});

export const createChatOutput = z.object({
	recipientId: z.number().optional(),
	chatId: z.string().optional(),
	message: z.string(),
	success: z.boolean(),
});

export const MessageSchema = z.object({
	id: z.string(),
	sentAt: z.string(),
	message: z.string(),
	chatId: z.string(),
	senderId: z.number(),
	recipientId: z.number(),
	viewed: z.boolean(),
	receivedAt: z.string().nullable().default(null),
	deletedBy: z.number().nullable().default(null),
	deletedAt: z.string().nullable().default(null),
	deletionScope: z.enum(["ALL", "SELF"]).nullable().default(null),
	editedAt: z.string().nullable().default(null),
});

export const SendMessageOutput = z.object({
	success: z.boolean(),
	message: z.string(),
	chat: MessageSchema.optional(),
});

export const LoadChatInput = z.object({ recipientId: z.number() });

export const LoadChatOutput = z.object({
	success: z.boolean(),
	message: z.string(),
	chatId: z.string().optional(),
	messages: z.optional(z.array(z.object({ messages: z.array(MessageSchema), date: z.date() }))),
});

export const AllChatOutput = z.object({
	success: z.boolean(),
	message: z.string(),
	chats: z
		.array(
			z.object({
				user: userSchema,
				id: z.string(),
				createdAt: z.date(),
				updatedAt: z.date(),
			})
		)
		.nullable()
		.optional(),
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

export const deleteMessageInput = z.object({
	message: MessageSchema,
	all: z.boolean(),
});

export const deleteMessageOutput = z.object({
	success: z.boolean(),
	message: z.string(),
});

export const editMessageInput = z.object({
	messageId: z.string(),
	message: z.string(),
	editedAt: z.date(),
});

export const editMessageOutput = z.object({
	success: z.boolean(),
	message: z.string(),
});

export type Message = z.TypeOf<typeof MessageSchema>;
