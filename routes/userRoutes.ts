import { isExpressRequest } from "../context";
import { userModel } from "../models/user";
import { trpc } from "../trpc";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// const isExpress = (x: any): x is CreateExpressContextOptions =>
const authSecret = "somesecretkey";

const userTypeObject = z.object({ username: z.string(), password: z.string(), email: z.string() });

interface tokenType {
	username: string;
	id: number;
}

const isAuthenticatedUserMiddleware = trpc.middleware(async ({ ctx, next }) => {
	try {
		if (isExpressRequest(ctx)) {
			const payload = jwt.verify(ctx.req.cookies.token, authSecret) as tokenType;
			const user = await prisma.user.findFirst({ where: { id: payload.id } });
			if (!user) throw new Error();
			return next({ ctx });
		}
		throw new Error();
	} catch (e) {
		console.log(e);
		throw new TRPCError({
			code: "UNAUTHORIZED",
		});
	}
});

const isAuthenticatedUser = trpc.procedure.use(isAuthenticatedUserMiddleware);

export const userRouter = trpc.router({
	register: trpc.procedure
		.input(userTypeObject)
		.output(z.object({ success: z.boolean(), message: z.string(), username: z.optional(z.string()) }))
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
					return { success: true, message: "User created successfully!", username: user.username };
				}
			} catch (e) {
				console.log(e);
				return { success: false, message: "Error occured" };
			}
			return { success: false, message: "Request not valid" };
		}),

	login: trpc.procedure
		.input(z.object({ username: z.string(), password: z.string() }))
		.output(z.object({ success: z.boolean(), message: z.string(), username: z.optional(z.string()) }))
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
						return { success: true, message: "Login success", username: user.username };
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
				const payload = jwt.verify(ctx.req.cookies.token, authSecret) as tokenType;
				const user = await prisma.user.findFirst({ where: { id: payload.id } });
				if (!user) throw new Error();
				return { success: true, message: "Veification success", username: user.username };
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
			return { success: true, message: "Logout success!" };
		} catch (error) {
			return { success: false, message: "Logout failure!" };
		}
	}),

	secretInfo: isAuthenticatedUser.query(({ ctx }) => {
		return { success: true, message: "This is top secret" };
	}),
});
