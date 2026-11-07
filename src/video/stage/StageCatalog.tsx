import { AbsoluteFill, Sequence } from "remotion";
import type { BlockFromAi } from "../../agent/run/4-blocks";
import type { StylePack } from "../../agent/stylePack";
import { ensureFontsLoaded } from "../typography/fonts";
import { Backdrop } from "./Backdrop";
import { KineticCaption, phrasesFrom } from "./KineticCaption";
import { PackProvider, usePack } from "./pack";
import { StageBlock } from "./StageBlock";

// The blocks catalogue: every top-zone block and shape in a row, 3 s each,
// with its name at the bottom – drawn through StageBlock, exactly as the
// agent's blocks are. The agent picks from these (docs/motion-planas.md). In
// the Studio – the "StageCatalog" composition; `pack` – the style pack.
const SEGMENT = 90;

// Parts appear 16 frames apart, as if on words.
const parts = (n: number) => Array.from({ length: n }, (_, i) => 6 + i * 16);

const blocks: { name: string; block: Omit<BlockFromAi, "onWord"> }[] = [
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
];

export const STAGE_CATALOG_FRAMES = blocks.length * SEGMENT;

export function StageCatalog({ pack }: { pack?: StylePack }) {
  return (
    <PackProvider pack={pack}>
      <Catalog />
    </PackProvider>
  );
}

function Catalog() {
  const c = usePack();
  ensureFontsLoaded();
  return (
    <AbsoluteFill style={{ background: c.bg, overflow: "hidden" }}>
      <Backdrop />
      {blocks.map((block, i) => (
        <Sequence key={i} from={i * SEGMENT} durationInFrames={SEGMENT}>
          <StageBlock
            block={{ onWord: "", ...block.block }}
            at={4}
            partAts={parts(4)}
          />
          <KineticCaption phrases={phrasesFrom([block.name], 4, 30)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
