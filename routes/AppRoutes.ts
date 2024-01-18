import { trpc } from "../trpc";
import { z } from "zod";
import { userRouter } from "./userRoutes";
import { messageRouter } from "./messageRoutes";

export const appRouter = trpc.router({
	greeting: trpc.procedure.query(() => "Hello user!"),
	logger: trpc.procedure.input(z.object({ name: z.string() })).mutation((req) => {
		console.log(req.input.name);
		return true;
	}),
	user: userRouter,
	message: messageRouter,
});

export type AppRouter = typeof appRouter;
