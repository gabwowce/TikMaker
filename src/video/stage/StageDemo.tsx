import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ensureFontsLoaded } from "../typography/fonts";
import { Asterisk, Brush, Prompt } from "./Glyphs";
import { KineticCaption, phrasesFrom } from "./KineticCaption";
import {
  BigList,
  CodeBody,
  CoinChain,
  DeckCard,
  ExitUp,
  NumberBadge,
} from "./StageVisuals";
import type { StylePack } from "../../agent/stylePack";
import { Backdrop } from "./Backdrop";
import { PackProvider, usePack } from "./pack";
import { stage } from "./tokens";

// A sample "stage" scene made by hand (no agent yet): laid out like
// InsiderForce (docs/bd/kadrai/insiderforce/), only dark. In the Studio – the
// "StageDemo" composition. Once the layout is right, the agent fills it.
export const STAGE_DEMO_FRAMES = 360;

// `pack` – the style pack (knowledge/shared/style-presets/); without it – Midnight.
export function StageDemo({ pack }: { pack?: StylePack }) {
  return (
    <PackProvider pack={pack}>
      <StageDemoScene />
    </PackProvider>
  );
}

function StageDemoScene() {
  const c = usePack();
  ensureFontsLoaded();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // The voiceover in phrases: *word* – a key word, [phrase] – boxed
  const captions = [
    ...phrasesFrom(
      ["*3* *Claude* *Code* skills that", "make you look like a [*designer*]"],
      6,
      fps,
    ),
    ...phrasesFrom(
      [
        "First, *design* *tokens* lock every",
        "*color* and *spacing* so nothing",
        "looks [*random*] again",
      ],
      120,
      fps,
    ),
    ...phrasesFrom(
      ["One *palette*, one *type* *scale*", "and [*zero* *guesswork*]"],
      252,
      fps,
    ),
  ];

  // Camera: the whole scene slowly closes in (~1 % a second)
  const zoom = 1 + (frame / fps) * 0.008;

  return (
    <AbsoluteFill style={{ background: c.bg, overflow: "hidden" }}>
      <Backdrop />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {/* 1: a chain of logos */}
        <ExitUp at={116}>
          <CoinChain
            at={4}
            ats={[15, 34, 100]} // "Claude", "skills", "designer"
            icons={[
              <Asterisk key="a" size={130} color={c.accent} />,
              <Prompt key="p" size={130} color={c.text} />,
              <Brush key="b" size={120} color={c.accent2} />,
            ]}
          />
        </ExitUp>

        {/* 2: "01" + a code card */}
        <ExitUp at={244}>
          <NumberBadge label="01" at={122} />
          <DeckCard at={140} top={stage.visualTop + 300} height={560}>
            <CodeBody
              at={140}
              file="tokens.ts"
              lines={[
                "export const tokens = {",
                "+ accent: '#FF7024',",
                "  radius: '28px',",
                "+ space: [8, 16, 24, 40],",
                "};",
              ]}
            />
          </DeckCard>
        </ExitUp>

        {/* 3: a big list */}
        <BigList
          top={stage.visualTop + 90}
          items={[
            { text: "One palette", at: 254 },
            { text: "One type scale", at: 273 },
            { text: "Zero guessing", at: 301 },
          ]}
        />

        <KineticCaption phrases={captions} />
      </AbsoluteFill>

      {/* The brand mark – in place, like insiderforce.io */}
      <div
        style={{
          position: "absolute",
          top: stage.brandY,
          width: "100%",
          textAlign: "center",
          fontFamily: c.fontSemi,
          fontSize: 64,
          letterSpacing: "-0.02em",
          color: "rgba(255,255,255,0.18)",
        }}
      >
        {c.brand}
      </div>
    </AbsoluteFill>
  );
}
