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

export const SendMessageInput = z.object({
	message: z.string(),
	chatId: z.string(),
	senderId: z.number(),
	recipientId: z.number(),
});

export const MessageSchema = z.object({
	id: z.optional(z.string()),
	sentAt: z.date(),
	message: z.string(),
	chatId: z.string(),
	senderId: z.number(),
	recipientId: z.number(),
	viewed: z.boolean().default(false),
	receivedAt: z.date().optional(),
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
});

export type Message = z.TypeOf<typeof MessageSchema>;
