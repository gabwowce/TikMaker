import type { SavedVisualBrief } from "./prompts/writeCode.js";

// The channel's saved visuals ("Mano vizualai") as the code step sees them.
export function savedVisualsBrief(_workspaceId: string): SavedVisualBrief[] {
  return [];
}
