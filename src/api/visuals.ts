import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { trpc } from "./trpc";

// "Mano vizualai": the channel's saved code scenes (server/agent/visuals.ts).
export function useVisuals(workspaceId: string) {
  return useQuery(trpc.visuals.list.queryOptions(workspaceId));
}

const listAgain = () =>
  queryClient.invalidateQueries({ queryKey: trpc.visuals.list.queryKey() });

export function useSaveVisual() {
  return useMutation(trpc.visuals.save.mutationOptions({ onSuccess: listAgain }));
}

export function useRemoveVisual() {
  return useMutation(trpc.visuals.remove.mutationOptions({ onSuccess: listAgain }));
}

export const visualFrameUrl = (workspaceId: string, id: string) =>
  `/api/visuals/${encodeURIComponent(workspaceId)}/${encodeURIComponent(id)}/frame.png`;
