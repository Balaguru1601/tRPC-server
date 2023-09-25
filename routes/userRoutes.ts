import { isExpressRequest } from "../context";
import { userModel } from "../models/user";
import { trpc } from "../trpc";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { z } from "zod";

// const isExpress = (x: any): x is CreateExpressContextOptions =>

const userTypeObject = z.object({ username: z.string(), password: z.string(), email: z.string() });

export const userRouter = trpc.router({
	register: trpc.procedure
		.input(userTypeObject)
		.output(z.object({ success: z.boolean(), message: z.string(), user: z.optional(userTypeObject) }))
		.mutation(async ({ ctx, input }) => {
			try {
				const { username, password, email } = input;
				const existingUser = await userModel.findOne({ username });
				if (!existingUser) {
					const user = new userModel({
						username,
						email,
						password,
					});
					await user.save();
					if (isExpressRequest(ctx)) {
						ctx.res.cookie("test", "some test value cookie");
						console.log("cookie set");
					}
					return { success: true, message: "User created successfully!", user: user };
				}
				if (isExpressRequest(ctx)) {
					ctx.res.cookie("test", "some test value cookie");
					console.log(ctx.req.cookies);
				}
				return { success: true, message: "User created successfully!", user: existingUser };
			} catch (e) {
				return { success: false, message: "User not created" };
			}
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
});
