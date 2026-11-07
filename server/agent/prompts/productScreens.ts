import type { Workspace } from "../../../src/agent/knowledge.js";

// The channel's product as it really looks (workspace.screens), for the
// prompts that describe or ask for recordings of it – the script (what a scene
// shows) and the blocks (what to record). Empty when the channel lists none.
export function productScreens(workspace: Workspace): string {
  if (!workspace.screens?.length) return "";
  const list = workspace.screens
    .map((screen) => `- ${screen.name}: ${screen.shows}`)
    .join("\n");
  return `

The product's real screens – when a scene shows the product, or asks for a recording of
it, describe only what these screens really show; never invent cards, buttons, previews
or animations they do not have:
${list}`;
}
