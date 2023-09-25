/// <reference types="qs" />
/// <reference types="express" />
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { inferAsyncReturnType } from "@trpc/server";
export declare function createContext({ req, res }: CreateExpressContextOptions): {
    req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
    res: import("express").Response<any, Record<string, any>>;
};
export type contextType = inferAsyncReturnType<typeof createContext>;
