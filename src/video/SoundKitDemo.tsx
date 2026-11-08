import { AbsoluteFill, Audio, Sequence, useCurrentFrame } from "remotion";
import soundKit from "../../knowledge/shared/sound-kit.json";
import { getSfx, sfxList } from "../registries/sfxRegistry";
import { ensureFontsLoaded } from "./typography/fonts";

// Listening to the sound kit (npm run sfx:listen → out/sound-kit.mp4): every
// kind of moment the agent marks, with the sound it uses now
// (knowledge/shared/sound-kit.json), then every generated candidate
// (tm-<kind>-<n>) – so the creator hears them one after another and picks.
const EACH = 42; // frames per sound (1.4 s)

type Item = { title: string; sub: string; sfx: string; volume: number; inKit: boolean };

function items(): Item[] {
  const kinds = (soundKit as { kinds: Record<string, { sfx: string; volume: number }> }).kinds;
  const kit = Object.entries(kinds).map(([kind, line]) => ({
    title: kind,
    sub: `in the kit now: ${line.sfx}`,
    sfx: line.sfx,
    volume: line.volume,
    inKit: true,
  }));
  const candidates = sfxList
    .filter((s) => /^tm-/.test(s.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      title: s.id.replace(/^tm-/, "").replace(/-(\d+)$/, " · $1"),
      sub: `candidate: ${s.id}`,
      sfx: s.id,
      volume: 0.5,
      inKit: false,
    }));
  return [...kit, ...candidates];
}

export const soundKitFrames = () => Math.max(1, items().length) * EACH;

export function SoundKitDemo() {
  ensureFontsLoaded();
  const frame = useCurrentFrame();
  const list = items();
  const at = Math.min(list.length - 1, Math.floor(frame / EACH));
  const current = list[at];
  return (
    <AbsoluteFill
      style={{
        background: current?.inKit ? "#0b1020" : "#140b20",
        color: "white",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 44, opacity: 0.5 }}>
        {at + 1} / {list.length}
      </div>
      <div style={{ fontSize: 150, fontWeight: 800 }}>{current?.title}</div>
      <div style={{ fontSize: 40, opacity: 0.6 }}>{current?.sub}</div>
      {list.map((item, i) => {
        const src = getSfx(item.sfx)?.src;
        return src ? (
          <Sequence key={i} from={i * EACH + 8} durationInFrames={EACH - 8} layout="none">
            <Audio src={src} volume={item.volume} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
}
