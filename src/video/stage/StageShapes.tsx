import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fitFontSize } from "./fitText";
import { Sparkle } from "./Glyphs";
import { usePack } from "./pack";
import { pop, ramp, settle } from "./pop";
import { LibraryIcon } from "./StageBlocks";
import { shadows, stage } from "./tokens";

// More top-zone shapes (docs/motion-planas.md, "Įvairovė"): the other ways a
// list and a schema can be drawn, and the blocks that came from the editor's
// visuals (phone, browser, progress, keys, transform), redrawn in the stage
// style – colours and font from the style pack, the same pop / settle
// entrances. Every part takes the frame it appears on (`ats`), its spoken
// word when the agent gave one.

const LEFT = (1080 - stage.contentWidth) / 2;
const CY = stage.visualCenterY;

// Idle motion: slowly rises and sinks (±8 px over 2.8 s).
function floatY(frame: number, seed = 0) {
  return Math.sin((frame / 84) * Math.PI * 2 + seed) * 8;
}

// One part's entrance: fades in while growing from `from` with a bounce.
function popStyle(p: number, from = 0.5) {
  return {
    opacity: Math.min(1, p * 2),
    transform: `scale(${interpolate(p, [0, 1], [from, 1])})`,
  };
}

// A rounded "pill" with an optional icon – the node / item of most shapes.
function Pill({
  label,
  icon,
  fontSize,
  hot,
}: {
  label: string;
  icon?: string;
  fontSize: number;
  hot?: boolean;
}) {
  const c = usePack();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        height: fontSize * 2.1,
        padding: icon
          ? `0 ${fontSize * 0.8}px 0 12px`
          : `0 ${fontSize * 0.8}px`,
        borderRadius: fontSize * 1.05,
        background: hot
          ? c.accent
          : `linear-gradient(180deg, ${c.surfaceHi}, ${c.surface})`,
        border: `2px solid ${hot ? "transparent" : c.border}`,
        boxShadow: shadows.coin,
        whiteSpace: "nowrap",
      }}
    >
      {icon ? (
        <div
          style={{
            width: fontSize * 1.7,
            height: fontSize * 1.7,
            borderRadius: "50%",
            background: c.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LibraryIcon id={icon} size={fontSize * 1.15} />
        </div>
      ) : null}
      <div
        style={{
          fontFamily: c.fontSemi,
          fontSize,
          color: hot ? c.bg : c.text,
          letterSpacing: "-0.02em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

type Item = { text: string; icon?: string; at: number };

// ── A list as cards, two to a row; a lone last card is centred.
export function ListGrid({ items }: { items: Item[] }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gap = 40;
  const w = (stage.contentWidth - gap) / 2;
  const rows = Math.ceil(items.length / 2);
  const h = rows === 1 ? 380 : 330;
  const top = CY - (rows * h + (rows - 1) * gap) / 2;
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    54 * c.widthFactor,
    w - 60,
  );
  return (
    <>
      {items.map((item, i) => {
        const row = Math.floor(i / 2);
        const alone = i === items.length - 1 && items.length % 2 === 1;
        const left = alone ? (1080 - w) / 2 : LEFT + (i % 2) * (w + gap);
        const p = pop(frame, item.at, fps);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left,
              top: top + row * (h + gap) + floatY(frame, i),
              width: w,
              height: h,
              borderRadius: 34,
              background: `linear-gradient(160deg, ${c.surfaceHi}, ${c.surface})`,
              border: `2px solid ${c.border}`,
              boxShadow: shadows.card,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 26,
              ...popStyle(p, 0.6),
            }}
          >
            {item.icon ? (
              <LibraryIcon id={item.icon} size={h * 0.42} />
            ) : (
              <div
                style={{
                  fontFamily: c.fontStrong,
                  fontSize: h * 0.3,
                  color: c.accent,
                  lineHeight: 1,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            )}
            <div
              style={{
                fontFamily: c.fontSemi,
                fontSize,
                color: c.text,
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
              }}
            >
              {item.text}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── A list around a centre: the centre (an icon or a word) first, the items
// on an ellipse around it, each with a spoke drawing out to it; the ring
// turns slowly so the picture never stands still.
export function ListOrbit({
  items,
  center,
  centerIcon,
  at,
}: {
  items: Item[];
  center?: string;
  centerIcon?: string;
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rx = 300;
  const ry = 340;
  const turn = (frame / 30) * 2; // degrees: ~2° a second
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    62 * c.widthFactor,
    380 - (items.some((item) => item.icon) ? 100 : 0),
  );
  const place = (i: number) => {
    const angle = ((-90 + (360 / items.length) * i + turn) * Math.PI) / 180;
    return { x: 540 + rx * Math.cos(angle), y: CY + ry * Math.sin(angle) };
  };
  const hub = pop(frame, at, fps);
  return (
    <>
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {items.map((item, i) => {
          const { x, y } = place(i);
          const draw = ramp(frame, item.at - 6, 8);
          return (
            <line
              key={i}
              x1={540}
              y1={CY}
              x2={540 + (x - 540) * draw}
              y2={CY + (y - CY) * draw}
              stroke={c.textSoft}
              strokeOpacity={0.45}
              strokeWidth={5}
              strokeDasharray="14 12"
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 540 - 150,
          top: CY - 150 + floatY(frame),
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${c.surfaceHi}, ${c.surface})`,
          border: `2px solid ${c.border}`,
          boxShadow: `${shadows.coin}, 0 0 60px ${c.accent}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...popStyle(hub, 0.3),
        }}
      >
        {centerIcon ? (
          <LibraryIcon id={centerIcon} size={190} />
        ) : (
          <div
            style={{
              fontFamily: c.fontStrong,
              fontSize: fitFontSize([center ?? ""], 60, 220),
              color: c.text,
              textAlign: "center",
            }}
          >
            {center}
          </div>
        )}
      </div>
      {items.map((item, i) => {
        const { x, y } = place(i);
        const p = pop(frame, item.at, fps);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div style={popStyle(p, 0.4)}>
              <Pill label={item.text} icon={item.icon} fontSize={fontSize} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── A list as cards landing on a pile: each new card drops on top, a little
// turned; the ones under it stay readable above it.
export function ListStack({ items }: { items: Item[] }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const h = 200;
  const step = 150;
  const width = stage.contentWidth - 60;
  const top = CY - ((items.length - 1) * step + h) / 2;
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    64 * c.widthFactor,
    width - 220,
  );
  return (
    <>
      {items.map((item, i) => {
        const p = settle(frame, item.at, fps);
        const land = pop(frame, item.at + 6, fps);
        const tilt = (i % 2 ? 1.6 : -1.6) * land;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (1080 - width) / 2,
              top: top + i * step,
              width,
              height: h,
              borderRadius: 30,
              background: `linear-gradient(170deg, ${c.surfaceHi}, ${c.surface})`,
              border: `2px solid ${c.border}`,
              boxShadow: shadows.card,
              display: "flex",
              alignItems: "center",
              gap: 34,
              padding: "0 44px",
              boxSizing: "border-box",
              opacity: Math.min(1, p * 2),
              transform: `translateY(${interpolate(p, [0, 1], [-260, 0])}px) rotate(${tilt}deg) scale(${interpolate(p, [0, 1], [1.12, 1])})`,
            }}
          >
            {item.icon ? (
              <LibraryIcon id={item.icon} size={120} />
            ) : (
              <div
                style={{
                  fontFamily: c.fontStrong,
                  fontSize: 80,
                  color: c.accent,
                  width: 120,
                  textAlign: "center",
                }}
              >
                {i + 1}
              </div>
            )}
            <div
              style={{
                fontFamily: c.fontSemi,
                fontSize,
                color: c.text,
                whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
              }}
            >
              {item.text}
            </div>
          </div>
        );
      })}
    </>
  );
}

type Node = { label: string; icon?: string; at: number };

type Point = { x: number; y: number };

// An arrow along a line of points that draws itself (`draw` 0 → 1): straight,
// or square corners like a UML diagram – never a loose curve.
function Arrow({
  points,
  draw,
  hot,
}: {
  points: Point[];
  draw: number;
  hot?: boolean;
}) {
  const c = usePack();
  const color = hot ? c.accent : c.textSoft;
  const d = points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const length = points
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y),
      0,
    );
  const to = points[points.length - 1];
  const before = points[points.length - 2];
  const angle = Math.atan2(to.y - before.y, to.x - before.x);
  const head = 26;
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={hot ? 1 : 0.6}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - draw)}
      />
      {draw >= 1 ? (
        <path
          d={`M ${to.x} ${to.y} L ${to.x - head * Math.cos(angle - 0.5)} ${to.y - head * Math.sin(angle - 0.5)} M ${to.x} ${to.y} L ${to.x - head * Math.cos(angle + 0.5)} ${to.y - head * Math.sin(angle + 0.5)}`}
          stroke={color}
          strokeOpacity={hot ? 1 : 0.6}
          strokeWidth={6}
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}

// How an arrow gets from one node to the next: "straight" – the shortest
// line between their edges; "elbow" – down from the first node, across, and
// down into the second, with square corners.
type Route = "straight" | "elbow";

// Nodes placed at points, with arrows between the ones `links` names; a
// link's third value marks it as the way back (drawn in the accent).
function NodeMap({
  nodes,
  points,
  links,
  route = "straight",
  hot,
}: {
  nodes: Node[];
  points: Point[];
  links: [number, number, boolean?][];
  route?: Route;
  // the node lit in the accent colour (the result, or the hub's centre)
  hot?: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Labels are the diagram's content, so they get the room: a two-word label
  // ("Decide next") next to an icon fell to ~38 px at 340 – 100 px, which a
  // split's 68 % then made unreadable on a phone (test 10).
  const fontSize = fitFontSize(
    nodes.map((node) => node.label),
    60 * c.widthFactor,
    400 - (nodes.some((node) => node.icon) ? 70 : 0),
  );
  const half = fontSize * 1.05 + 14; // half a pill's height, and a gap
  // a straight line stops short of both nodes
  const shorten = (a: Point, b: Point, by: number) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {
      x: b.x - ((b.x - a.x) / len) * by,
      y: b.y - ((b.y - a.y) / len) * by,
    };
  };
  const path = (a: Point, b: Point): Point[] => {
    if (route === "elbow") {
      const from = { x: a.x, y: a.y + half };
      const to = { x: b.x, y: b.y - half };
      const mid = (from.y + to.y) / 2;
      return Math.abs(a.x - b.x) < 4
        ? [from, to]
        : [from, { x: a.x, y: mid }, { x: b.x, y: mid }, to];
    }
    const gap = half + 40;
    return [shorten(b, a, gap), shorten(a, b, gap)];
  };
  return (
    <>
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {links.map(([a, b, back], i) => (
          <Arrow
            key={i}
            points={path(points[a], points[b])}
            // the way back draws after the last node; the others before theirs
            draw={ramp(frame, back ? nodes[a].at + 10 : nodes[b].at - 8, 10)}
            hot={back}
          />
        ))}
      </svg>
      {nodes.map((node, i) => {
        const p = pop(frame, node.at, fps);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: points[i].x,
              top: points[i].y + floatY(frame, i),
              transform: "translate(-50%, -50%)",
            }}
          >
            <div style={popStyle(p)}>
              <Pill
                label={node.label}
                icon={node.icon}
                fontSize={fontSize}
                hot={i === hot}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── A schema going down left and right, square-cornered arrows between.
export function SchemaZigzag({ nodes }: { nodes: Node[] }) {
  const step = 640 / Math.max(1, nodes.length - 1);
  const points = nodes.map((_, i) => ({
    x: i % 2 ? 720 : 360,
    y: stage.visualTop + 110 + i * step,
  }));
  const links = nodes.slice(1).map((_, i): [number, number] => [i, i + 1]);
  return (
    <NodeMap
      nodes={nodes}
      points={points}
      links={links}
      route="elbow"
      hot={nodes.length > 2 ? nodes.length - 1 : undefined}
    />
  );
}

// ── A schema with the first node in the middle and the others around it,
// arrows going out from the middle.
export function SchemaHub({ nodes }: { nodes: Node[] }) {
  const around = nodes.length - 1;
  const points = nodes.map((_, i) => {
    if (i === 0) return { x: 540, y: CY };
    const angle =
      ((-90 + (360 / around) * (i - 1) + (around === 2 ? 90 : 0)) * Math.PI) /
      180;
    return { x: 540 + 260 * Math.cos(angle), y: CY + 340 * Math.sin(angle) };
  });
  const links = nodes.slice(1).map((_, i): [number, number] => [0, i + 1]);
  return <NodeMap nodes={nodes} points={points} links={links} hot={0} />;
}

// ── A schema that goes round: the nodes on a ring, an arrow from each to
// the next, and – once the last one is there – the way back to the first,
// in the accent colour (write → check → fix → back to writing).
export function SchemaLoop({ nodes }: { nodes: Node[] }) {
  const n = nodes.length;
  const points = nodes.map((_, i) => {
    const angle = ((-90 + (360 / n) * i) * Math.PI) / 180;
    return { x: 540 + 250 * Math.cos(angle), y: CY + 300 * Math.sin(angle) };
  });
  const links = nodes.map((_, i): [number, number, boolean] => [
    i,
    (i + 1) % n,
    i === n - 1,
  ]);
  return <NodeMap nodes={nodes} points={points} links={links} />;
}

// ── A phone: the app's name on top, the items sliding in inside it like
// notifications or messages, each on its word.
export function PhoneBlock({
  title,
  items,
  at,
}: {
  title: string;
  items: Item[];
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = 480;
  const h = 830;
  const p = settle(frame, at, fps);
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    38 * c.widthFactor,
    w - 170,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - w / 2,
        top: CY - h / 2 + floatY(frame),
        width: w,
        height: h,
        borderRadius: 72,
        padding: 16,
        boxSizing: "border-box",
        background: `linear-gradient(160deg, ${c.surfaceHi}, ${c.surface})`,
        border: `2px solid ${c.border}`,
        boxShadow: shadows.card,
        opacity: Math.min(1, p * 2),
        transform: `translateY(${interpolate(p, [0, 1], [160, 0])}px)`,
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 58,
          background: c.bg,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: "30px 22px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            alignSelf: "center",
            width: 130,
            height: 34,
            borderRadius: 17,
            background: c.surface,
          }}
        />
        <div
          style={{
            fontFamily: c.fontStrong,
            fontSize: fitFontSize([title], 54 * c.widthFactor, w - 80),
            color: c.text,
            padding: "10px 8px 6px",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        {items.map((item, i) => {
          const q = pop(frame, item.at, fps);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "18px 18px",
                borderRadius: 26,
                background: c.surface,
                border: `2px solid ${c.border}`,
                opacity: Math.min(1, q * 2),
                transform: `translateY(${interpolate(q, [0, 1], [-50, 0])}px) scale(${interpolate(q, [0, 1], [0.9, 1])})`,
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 20,
                  background: c.surfaceHi,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon ? (
                  <LibraryIcon id={item.icon} size={56} />
                ) : (
                  <Sparkle size={40} color={c.accent} />
                )}
              </div>
              <div
                style={{
                  fontFamily: c.fontSemi,
                  fontSize,
                  color: c.text,
                  whiteSpace: "nowrap",
                }}
              >
                {item.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── A browser window: the address types itself, the page's parts appear
// one under another, each on its word.
export function BrowserBlock({
  url,
  items,
  at,
}: {
  url: string;
  items: Item[];
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const w = stage.contentWidth;
  const h = 700;
  const p = settle(frame, at, fps);
  const typed = Math.floor(Math.max(0, frame - at - 6) * 1.4);
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    50 * c.widthFactor,
    w - 220,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: CY - h / 2 + floatY(frame),
        width: w,
        height: h,
        borderRadius: 30,
        overflow: "hidden",
        background: c.surface,
        border: `2px solid ${c.border}`,
        boxShadow: shadows.card,
        opacity: Math.min(1, p * 2),
        transform: `translateY(${interpolate(p, [0, 1], [140, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "22px 28px",
          borderBottom: `2px solid ${c.border}`,
          background: c.surfaceHi,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((dot) => (
          <div
            key={dot}
            style={{ width: 20, height: 20, borderRadius: 10, background: dot }}
          />
        ))}
        <div
          style={{
            marginLeft: 20,
            flex: 1,
            height: 54,
            borderRadius: 27,
            background: c.bg,
            display: "flex",
            alignItems: "center",
            padding: "0 26px",
            fontFamily: c.fontRegular,
            fontSize: 30,
            color: c.textSoft,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          🔒 {url.slice(0, typed)}
        </div>
      </div>
      <div
        style={{
          padding: "34px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        {items.map((item, i) => {
          const q = settle(frame, item.at, fps);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 26,
                padding: "20px 26px",
                borderRadius: 22,
                background: i === 0 ? `${c.accent}22` : c.bg,
                borderLeft: `8px solid ${i === 0 ? c.accent : c.border}`,
                opacity: Math.min(1, q * 2),
                transform: `translateX(${interpolate(q, [0, 1], [-60, 0])}px)`,
              }}
            >
              {item.icon ? <LibraryIcon id={item.icon} size={64} /> : null}
              <div
                style={{
                  fontFamily: c.fontSemi,
                  fontSize,
                  color: c.text,
                  whiteSpace: "nowrap",
                }}
              >
                {item.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── A bar filling up to `value` %, the number counting with it.
export function ProgressBlock({
  value,
  label,
  at,
}: {
  value: number;
  label: string;
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = settle(frame, at, fps);
  const t = ramp(frame, at + 6, 30);
  const fill =
    (Math.max(0, Math.min(100, value)) / 100) * (1 - Math.pow(1 - t, 3));
  const landed = pop(frame, at + 36, fps);
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: CY - 220,
        width: stage.contentWidth,
        opacity: Math.min(1, appear * 2),
        transform: `translateY(${interpolate(appear, [0, 1], [80, 0])}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 30,
        }}
      >
        <div
          style={{
            fontFamily: c.fontSemi,
            fontSize: fitFontSize([label], 60 * c.widthFactor, 540),
            color: c.textSoft,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: c.fontStrong,
            fontSize: 150,
            lineHeight: 1,
            color: c.text,
            fontVariantNumeric: "tabular-nums",
            transform: `scale(${1 + 0.06 * Math.sin(Math.min(1, landed) * Math.PI)})`,
          }}
        >
          {Math.round(fill * 100)}
          <span style={{ color: c.accent }}>%</span>
        </div>
      </div>
      <div
        style={{
          height: 110,
          borderRadius: 55,
          background: c.surface,
          border: `2px solid ${c.border}`,
          boxShadow: shadows.card,
          padding: 12,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${fill * 100}%`,
            minWidth: fill > 0 ? 86 : 0,
            borderRadius: 43,
            background: `linear-gradient(90deg, ${c.accent}, ${c.accent2})`,
            boxShadow: `0 0 40px ${c.accent}66`,
          }}
        />
      </div>
    </div>
  );
}

// ── Keyboard keys in a row, each pressed (sinks and lights up) on its word;
// what the shortcut does below them.
export function KeysBlock({ keys, label }: { keys: Item[]; label: string }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const plus = 60;
  const width = Math.min(
    230,
    (stage.contentWidth - plus * (keys.length - 1)) / keys.length,
  );
  const fontSize = fitFontSize(
    keys.map((key) => key.text),
    84,
    width - 40,
    0.66,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: CY - 190,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 70,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        {keys.map((key, i) => {
          const p = pop(frame, key.at, fps);
          // pressed: down 14 px for a few frames after it lands
          const press =
            ramp(frame, key.at + 8, 3) - ramp(frame, key.at + 14, 5);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              {i ? (
                <div
                  style={{
                    width: plus,
                    textAlign: "center",
                    fontFamily: c.fontStrong,
                    fontSize: 60,
                    color: c.textSoft,
                    opacity: Math.min(1, p * 2),
                  }}
                >
                  +
                </div>
              ) : null}
              <div
                style={{
                  width,
                  height: width,
                  borderRadius: 36,
                  background: `linear-gradient(180deg, ${c.surfaceHi}, ${c.surface})`,
                  border: `2px solid ${press > 0.3 ? c.accent : c.border}`,
                  boxShadow: `0 ${18 - press * 14}px 0 ${c.bg}, 0 ${30 - press * 14}px 40px rgba(0,0,0,0.5)${press > 0.3 ? `, 0 0 50px ${c.accent}55` : ""}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: c.fontStrong,
                  fontSize,
                  color: c.text,
                  ...popStyle(p, 0.3),
                  transform: `translateY(${press * 14}px) scale(${interpolate(p, [0, 1], [0.3, 1])})`,
                }}
              >
                {key.text}
              </div>
            </div>
          );
        })}
      </div>
      {label ? (
        <div
          style={{
            fontFamily: c.fontSemi,
            fontSize: fitFontSize(
              [label],
              60 * c.widthFactor,
              stage.contentWidth,
            ),
            color: c.textSoft,
            whiteSpace: "nowrap",
            opacity: ramp(frame, (keys[keys.length - 1]?.at ?? 0) + 10, 8),
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

// ── One thing turns into another: the first card stands above, then on the
// second's word an arrow draws down from it and the second card – bigger, in
// the accent – lands below. Reads as "this becomes that", top to bottom.
export function TransformBlock({ from, to }: { from: Node; to: Node }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = pop(frame, from.at, fps);
  const b = pop(frame, to.at, fps);
  const draw = ramp(frame, to.at - 8, 8);
  // the first steps back a little once the second has come
  const back = settle(frame, to.at, fps);
  const card = (
    node: Node,
    hot: boolean,
    top: number,
    p: number,
    scale: number,
  ) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: top + floatY(frame, hot ? 1 : 0),
        display: "flex",
        justifyContent: "center",
        ...popStyle(p, 0.5),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 34,
          maxWidth: stage.contentWidth,
          padding: node.icon ? "26px 54px 26px 30px" : "34px 64px",
          borderRadius: 40,
          background: hot
            ? `linear-gradient(160deg, ${c.accent}, ${c.accent2})`
            : `linear-gradient(160deg, ${c.surfaceHi}, ${c.surface})`,
          border: `2px solid ${hot ? "transparent" : c.border}`,
          boxShadow: `${shadows.card}${hot ? `, 0 0 80px ${c.accent}55` : ""}`,
          transform: `scale(${scale})`,
        }}
      >
        {node.icon ? <LibraryIcon id={node.icon} size={150} /> : null}
        <div
          style={{
            fontFamily: c.fontStrong,
            fontSize: fitFontSize(
              [node.label],
              86 * c.widthFactor,
              stage.contentWidth - (node.icon ? 300 : 140),
              0.66,
            ),
            color: hot ? c.bg : c.text,
            whiteSpace: "nowrap",
            letterSpacing: "-0.03em",
          }}
        >
          {node.label}
        </div>
      </div>
    </div>
  );
  const arrowTop = CY - 110;
  return (
    <>
      {card(from, false, CY - 360, a, 1 - 0.1 * back)}
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <Arrow
          points={[
            { x: 540, y: arrowTop },
            { x: 540, y: arrowTop + 170 },
          ]}
          draw={draw}
          hot
        />
      </svg>
      {card(to, true, CY + 90, b, 1.08)}
    </>
  );
}

// ── Comments under a video, the way an app's comment sheet looks: a sheet
// with "N comments" on top, then each comment – avatar, a grey @name, the
// text, "Reply" – with a heart and its count on the right, no box around it.
// The names are default-style handles ("@user4821"): the comments stand for
// anyone, not for real people.
const HANDLES = ["@user4821", "@user1907", "@user6350", "@user2274"];
const LIKES = [128, 64, 41, 17];

function CommentSheet({ items }: { items: Item[] }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rowH = 170;
  const head = 110;
  const height = head + items.length * rowH + 40;
  const top = CY - height / 2;
  const sheet = settle(frame, items[0]?.at ?? 0, fps);
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    50,
    stage.contentWidth - 300,
    0.55,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT - 20,
        top,
        width: stage.contentWidth + 40,
        height,
        borderRadius: 40,
        background: c.surface,
        border: `2px solid ${c.border}`,
        boxShadow: shadows.card,
        fontFamily: c.fontUi,
        opacity: Math.min(1, sheet * 2),
        transform: `translateY(${interpolate(sheet, [0, 1], [160, 0])}px)`,
      }}
    >
      <div
        style={{
          height: head,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          fontWeight: 700,
          color: c.text,
          borderBottom: `2px solid ${c.border}`,
        }}
      >
        {items.length * 412} comments
      </div>
      {items.map((item, i) => {
        const p = pop(frame, item.at, fps);
        const liked = pop(frame, item.at + 10, fps);
        return (
          <div
            key={i}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              gap: 26,
              padding: "0 40px",
              opacity: Math.min(1, p * 2),
              transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
            }}
          >
            <div
              style={{
                width: 92,
                height: 92,
                borderRadius: 46,
                flexShrink: 0,
                background: `linear-gradient(140deg, ${[c.accent, c.accent2, c.textSoft, c.surfaceHi][i % 4]}, ${c.bg})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.icon ? <LibraryIcon id={item.icon} size={60} /> : null}
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 30, color: c.textSoft, fontWeight: 600 }}>
                {HANDLES[i % HANDLES.length]}
              </div>
              <div
                style={{
                  fontSize,
                  color: c.text,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {item.text}
              </div>
              <div style={{ fontSize: 28, color: c.textSoft }}>
                {i + 1}m · Reply
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                color: c.textSoft,
                fontSize: 28,
              }}
            >
              <div
                style={{
                  fontSize: 52,
                  lineHeight: 1,
                  color: liked > 0.5 ? c.accent : c.textSoft,
                  transform: `scale(${1 + 0.3 * Math.sin(Math.min(1, liked) * Math.PI)})`,
                }}
              >
                {liked > 0.5 ? "♥" : "♡"}
              </div>
              {LIKES[i % LIKES.length] + (liked > 0.5 ? 1 : 0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── A conversation as bubbles, one at a time. "messages": what is sent
// (right, in the accent) and what comes back (left), taking turns from the
// first – a reply is preceded by three typing dots. "comments": the comment
// sheet above.
export function ChatBlock({
  items,
  variant = "messages",
}: {
  items: Item[];
  variant?: "messages" | "comments";
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gap = 34;
  const rowH = 150;
  const top = CY - (items.length * rowH + (items.length - 1) * gap) / 2;
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    56 * c.widthFactor,
    640,
  );
  if (variant === "comments") return <CommentSheet items={items} />;
  return (
    <>
      {items.map((item, i) => {
        const p = pop(frame, item.at, fps);
        const y = top + i * (rowH + gap);
        const sent = i % 2 === 0;
        // a reply: three dots "typing" for a moment before it
        const typing = !sent && frame >= item.at - 14 && frame < item.at;
        const bubble = {
          position: "absolute" as const,
          top: y,
          ...(sent ? { right: LEFT } : { left: LEFT }),
          maxWidth: 760,
          padding: "0 46px",
          height: rowH,
          display: "flex",
          alignItems: "center",
          borderRadius: 50,
          ...(sent
            ? { borderBottomRightRadius: 12 }
            : { borderBottomLeftRadius: 12 }),
          background: sent ? c.accent : c.surfaceHi,
          border: sent ? "none" : `2px solid ${c.border}`,
          boxShadow: shadows.card,
        };
        if (typing)
          return (
            <div key={i} style={{ ...bubble, gap: 16 }}>
              {[0, 1, 2].map((d) => (
                <div
                  key={d}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: c.textSoft,
                    opacity: 0.4 + 0.6 * Math.max(0, Math.sin(frame / 4 - d)),
                  }}
                />
              ))}
            </div>
          );
        return (
          <div
            key={i}
            style={{
              ...bubble,
              fontFamily: c.fontUi,
              fontWeight: 600,
              fontSize,
              color: sent ? c.bg : c.text,
              whiteSpace: "nowrap",
              opacity: Math.min(1, p * 2),
              transformOrigin: sent ? "100% 100%" : "0% 100%",
              transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`,
            }}
          >
            {item.text}
          </div>
        );
      })}
    </>
  );
}
