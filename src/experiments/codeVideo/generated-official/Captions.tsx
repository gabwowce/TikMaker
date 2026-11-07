import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { FreeScene } from "../FreeVideo";
import { C, CL, SANS } from "./kit";

type Word = { text: string; frame: number; endFrame: number };
type Chunk = { words: Word[]; from: number; to: number };

// Group the spoken words into short pages: at most 3 words, a page ends on
// punctuation or on a pause, and never crosses a scene boundary.
function chunk(scenes: FreeScene[]): Chunk[] {
  const out: Chunk[] = [];
  for (const s of scenes) {
    let cur: Word[] = [];
    const flush = () => {
      if (cur.length) out.push({ words: cur, from: cur[0].frame, to: 0 });
      cur = [];
    };
    s.words.forEach((w, i) => {
      const next = s.words[i + 1];
      cur.push(w);
      const punct = /[.,:!?]$/.test(w.text);
      const pause = next ? next.frame - w.endFrame > 10 : true;
      const long = cur.map((c) => c.text).join(" ").length > 16;
      // keep a name like "Claude Code" on one page
      const name = !!next && /^[A-Z]/.test(w.text) && /^[A-Z]/.test(next.text) && !punct;
      if (punct || pause || (!name && (cur.length >= 3 || long))) flush();
    });
    flush();
    // A page stays until the next one starts, but not past the scene.
    const sceneEnd = s.from + s.durationInFrames;
    for (let i = out.length - 1; i >= 0 && out[i].to === 0; i--) {
      const nextFrom = i + 1 < out.length ? out[i + 1].from : sceneEnd;
      out[i].to = Math.min(nextFrom, sceneEnd);
    }
  }
  return out;
}

const clean = (t: string) => t.replace(/[.,:!?]+$/, "").replace(/^'|'$/g, "").toUpperCase();

export function Captions({ scenes }: { scenes: FreeScene[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = chunk(scenes);
  const page = pages.find((p) => frame >= p.from && frame < p.to);
  if (!page) return null;
  const inP = spring({ frame: frame - page.from, fps, config: { damping: 14, stiffness: 260, mass: 0.6 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 1420,
        left: 80,
        right: 80,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 34px",
        scale: String(interpolate(inP, [0, 1], [0.86, 1])),
        translate: `0px ${interpolate(inP, [0, 1], [24, 0])}px`,
      }}
    >
      {page.words.map((w, i) => {
        const active = frame >= w.frame && (i === page.words.length - 1 || frame < page.words[i + 1].frame);
        const spoken = frame >= w.frame;
        const pop = spring({ frame: frame - w.frame, fps, config: { damping: 10, stiffness: 300, mass: 0.5 } });
        return (
          <span
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 900,
              fontSize: 92,
              lineHeight: 1.05,
              letterSpacing: -1,
              color: active ? C.yellow : C.text,
              opacity: spoken ? 1 : 0.45,
              scale: String(active ? interpolate(pop, [0, 1], [1.25, 1.08], CL) : 1),
              textShadow: "0 6px 0 rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.85), 0 0 3px #000, 0 0 3px #000",
              WebkitTextStroke: "3px rgba(0,0,0,0.85)",
              paintOrder: "stroke fill",
            }}
          >
            {clean(w.text)}
          </span>
        );
      })}
    </div>
  );
}
