import { z } from "zod";

export const UserObject = z.object({ username: z.string(), password: z.string(), email: z.string(), id: z.number() });

export const UserRegisterObject = z.object({ username: z.string(), password: z.string(), email: z.string() });

export const UserLoginObject = z.object({
	username: z.string(),
	password: z.string(),
	email: z.string(),
	withUsername: z.boolean().default(false),
});

export type UserTypeObject = z.TypeOf<typeof UserObject>;

export type UserRegisterInput = z.TypeOf<typeof UserRegisterObject>;

export type UserLoginInput = z.TypeOf<typeof UserLoginObject>;

export const AuthOutput = z.object({
	success: z.boolean(),
	message: z.string(),
	username: z.optional(z.string()),
	userId: z.optional(z.number()),
});

export const OnlineUsersOutput = z.object({
	success: z.boolean(),
	message: z.string(),
	users: z.optional(
		z.array(
			z.object({
				username: z.string(),
				id: z.number(),
			})
		)
	),
});

export type AuthOutputType = z.TypeOf<typeof AuthOutput>;
