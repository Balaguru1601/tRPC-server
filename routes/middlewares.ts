import { isExpressRequest, isWSRequest } from "../context";
import { trpc } from "../trpc";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";
import { authTokenType, extractToken } from "../utils/extractToken";

const prisma = new PrismaClient();

const isAuthenticatedUserMiddleware = trpc.middleware(async ({ ctx, next }) => {
	try {
		if (isExpressRequest(ctx)) {
			const token = ctx.req.cookies.token;
			if (!token) throw new Error();
			const payload = extractToken(ctx.req.cookies.token, "auth") as authTokenType;
			const user = await prisma.user.findFirst({ where: { id: payload.id } });
			if (!user) throw new Error();
			ctx.req.body.user = user;
			return next({ ctx: { ...ctx, user: user } });
		}
		throw new Error();
	} catch (e) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
		});
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
		throw new TRPCError({
			code: "UNAUTHORIZED",
		});
	}
});

export const isAuthenticatedUser = trpc.procedure.use(isAuthenticatedUserMiddleware);
export const isWsRequest = trpc.procedure.use(wsRequestMiddleware);
