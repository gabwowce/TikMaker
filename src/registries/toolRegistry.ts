import { generatedLogos } from "./assets.generated";

export type ToolDefinition = {
  id: string;
  name: string;
  src: string;
};

const displayNameOverrides: Record<string, string> = {
  "claude-ai-symbol": "Claude",
  claude: "Claude",
  "claude-svg": "Claude",
  chatgpt: "ChatGPT",
  github: "GitHub",
  gmail: "Gmail",
  "vs-code": "VS Code",
  supabase: "Supabase",
  vercel: "Vercel",
  cloudflare: "Cloudflare",
  netlify: "Netlify",
  figma: "Figma",
  remotion: "Remotion",
  discord: "Discord",
  elevenlabs: "ElevenLabs",
  midjourney: "Midjourney",
  reddit: "Reddit",
  stripe: "Stripe",
  grok: "Grok",
  gemini: "Gemini",
  bolt: "Bolt",
  lovable: "Lovable",
  "kilo-code": "Kilo Code",
  x: "X",
};

export const toolRegistry: Record<string, ToolDefinition> = Object.fromEntries(
  generatedLogos.map((entry) => [
    entry.id,
    {
      id: entry.id,
      name: displayNameOverrides[entry.id] ?? entry.label,
      src: `/assets/logos/${entry.file}`,
    },
  ])
);

export const toolList = Object.values(toolRegistry);

export function getTool(id: string): ToolDefinition | undefined {
  return toolRegistry[id];
}
