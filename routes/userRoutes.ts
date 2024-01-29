import { isExpressRequest } from "../context";
import { trpc } from "../trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { PrismaClient, User } from "@prisma/client";
import { observable } from "@trpc/server/observable";
import { isAuthenticatedUser } from "./middlewares";
import { authTokenType, extractToken } from "../utils/extractToken";
import { redis } from "../redis";
import { eventEmitter } from "../constants/events";
import {
	AuthOutput,
	OnlineUsersOutput,
	UserLoginObject,
	UserRegisterObject,
	UserTypeObject,
} from "../constants/userTypes";

const prisma = new PrismaClient();

const authSecret = "somesecretkey";

export const userRouter = trpc.router({
	register: trpc.procedure
		.input(UserRegisterObject)
		.output(AuthOutput)
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
					const v = await redis.sadd("users:online", user.id);

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
		.input(UserLoginObject)
		.output(AuthOutput)
		.mutation(async ({ ctx, input }) => {
			const { username, password, withUsername } = input;
			try {
				if (isExpressRequest(ctx)) {
					let user: User | null = null;
					if (withUsername)
						user = await prisma.user.findFirst({
							where: {
								username,
							},
						});
					else
						user = await prisma.user.findFirst({
							where: {
								email: username,
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
				if (!user) throw new Error();
				redis.sismember("users:online", user.id, (err, isOnline) => {
					if (err || isOnline === 0) {
						redis.sadd("users:online", user.id);
					}
				});
				return { success: true, message: "Veification success", username: user.username, userId: user.id };
			}
		} catch (e) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Verification failure!",
			});
		}
	}),

	logout: trpc.procedure.output(AuthOutput).mutation(({ ctx }) => {
		if (isExpressRequest(ctx)) {
			try {
				const token = ctx.req.cookies.token;
				const payload = extractToken(token, "auth") as authTokenType;
				redis.srem("users:online", payload.id);
				ctx.res.clearCookie("token");

				return { success: true, message: "Logout success!" };
			} catch (error) {
				return { success: false, message: "Logout failure!" };
			}
		} else {
			return { success: false, message: "Unauthorized request!" };
		}
	}),

	secretInfo: isAuthenticatedUser.query(({ ctx }) => {
		return { success: true, message: "This is top secret" };
	}),

	update: trpc.procedure.subscription(() => {
		return observable<string>((emit) => {
			eventEmitter.on("update", emit.next);
			return () => {
				eventEmitter.off("update", emit.next);
			};
		});
	}),

	getOnlineUsers: isAuthenticatedUser.output(OnlineUsersOutput).query(async ({ ctx }) => {
		// return observable<{ username: string, userId: number }[]>((emit) => {
		//     try {
		//         function onlineUsers(data: { username: string; userId: number }[]) {

		//         }
		//     } catch (error) {

		//     }
		// })
		const user = ctx.req.body.user as User;
		const onlineUsers = await redis.smembers("users:online", async (err, onlineUsers) => {
			if (err) {
				return { success: false, message: "Failed to get online users!" };
			} else {
				return onlineUsers;
			}
		});
		if (onlineUsers && onlineUsers.length > 0) {
			try {
				const userIds: number[] = Array.from(onlineUsers, (x) => +x);
				const users = await prisma.user.findMany({
					where: {
						id: { in: userIds, not: user.id },
					},
				});
				prisma.individualMessage.updateMany({
					where: {
						recipientId: user.id,
					},
					data: {
						receivedAt: new Date(),
					},
				});
				return { success: true, message: "Successfully got online users!", users };
			} catch (e) {
				return { success: false, message: "Failed to get online users!" };
			}
		}
		return { success: false, message: "Failed to get online users!" };
	}),
});
