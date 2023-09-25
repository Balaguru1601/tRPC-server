import { isExpressRequest } from "../context";
import { userModel } from "../models/user";
import { trpc } from "../trpc";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";

// const isExpress = (x: any): x is CreateExpressContextOptions =>

const userTypeObject = z.object({ username: z.string(), password: z.string(), email: z.string() });

interface tokenType {
	username: string;
	id: string;
}

const isAuthenticatedUserMiddleware = trpc.middleware(({ ctx, next }) => {
	try {
		if (isExpressRequest(ctx)) {
			const payload = jwt.verify(ctx.req.cookies("token"), "somesecretkey") as tokenType;
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
		.output(z.object({ success: z.boolean(), message: z.string(), user: z.optional(userTypeObject) }))
		.mutation(async ({ ctx, input }) => {
			try {
				if (isExpressRequest(ctx)) {
					const { username, password, email } = input;
					const existingUser = await userModel.findOne({ username });
					if (existingUser) {
						const token = jwt.sign(
							{ id: existingUser._id, username: existingUser.username },
							"somesecretkey",
							{
								expiresIn: 12 * 60 * 60 * 1000,
							}
						);
						ctx.res.cookie("token", token);
						return { success: true, message: "User already exists!", user: existingUser };
					}
					const hashedPassword = await bcrypt.hash(password, "usethisassalt");
					const user = new userModel({
						username,
						email,
						password: hashedPassword,
					});
					await user.save();
					return { success: true, message: "User created successfully!", user: user };
				}
			} catch (e) {
				return { success: false, message: "Error occured" };
			}
			return { success: false, message: "Request not valid" };
		}),
	verify: trpc.procedure
		.input(z.object({ username: z.string(), password: z.string() }))
		.output(z.object({ success: z.boolean(), message: z.string(), user: z.optional(userTypeObject) }))
		.mutation(async ({ ctx, input }) => {
			const { username, password } = input;
			try {
				const user = await userModel.findOne({ username });
				if (user?.password === password) return { success: true, message: "Verification success", user: user };
				console.log("in");
				if (isExpressRequest(ctx)) {
					ctx.res.cookie("test", "some test value cookie");
					console.log("cookie set");
				}
				throw new Error("failure");
			} catch (e) {
				return { success: false, message: "Verification failure" };
			}
		}),
	secretInfo: isAuthenticatedUser.mutation(({ ctx }) => {
		return { success: true, message: "This is top secret" };
	}),
});
