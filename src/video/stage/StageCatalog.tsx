import type { ReactNode } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import type { StylePack } from "../../agent/stylePack";
import { ensureFontsLoaded } from "../typography/fonts";
import { KineticCaption, phrasesFrom } from "./KineticCaption";
import { PackProvider, usePack } from "./pack";
import {
  BigNumber,
  Compare,
  FlowSchema,
  HeroObject,
  LibraryIcon,
  ScreenBody,
  TerminalBody,
} from "./StageBlocks";
import { Backdrop } from "./Backdrop";
import {
  BigList,
  CodeBody,
  CoinChain,
  DeckCard,
  NumberBadge,
} from "./StageVisuals";
import { stage } from "./tokens";

// The blocks catalogue: all 10 top-zone blocks in a row, 3 s each, with the
// block's name at the bottom. The agent picks from these blocks
// (docs/motion-planas.md). In the Studio – the "StageCatalog" composition;
// `pack` – the style pack.
const SEGMENT = 90;

const blocks: { name: string; render: () => ReactNode }[] = [
  {
    name: "1 *Logotipų* grandinė",
    render: () => (
      <CoinChain
        at={2}
        ats={[8, 22, 36]}
        icons={[
          <LibraryIcon key="a" id="claude" size={120} />,
          <LibraryIcon key="b" id="github" size={120} />,
          <LibraryIcon key="c" id="figma" size={120} />,
        ]}
      />
    ),
  },
  {
    name: "2 *Kodo* kortelė",
    render: () => (
      <DeckCard at={4} height={560}>
        <CodeBody
          at={4}
          file="tokens.ts"
          lines={[
            "export const tokens = {",
            "+ accent: '#FF7024',",
            "  radius: '28px',",
            "};",
          ]}
        />
      </DeckCard>
    ),
  },
  {
    name: "3 *Terminalas*",
    render: () => (
      <DeckCard at={4} height={520}>
        <TerminalBody
          at={4}
          lines={[
            "git reset --soft HEAD~1",
            "Unstaged 1 commit",
            "Your changes are safe",
          ]}
        />
      </DeckCard>
    ),
  },
  {
    name: "4 *Ekrano* kortelė",
    render: () => (
      <DeckCard at={4} height={600}>
        <ScreenBody label="Įkelk įrašą: TikMaker redaktorius" />
      </DeckCard>
    ),
  },
  {
    name: "5 *Didelis* sąrašas",
    render: () => (
      <BigList
        top={stage.visualTop + 90}
        items={[
          { text: "One palette", at: 6 },
          { text: "One type scale", at: 22 },
          { text: "Zero guessing", at: 38 },
        ]}
      />
    ),
  },
  {
    name: "6 *Skaičius*",
    render: () => <BigNumber at={4} to={214} suffix="k" label="GitHub stars" />,
  },
  {
    name: "7 *Palyginimas*",
    render: () => (
      <Compare
        at={4}
        before={{ label: "Official price", value: "$49/mo" }}
        after={{ label: "With TikMaker", value: "$0.016" }}
      />
    ),
  },
  {
    name: "8 Juosta *01*",
    render: () => (
      <>
        <NumberBadge label="01" at={4} />
        <DeckCard at={16} top={stage.visualTop + 300} height={540}>
          <ScreenBody label="Pirmas žingsnis" />
        </DeckCard>
      </>
    ),
  },
  {
    name: "9 *Didelis* daiktas",
    render: () => <HeroObject id="padlock" at={4} />,
  },
  {
    name: "10 *Schema*",
    render: () => (
      <FlowSchema
        ats={[6, 24, 42]}
        nodes={[
          { icon: "github", label: "Commit" },
          { icon: "vercel", label: "Deploy" },
          { label: "Live ✓" },
        ]}
      />
    ),
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
          {block.render()}
          <KineticCaption phrases={phrasesFrom([block.name], 4, 30)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
