import { Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { getLogo } from "../../registries/logoRegistry";
import { getProp } from "../../registries/propRegistry";
import { assetUrl } from "../../utils/assetUrl";
import { usePack } from "./pack";
import { pop, ramp, settle } from "./pop";
import { shadows, stage } from "./tokens";

// Likę viršutinės zonos blokai (docs/motion-planas.md, blokų lentelė).
// Pirmi keturi – StageVisuals.tsx (CoinChain, DeckCard + CodeBody, NumberBadge,
// BigList). Visi blokai: ~85 % pločio, spalvos ir šriftas – iš stiliaus paketo,
// `at` – kadras, kai blokas atsiranda (ant žodžio).

const LEFT = (1080 - stage.contentWidth) / 2;

// Ramybės judesys: lėtai kyla ir leidžiasi (±8 px per 2,8 s).
function floatY(frame: number, seed = 0) {
  return Math.sin((frame / 84) * Math.PI * 2 + seed) * 8;
}

// ── Bibliotekos ikona: logotipas arba daiktas pagal id; jei tokio nėra –
// pavadinimo raidės (pvz. „Notion“ → „N“), kad blokas niekada nebūtų tuščias.
export function LibraryIcon({ id, size }: { id: string; size: number }) {
  const c = usePack();
  const src = getLogo(id)?.src ?? getProp(id)?.src;
  if (src)
    return (
      <Img
        src={src}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  return (
    <div
      style={{
        fontFamily: c.fontStrong,
        fontSize: size * 0.6,
        color: c.text,
        lineHeight: 1,
      }}
    >
      {id.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Terminalo turinys kortelėje (DeckCard viduje): komanda spausdinama
// raidė po raidės, atsakymo eilutės atsiranda po jos.
export function TerminalBody({ lines, at }: { lines: string[]; at: number }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const [command, ...output] = lines;
  const typed = Math.floor(Math.max(0, frame - at - 6) * 1.6);
  const done = at + 6 + Math.ceil(command.length / 1.6);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "26px 34px",
          borderBottom: `2px solid ${c.border}`,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((dot) => (
          <div
            key={dot}
            style={{ width: 20, height: 20, borderRadius: 10, background: dot }}
          />
        ))}
      </div>
      <div
        style={{
          padding: "34px 38px",
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 42,
          lineHeight: 1.45,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ color: c.text, whiteSpace: "pre-wrap" }}>
          <span style={{ color: c.accent }}>❯ </span>
          {command.slice(0, typed)}
          {frame < done + 20 && Math.floor(frame / 8) % 2 === 0 ? (
            <span style={{ color: c.accent }}>▌</span>
          ) : null}
        </div>
        {output.map((line, i) => {
          const show = ramp(frame, done + 4 + i * 5, 5);
          return (
            <div
              key={i}
              style={{
                color: c.textSoft,
                opacity: show,
                whiteSpace: "pre-wrap",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Ekrano turinys kortelėje: tavo įrašas / nuotrauka (src) arba vieta jai
// su aprašu, ką įkelti (kaip REC vietos dabartiniuose maketuose).
export function ScreenBody({ src, label }: { src?: string; label: string }) {
  const c = usePack();
  if (src)
    return (
      <Img
        src={assetUrl(src)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        border: `4px dashed ${c.border}`,
        borderRadius: 26,
        margin: 18,
      }}
    >
      <div style={{ fontFamily: c.fontStrong, fontSize: 56, color: c.accent }}>
        ● REC
      </div>
      <div
        style={{
          fontFamily: c.fontRegular,
          fontSize: 38,
          color: c.textSoft,
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Didelis skaičius, kuris suskaičiuojamas (pvz. „$0.016“, „214k“, „90 %“).
export function BigNumber({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  label,
  at,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = pop(frame, at, fps);
  // Skaičiuoja 20 kadrų, lėtėdamas pabaigoje; pasiekus – mažas „pop“
  const t = ramp(frame, at, 20);
  const value = to * (1 - Math.pow(1 - t, 3));
  const landed = pop(frame, at + 20, fps);
  const punch = 1 + 0.06 * Math.sin(Math.min(1, landed) * Math.PI);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: stage.visualCenterY - 230 + floatY(frame),
        textAlign: "center",
        opacity: Math.min(1, appear * 2),
        transform: `scale(${interpolate(appear, [0, 1], [0.7, 1]) * punch})`,
      }}
    >
      <div
        style={{
          fontFamily: c.fontStrong,
          fontSize: 300 * c.widthFactor,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: c.text,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 20px 60px ${c.accent}55`,
        }}
      >
        {prefix}
        {value.toFixed(decimals)}
        <span style={{ color: c.accent }}>{suffix}</span>
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: c.fontSemi,
          fontSize: 64 * c.widthFactor,
          color: c.textSoft,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── Palyginimas: viršuje „prieš“ (blankus, perbrauktas), apačioje „po“
// (akcento spalva), tarp jų – „vs“ moneta (kaip 04 kadre).
export function Compare({
  before,
  after,
  at,
}: {
  before: { label: string; value: string };
  after: { label: string; value: string };
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = settle(frame, at, fps);
  const strike = ramp(frame, at + 10, 8);
  const vs = pop(frame, at + 14, fps);
  const b = settle(frame, at + 18, fps);
  const card = (
    side: { label: string; value: string },
    p: number,
    hot: boolean,
    top: number,
  ) => (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: top + floatY(frame, hot ? 1 : 0),
        width: stage.contentWidth,
        height: 300,
        borderRadius: 34,
        background: hot ? c.accent : c.surface,
        border: `2px solid ${hot ? "transparent" : c.border}`,
        boxShadow: shadows.card,
        padding: "0 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity: Math.min(1, p * 1.6),
        transform: `translateY(${interpolate(p, [0, 1], [140, 0])}px) scale(${interpolate(p, [0, 1], [0.92, 1])})`,
      }}
    >
      <div
        style={{
          fontFamily: c.fontSemi,
          fontSize: 44,
          color: hot ? c.bg : c.textSoft,
          opacity: 0.85,
        }}
      >
        {side.label}
      </div>
      <div
        style={{
          position: "relative",
          alignSelf: "flex-start",
          fontFamily: c.fontStrong,
          fontSize: 132 * c.widthFactor,
          letterSpacing: "-0.03em",
          color: hot ? c.bg : c.text,
        }}
      >
        {side.value}
        {!hot ? (
          <div
            style={{
              position: "absolute",
              left: -6,
              top: "52%",
              height: 10,
              width: `${strike * 104}%`,
              background: c.accent,
              borderRadius: 5,
            }}
          />
        ) : null}
      </div>
    </div>
  );
  return (
    <>
      {card(before, a, false, stage.visualTop + 40)}
      {card(after, b, true, stage.visualTop + 440)}
      <div
        style={{
          position: "absolute",
          left: 540 - 60,
          top: stage.visualTop + 340 + 40,
          width: 120,
          height: 120,
          borderRadius: 60,
          background: c.text,
          color: c.bg,
          fontFamily: c.fontStrong,
          fontSize: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: shadows.coin,
          transform: `scale(${vs})`,
          zIndex: 2,
        }}
      >
        vs
      </div>
    </>
  );
}

// ── Vienas didelis daiktas iš bibliotekos (spyna, laikrodis, robotas…):
// nukrenta, „atsitrenkia“ (suspaudžiamas ir atšoka), tada plūduriuoja; po juo
// šešėlis, kuris mažėja, kai daiktas pakyla (kaip maskotas 06–10 kadruose).
export function HeroObject({
  id,
  at,
  size = 560,
}: {
  id: string;
  at: number;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fall = settle(frame, at, fps);
  const land = pop(frame, at + 9, fps);
  // Suspaudimas nusileidžiant: 0,86 → 1,08 → 1
  const squash = interpolate(land, [0, 0.5, 1], [0.86, 1.08, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(fall, [0, 1], [-700, 0]) + floatY(frame, 2);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: stage.visualCenterY - size / 2 - 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px) scale(${2 - squash}, ${squash})`,
          transformOrigin: "50% 100%",
          filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.55))",
        }}
      >
        <LibraryIcon id={id} size={size} />
      </div>
      <div
        style={{
          marginTop: 10,
          width: size * 0.6 * (1 - Math.max(0, -y) / 1400),
          height: 40,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          filter: "blur(14px)",
          opacity: fall,
        }}
      />
    </div>
  );
}

// ── Schema: mazgai iš viršaus į apačią, tarp jų nusibrėžia punktyrinė linija
// (kaip 05 ir 07 kadruose). Mazgas – moneta su ikona arba užrašas.
export function FlowSchema({
  nodes,
  ats,
}: {
  nodes: { icon?: string; label: string }[];
  ats: number[]; // kada atsiranda kiekvienas mazgas
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = 760 / Math.max(1, nodes.length - 1);
  const top = stage.visualTop - 20;
  return (
    <div
      style={{ position: "absolute", left: 0, top, width: 1080, height: 860 }}
    >
      {nodes.slice(1).map((_, i) => {
        // Linija į mazgą i+1 brėžiasi prieš jam atsirandant
        const draw = ramp(frame, ats[i + 1] - 8, 8);
        return (
          <div
            key={`l${i}`}
            style={{
              position: "absolute",
              left: 540 - 3,
              top: 50 + i * step + 60,
              width: 6,
              height: (step - 120) * draw,
              backgroundImage: `linear-gradient(${c.textSoft} 60%, transparent 60%)`,
              backgroundSize: "6px 26px",
              opacity: 0.6,
            }}
          />
        );
      })}
      {nodes.map((node, i) => {
        const p = pop(frame, ats[i], fps);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              width: 1080,
              top: i * step + floatY(frame, i),
              display: "flex",
              justifyContent: "center",
              opacity: Math.min(1, p * 2),
              transform: `scale(${interpolate(p, [0, 1], [0.5, 1])})`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                height: 120,
                padding: node.icon ? "0 44px 0 14px" : "0 48px",
                borderRadius: 60,
                background: `linear-gradient(180deg, ${c.surfaceHi}, ${c.surface})`,
                border: `2px solid ${c.border}`,
                boxShadow: shadows.coin,
              }}
            >
              {node.icon ? (
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    background: c.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LibraryIcon id={node.icon} size={64} />
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: c.fontSemi,
                  fontSize: 56 * c.widthFactor,
                  color: c.text,
                }}
              >
                {node.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
