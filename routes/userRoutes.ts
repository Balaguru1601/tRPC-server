import { isExpressRequest } from "../context";
import { userModel } from "../models/user";
import { trpc } from "../trpc";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";

// const isExpress = (x: any): x is CreateExpressContextOptions =>
const authSecret = "somesecretkey";

const userTypeObject = z.object({ username: z.string(), password: z.string(), email: z.string() });

interface tokenType {
	username: string;
	id: string;
}

const isAuthenticatedUserMiddleware = trpc.middleware(({ ctx, next }) => {
	try {
		if (isExpressRequest(ctx)) {
			const payload = jwt.verify(ctx.req.cookies("token"), authSecret) as tokenType;
			const user = userModel.findById(payload.id);
			if (!user) throw new Error();
			ctx.req.session.user = payload;
			return next({ ctx });
		}
		throw new Error();
	} catch (e) {
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
					const existingUser = await userModel.findOne({ username });
					if (existingUser) return { success: false, message: "User already exists!" };
					const hashedPassword = await bcrypt.hash(password, 12);
					const user = new userModel({
						username,
						email,
						password: hashedPassword,
					});
					await user.save();
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
					const user = await userModel.findOne({ username });
					if (!user) {
						return { success: false, message: "User does not exist" };
					}
					const verification = await bcrypt.compare(password, user.password);
					if (user && verification) {
						const token = jwt.sign({ id: user._id, username: user.username }, authSecret, {
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
				const payload = jwt.verify(ctx.req.cookies("token"), authSecret) as tokenType;
				const user = await userModel.findById(payload.id);
				if (!user) throw new Error();
				return { success: true, message: "Veification success", username: user.username };
			}
		} catch (e) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
			});
		}
	}),

	secretInfo: isAuthenticatedUser.mutation(({ ctx }) => {
		return { success: true, message: "This is top secret" };
	}),
});
