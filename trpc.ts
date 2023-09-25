import { initTRPC } from "@trpc/server";
import { ContextType } from "./context";

export const trpc = initTRPC.context<ContextType>().create();
