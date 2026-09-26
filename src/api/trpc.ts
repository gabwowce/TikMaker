import { createTRPCClient, httpLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "../../server/trpc/router";
import { queryClient } from "./queryClient";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpLink({ url: "/trpc" })],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});

export function renderFileUrl(id: string): string {
  return `/api/renders/${encodeURIComponent(id)}/file`;
}
