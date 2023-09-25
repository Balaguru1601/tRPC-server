/// <reference types="qs" />
/// <reference types="express" />
export declare const appRouter: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: {
        req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
        res: import("express").Response<any, Record<string, any>>;
    };
    meta: object;
    errorShape: import("@trpc/server").DefaultErrorShape;
    transformer: import("@trpc/server").DefaultDataTransformer;
}>, {
    greeting: import("@trpc/server").BuildProcedure<"query", {
        _config: import("@trpc/server").RootConfig<{
            ctx: {
                req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
                res: import("express").Response<any, Record<string, any>>;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _ctx_out: {
            req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
            res: import("express").Response<any, Record<string, any>>;
        };
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
        _meta: object;
    }, string>;
    logger: import("@trpc/server").BuildProcedure<"mutation", {
        _config: import("@trpc/server").RootConfig<{
            ctx: {
                req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
                res: import("express").Response<any, Record<string, any>>;
            };
            meta: object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _meta: object;
        _ctx_out: {
            req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
            res: import("express").Response<any, Record<string, any>>;
        };
        _input_in: {
            name: string;
        };
        _input_out: {
            name: string;
        };
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
    }, boolean>;
    user: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: {
            req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
            res: import("express").Response<any, Record<string, any>>;
        };
        meta: object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, {
        register: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: {
                    req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
                    res: import("express").Response<any, Record<string, any>>;
                };
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {
                req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
                res: import("express").Response<any, Record<string, any>>;
            };
            _input_in: {
                email: string;
                username: string;
                password: string;
            };
            _input_out: {
                email: string;
                username: string;
                password: string;
            };
            _output_in: {
                message: string;
                success: boolean;
                user?: {
                    email: string;
                    username: string;
                    password: string;
                } | undefined;
            };
            _output_out: {
                message: string;
                success: boolean;
                user?: {
                    email: string;
                    username: string;
                    password: string;
                } | undefined;
            };
        }, unknown>;
        verify: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: {
                    req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
                    res: import("express").Response<any, Record<string, any>>;
                };
                meta: object;
                errorShape: import("@trpc/server").DefaultErrorShape;
                transformer: import("@trpc/server").DefaultDataTransformer;
            }>;
            _meta: object;
            _ctx_out: {
                req: import("express").Request<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
                res: import("express").Response<any, Record<string, any>>;
            };
            _input_in: {
                username: string;
                password: string;
            };
            _input_out: {
                username: string;
                password: string;
            };
            _output_in: {
                message: string;
                success: boolean;
                user?: {
                    email: string;
                    username: string;
                    password: string;
                } | undefined;
            };
            _output_out: {
                message: string;
                success: boolean;
                user?: {
                    email: string;
                    username: string;
                    password: string;
                } | undefined;
            };
        }, unknown>;
    }>;
}>;
export type AppRouter = typeof appRouter;
