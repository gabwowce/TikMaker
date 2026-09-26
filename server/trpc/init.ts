import { initTRPC } from "@trpc/server";

// One tRPC instance for the whole server. `router` groups procedures,
// `procedure` is where each one starts: .input(zodSchema) then .query (read)
// or .mutation (change).
const t = initTRPC.create();

export const router = t.router;
export const procedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
