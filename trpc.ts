import { initTRPC } from "@trpc/server";
import { ContextType } from "./context";
import superjson from "superjson";

export const trpc = initTRPC.context<ContextType>().create({ transformer: superjson });
