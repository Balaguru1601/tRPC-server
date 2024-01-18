import { isExpressRequest } from "../context";
import { trpc } from "../trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import { isAuthenticatedUser } from "./middlewares";
import { authTokenType, extractToken } from "../utils/extractToken";
import { redis } from "../redis";
import { eventEmitter } from "../constants/events";

const prisma = new PrismaClient();

const authSecret = "somesecretkey";

const userTypeObject = z.object({ username: z.string(), password: z.string(), email: z.string() });

const authOutputSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	username: z.optional(z.string()),
	userId: z.optional(z.number()),
});

export const userRouter = trpc.router({
	register: trpc.procedure
		.input(userTypeObject)
		.output(authOutputSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				if (isExpressRequest(ctx)) {
					const { username, password, email } = input;

					const existingUsername = await prisma.user.findFirst({
						where: {
							username,
						},
					});
					if (existingUsername) return { success: false, message: "Username already exists!" };

					const existingEmail = await prisma.user.findFirst({
						where: { email },
					});
					if (existingEmail) return { success: false, message: "Email already exists!" };

					const hashedPassword = await bcrypt.hash(password, 12);
					const user = await prisma.user.create({
						data: {
							username,
							email,
							password: hashedPassword,
						},
					});
					const token = jwt.sign({ id: user.id, username: user.username }, authSecret, {
						expiresIn: 12 * 60 * 60 * 1000,
					});
					ctx.res.cookie("token", token);
					// await redis.sadd<number>("users:online", user.id);
					redis.sadd("users:online", user.id);
					return {
						success: true,
						message: "User created successfully!",
						username: user.username,
						userId: user.id,
					};
				}
			} catch (e) {
				console.log(e);
				return { success: false, message: "Error occured" };
			}
			return { success: false, message: "Request not valid" };
		}),

	login: trpc.procedure
		.input(z.object({ username: z.string(), password: z.string() }))
		.output(authOutputSchema)
		.mutation(async ({ ctx, input }) => {
			const { username, password } = input;
			try {
				if (isExpressRequest(ctx)) {
					const user = await prisma.user.findFirst({
						where: {
							username,
						},
					});
					if (!user) {
						return { success: false, message: "User does not exist" };
					}

					const verification = await bcrypt.compare(password, user.password);
					if (user && verification) {
						const token = jwt.sign({ id: user.id, username: user.username }, authSecret, {
							expiresIn: 12 * 60 * 60 * 1000,
						});
						ctx.res.cookie("token", token);
						redis.sadd("users:online", user.id);
						return { success: true, message: "Login success", username: user.username, userId: user.id };
					}
				}
				throw new Error();
			} catch (e) {
				return { success: false, message: "Login failure! Check credentials." };
			}
		}),

	verify: trpc.procedure.query(async ({ ctx }) => {
		try {
			if (isExpressRequest(ctx)) {
				const payload = extractToken(ctx.req.cookies.token, "auth") as authTokenType;
				const user = await prisma.user.findFirst({ where: { id: payload.id } });
				if (payload.id) redis.srem("users:online", payload.id);
				if (!user) throw new Error();
				return { success: true, message: "Veification success", username: user.username, userId: user.id };
			}
		} catch (e) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Verification failure!",
			});
		}
	}),

	logout: isAuthenticatedUser.mutation(({ ctx }) => {
		try {
			ctx.res.clearCookie("token");
			const payload = extractToken(ctx.req.cookies.token, "auth") as authTokenType;
			redis.srem("users:online", payload.id);

			return { success: true, message: "Logout success!" };
		} catch (error) {
			return { success: false, message: "Logout failure!" };
		}
	}),

	secretInfo: isAuthenticatedUser.query(({ ctx }) => {
		return { success: true, message: "This is top secret" };
	}),

	update: trpc.procedure.subscription(() => {
		return observable<string>((emit) => {
			console.log("emit");
			eventEmitter.on("update", emit.next);
			return () => {
				eventEmitter.off("update", emit.next);
			};
		});
	}),

	getOnlineUsers: isAuthenticatedUser
		.output(
			z.object({
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
			})
		)
		.query(async () => {
			await redis.smembers("users:online", (err, onlineUsers) => {
				if (err) {
					return { success: false, message: "Failed to get online users!" };
				} else {
					if (onlineUsers && onlineUsers.length > 0) {
						// onlineUsers.
						// const array: number[] = [...onlineUsers]
						// const users = await prisma.user.findMany({
						//     where: {
						//     id: {in: onlineUsers }
						// }})
						console.log(onlineUsers);
						return { success: true, message: "Failed to get online users!" };
					}
				}
				return { success: false, message: "Failed to get online users!" };
			});
			return { success: false, message: "Failed to get online users!" };
		}),
});
