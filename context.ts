import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { inferAsyncReturnType } from "@trpc/server";
import { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";

export function createContext({ req, res }: CreateWSSContextFnOptions | CreateExpressContextOptions) {
	return {
		req,
		res,
	};
}

export const isExpressRequest = (ctx: ContextType): ctx is CreateExpressContextOptions => {
	return (ctx as CreateExpressContextOptions).req.session !== undefined;
};

export type ContextType = inferAsyncReturnType<typeof createContext>;
