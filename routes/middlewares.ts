import { isExpressRequest, isWSRequest } from "../context";
import { trpc } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";
import { EventEmitter } from "stream";
import { authTokenType, extractToken } from "../utils/extractToken";

const prisma = new PrismaClient();

const userTypeObject = z.object({ username: z.string(), password: z.string(), email: z.string() });

const isAuthenticatedUserMiddleware = trpc.middleware(async ({ ctx, next }) => {
	try {
		if (isExpressRequest(ctx)) {
			const token = ctx.req.cookies.token;
			if (!token) throw new Error();
			const payload = extractToken(ctx.req.cookies.token, "auth") as authTokenType;
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
		// return {success: false}
	}
});

const wsRequestMiddleware = trpc.middleware(({ ctx, next }) => {
	try {
		if (isWSRequest(ctx)) return next({ ctx });
		else
			throw new TRPCError({
				code: "UNAUTHORIZED",
			});
	} catch (e) {
		console.log(e);
		throw new TRPCError({
			code: "UNAUTHORIZED",
		});
	}
});

export const isAuthenticatedUser = trpc.procedure.use(isAuthenticatedUserMiddleware);
export const isWsRequest = trpc.procedure.use(wsRequestMiddleware);
