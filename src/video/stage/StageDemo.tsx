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
import { PackProvider, usePack } from "./pack";
import { stage } from "./tokens";

// Pavyzdinė „stage“ scena rankomis (kol kas be agento): išdėstymas kaip
// InsiderForce (docs/bd/kadrai/insiderforce/), tik tamsus. Studijoje –
// kompozicija „StageDemo“. Kai išdėstymas tiks, jį pildys agentas.
export const STAGE_DEMO_FRAMES = 360;

// `pack` – stiliaus paketas (knowledge/shared/style-presets/); be jo – Midnight.
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

  // Įgarsinimas frazėmis: *žodis* – kertinis, [frazė] – dėžutėje
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

  // Kamera: visa scena lėtai artėja (~1 % per sekundę)
  const zoom = 1 + (frame / fps) * 0.008;

  return (
    <AbsoluteFill style={{ background: c.bg, overflow: "hidden" }}>
      <Backdrop />
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {/* 1: logotipų grandinė */}
        <ExitUp at={116}>
          <CoinChain
            at={4}
            ats={[15, 34, 100]} // „Claude“, „skills“, „designer“
            icons={[
              <Asterisk key="a" size={130} color={c.accent} />,
              <Prompt key="p" size={130} color={c.text} />,
              <Brush key="b" size={120} color={c.accent2} />,
            ]}
          />
        </ExitUp>

        {/* 2: „01“ + kodo kortelė */}
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

        {/* 3: didelis sąrašas */}
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

      {/* Ženklas – vietoje, kaip insiderforce.io */}
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

// Fonas: švelnus šviesesnis centras, vos matomas tinklelis, kuris lėtai slenka,
// ir du dideli sulieti akcento ženklai kampuose, kurie sukasi.
// Fonas – bendras visoms stage kompozicijoms (ir StageCatalog).
export function Backdrop() {
  const c = usePack();
  const frame = useCurrentFrame();
  const drift = (frame * 0.4) % 90;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 42%, ${c.bgGlow}, ${c.bg} 75%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.035) 2px, transparent 2px)",
          backgroundSize: "90px 90px",
          backgroundPosition: `${drift}px ${-drift * 0.6}px`,
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black, transparent)",
        }}
      />
      {[
        { x: -120, y: 120, s: 420, speed: 0.25 },
        { x: 820, y: 1380, s: 360, speed: -0.2 },
      ].map((g, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: g.x,
            top: g.y,
            filter: "blur(10px)",
            opacity: 0.16,
            transform: `rotate(${frame * g.speed}deg)`,
          }}
        >
          <Asterisk size={g.s} color={c.accent} />
        </div>
      ))}
    </AbsoluteFill>
  );
}
