import type { BlockFromAi } from "../../video/stage/blocks";

// Every block the agent picks from, with sample content – one place for the
// "StageCatalog" composition (all of them in a row, in the Studio) and the
// editor's Visuals tab (Blocks, inserted as a layer). A leaf module (no
// React), so the editor can read it without the composition.
export type CatalogBlock = {
  // "List · *grid*": the *starred* part is the block's shape or kind
  name: string;
  block: Omit<BlockFromAi, "onWord">;
};

export const catalogBlocks: CatalogBlock[] = [
  {
    name: "*Logos*",
    block: { kind: "logos", ids: ["claude", "github", "figma"] },
  },
  {
    name: "*Code*",
    block: {
      kind: "code",
      file: "tokens.ts",
      lines: [
        "export const tokens = {",
        "+ accent: '#FF7024',",
        "  radius: '28px',",
        "};",
      ],
    },
  },
  {
    name: "*Terminal*",
    block: {
      kind: "terminal",
      lines: [
        "git reset --soft HEAD~1",
        "Unstaged 1 commit",
        "Your changes are safe",
      ],
    },
  },
  {
    name: "*Screen*",
    block: { kind: "screen", text: "Click Generate", seconds: 4 },
  },
  {
    name: "List · *rows*",
    block: {
      kind: "list",
      items: ["One palette", "One type scale", "Zero guessing"],
    },
  },
  {
    name: "List · *grid*",
    block: {
      kind: "list",
      shape: "grid",
      items: ["Hooks", "Skills", "Agents", "MCP"],
      itemIcons: ["link", "key", "robot-helpers", "database"],
    },
  },
  {
    name: "List · *orbit*",
    block: {
      kind: "list",
      shape: "orbit",
      id: "claude",
      items: ["Planning", "Security", "Testing", "Review"],
    },
  },
  {
    name: "List · *stack*",
    block: {
      kind: "list",
      shape: "stack",
      items: ["Keyframes by hand", "Scene by scene", "In After Effects"],
    },
  },
  {
    name: "*Number*",
    block: { kind: "number", value: 214, suffix: "k", text: "GitHub stars" },
  },
  {
    name: "*Compare*",
    block: {
      kind: "compare",
      before: { label: "Official price", value: "$49/mo" },
      after: { label: "With TikMaker", value: "$0.016" },
    },
  },
  { name: "Badge *01*", block: { kind: "badge", text: "01" } },
  { name: "*Object*", block: { kind: "object", id: "padlock" } },
  {
    name: "Schema · *chain*",
    block: {
      kind: "schema",
      nodes: [
        { id: "github", label: "Commit" },
        { id: "vercel", label: "Deploy" },
        { label: "Live" },
      ],
    },
  },
  {
    name: "Schema · *zigzag*",
    block: {
      kind: "schema",
      shape: "zigzag",
      nodes: [
        { label: "Your idea" },
        { label: "Script" },
        { label: "Voiceover" },
        { label: "Video" },
      ],
    },
  },
  {
    name: "Schema · *hub*",
    block: {
      kind: "schema",
      shape: "hub",
      nodes: [
        { id: "claude", label: "Claude" },
        { label: "GitHub" },
        { label: "Supabase" },
        { label: "Vercel" },
      ],
    },
  },
  {
    name: "*Phone*",
    block: {
      kind: "phone",
      text: "TikMaker",
      items: ["Hook ready", "Script ready", "Video ready"],
      itemIcons: ["idea", "document"],
    },
  },
  {
    name: "*Browser*",
    block: {
      kind: "browser",
      text: "github.com/affaan",
      items: ["64 agents", "262 skills", "84 commands"],
    },
  },
  {
    name: "*Progress*",
    block: { kind: "progress", value: 80, text: "Video rendered" },
  },
  {
    name: "*Keys*",
    block: {
      kind: "keys",
      items: ["Ctrl", "Shift", "P"],
      text: "Open the command palette",
    },
  },
  {
    name: "Schema · *loop*",
    block: {
      kind: "schema",
      shape: "loop",
      nodes: [
        { label: "Agent writes" },
        { label: "Code checks" },
        { label: "Fix" },
      ],
    },
  },
  {
    name: "Chat · *messages*",
    block: {
      kind: "chat",
      items: ["Book me a room", "Which day?", "Friday, 10am", "Done ✓"],
    },
  },
  {
    name: "Chat · *comments*",
    block: {
      kind: "chat",
      shape: "comments",
      items: ["Do one on Docker", "Explain RAG pls", "Git rebase!"],
    },
  },
  {
    name: "*Transform*",
    block: {
      kind: "transform",
      nodes: [{ id: "idea", label: "One idea" }, { label: "Full video" }],
    },
  },
  {
    name: "*Picture* · cutout",
    block: {
      kind: "picture",
      text: "Your picture here",
      find: "a picture without a background",
      look: "cutout",
    },
  },
];
