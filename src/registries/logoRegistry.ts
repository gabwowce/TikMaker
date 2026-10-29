import { assetUrl } from "../utils/assetUrl";
import { generatedLogos } from "./assets.generated";
// Logos of apps, services and brands (files in the logos asset folder).
// Grouped so the library is not one long list of AI tools.
export const logoCategories = [
  { id: "ai", label: "AI" },
  { id: "dev", label: "Build & ship" },
  { id: "social", label: "Social & apps" },
  { id: "other", label: "Other" },
] as const;
export type LogoCategory = (typeof logoCategories)[number]["id"];
export type LogoDefinition = {
  id: string;
  name: string;
  src: string;
  category: LogoCategory;
};
// A logo not listed here goes to "other"; add new logo files here to sort them.
const categoryById: Record<string, LogoCategory> = {
  chatgpt: "ai",
  claude: "ai",
  "claude-ai-symbol": "ai",
  "claude-svg": "ai",
  elevenlabs: "ai",
  gemini: "ai",
  grok: "ai",
  midjourney: "ai",
  bolt: "dev",
  cloudflare: "dev",
  figma: "dev",
  github: "dev",
  "kilo-code": "dev",
  lovable: "dev",
  netlify: "dev",
  remotion: "dev",
  stripe: "dev",
  supabase: "dev",
  vercel: "dev",
  "vs-code": "dev",
  discord: "social",
  gmail: "social",
  "google-chrome": "social",
  reddit: "social",
  x: "social",
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
export const logoRegistry: Record<string, LogoDefinition> = Object.fromEntries(
  generatedLogos.map((entry) => [
    entry.id,
    {
      id: entry.id,
      name: displayNameOverrides[entry.id] ?? entry.label,
      src: assetUrl(`/assets/logos/${entry.file}`),
      category: categoryById[entry.id] ?? "other",
    },
  ]),
);
export const logoList = Object.values(logoRegistry);
export function getLogo(id: string): LogoDefinition | undefined {
  return logoRegistry[id];
}
