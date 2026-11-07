import { useContext, type ReactNode } from "react";
import { VisualStartContext } from "../visuals/visualStart";
import type { BlockFromAi } from "../../agent/run/4-blocks";
import {
  BigNumber,
  Compare,
  FlowSchema,
  FullScreen,
  HeroObject,
  LibraryIcon,
  PictureBlock,
  ScreenBody,
  TerminalBody,
} from "./StageBlocks";
import {
  BrowserBlock,
  ChatBlock,
  KeysBlock,
  ListGrid,
  ListOrbit,
  ListStack,
  PhoneBlock,
  ProgressBlock,
  SchemaHub,
  SchemaLoop,
  SchemaZigzag,
  TransformBlock,
} from "./StageShapes";
import type { ZonePlacement } from "./stageTypes";
import {
  BigList,
  CodeBody,
  CoinChain,
  DeckCard,
  NumberBadge,
} from "./StageVisuals";
import { stage } from "./tokens";

// One block drawn from its data (src/agent/run/4-blocks.ts) – the one place
// that turns the agent's block into a component. `at` is the frame its word
// is said on; the parts inside it (coins, list points, nodes) follow STEP
// frames apart – or each on its own spoken word when `partAts` gives them.
const STEP = 8;
// Far enough back that every build-up of a block's content has finished.
const SETTLED_FRAMES = 600;
// On a "full" stage a block other than a screen is drawn as in the top zone,
// a little bigger, centred above the spoken words.
const FULL_CENTER_Y = 860;
const FULL_SCALE = 1.12;

type StageBlockProps = {
  block: BlockFromAi;
  at: number;
  full?: boolean;
  src?: string;
  partAts?: number[];
};

export function StageBlock({ block, at, full, src, partAts }: StageBlockProps) {
  // When each part appears: on its word when `partAts` gives it, never
  // closer than STEP to the one before (two parts can share a word).
  const times = (n: number) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const own = at + (partAts?.[i] ?? i * STEP);
      out.push(i ? Math.max(own, out[i - 1] + STEP) : own);
    }
    return out;
  };
  // The block's items with their icons and frames (list, phone, browser, keys).
  const items = () => {
    const texts = block.items ?? [];
    const ats = times(texts.length);
    return texts.map((text, i) => ({
      text,
      icon: block.itemIcons?.[i],
      at: ats[i],
    }));
  };
  const nodes = () => {
    const all = block.nodes ?? [];
    const ats = times(all.length);
    return all.map((node, i) => ({
      label: node.label,
      icon: node.id,
      at: ats[i],
    }));
  };
  switch (block.kind) {
    case "logos": {
      const ids = block.ids ?? [];
      return (
        <CoinChain
          at={at}
          ats={times(ids.length)}
          icons={ids.map((id) => (
            <LibraryIcon key={id} id={id} size={120} />
          ))}
        />
      );
    }
    case "code":
      return (
        <DeckCard at={at} height={560}>
          <CodeBody at={at} file={block.file ?? ""} lines={block.lines ?? []} />
        </DeckCard>
      );
    case "terminal":
      return (
        <DeckCard at={at} height={520}>
          <TerminalBody at={at} lines={block.lines ?? []} />
        </DeckCard>
      );
    case "screen":
      if (full)
        return (
          <FullScreen
            src={src}
            label={block.text ?? ""}
            seconds={block.seconds}
            at={at}
          />
        );
      return (
        <DeckCard at={at} height={600}>
          <ScreenBody
            src={src}
            label={block.text ?? ""}
            seconds={block.seconds}
            at={at}
          />
        </DeckCard>
      );
    case "list":
      switch (block.shape) {
        case "grid":
          return <ListGrid items={items()} />;
        case "orbit":
          return (
            <ListOrbit
              items={items()}
              center={block.text}
              centerIcon={block.id}
              at={at}
            />
          );
        case "stack":
          return <ListStack items={items()} />;
        default:
          return <BigList top={stage.visualTop + 90} items={items()} />;
      }
    case "phone":
      return <PhoneBlock title={block.text ?? ""} items={items()} at={at} />;
    case "browser":
      return <BrowserBlock url={block.text ?? ""} items={items()} at={at} />;
    case "picture":
      return (
        <PictureBlock
          src={src}
          label={block.text ?? ""}
          look={block.look}
          full={full}
          at={at}
        />
      );
    case "chat":
      return (
        <ChatBlock
          items={items()}
          variant={block.shape === "comments" ? "comments" : "messages"}
        />
      );
    case "keys":
      return <KeysBlock keys={items()} label={block.text ?? ""} />;
    case "progress":
      return (
        <ProgressBlock
          value={block.value ?? 0}
          label={block.text ?? ""}
          at={at}
        />
      );
    case "transform": {
      const [from, to] = nodes();
      if (!from || !to) return null;
      return <TransformBlock from={from} to={to} />;
    }
    case "number": {
      const value = block.value ?? 0;
      return (
        <BigNumber
          at={at}
          to={value}
          decimals={Number.isInteger(value) ? 0 : 2}
          prefix={block.prefix}
          suffix={block.suffix}
          label={block.text ?? ""}
        />
      );
    }
    case "compare": {
      const empty = { label: "", value: "" };
      return (
        <Compare
          at={at}
          before={block.before ?? empty}
          after={block.after ?? empty}
        />
      );
    }
    case "badge":
      return (
        <NumberBadge
          label={block.text ?? ""}
          at={at}
          top={stage.visualCenterY - 100}
          // its line points to what comes below it; in a stage nothing does –
          // the next block takes its place – so it would point at nothing
          line={false}
        />
      );
    case "object":
      return <HeroObject id={block.id ?? ""} at={at} />;
    case "schema":
      switch (block.shape) {
        case "zigzag":
          return <SchemaZigzag nodes={nodes()} />;
        case "hub":
          return <SchemaHub nodes={nodes()} />;
        case "loop":
          return <SchemaLoop nodes={nodes()} />;
        default:
          return (
            <FlowSchema nodes={nodes()} ats={nodes().map((node) => node.at)} />
          );
      }
  }
}

// Top-zone content at a stage type's placement: moved so the zone's centre
// lands on `y`, scaled around that centre.
export function StageZone({
  place,
  children,
}: {
  place: ZonePlacement;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `540px ${stage.visualCenterY}px`,
        transform: `translateY(${place.y - stage.visualCenterY}px) scale(${place.scale})`,
      }}
    >
      {children}
    </div>
  );
}

// A block as a visual layer in a project (type "stage-block"): a box the size
// of the top zone (the whole frame on a "full" stage), the block drawn inside
// it as if on the full frame. It starts on the layer's own start (its delay),
// so moving the layer on the timeline moves the block's animation with it. A
// `settled` block (carried in from the previous scene) is drawn as if it had
// arrived long ago, so its content does not build itself up a second time.
export function StageBlockVisual({
  block,
  settled,
  full,
  src,
  partAts,
}: Omit<StageBlockProps, "at"> & { settled?: boolean }) {
  const start = useContext(VisualStartContext) - (settled ? SETTLED_FRAMES : 0);
  const drawn = (
    <StageBlock
      block={block}
      at={start}
      full={full}
      src={src}
      partAts={partAts}
    />
  );
  if (full)
    return (
      <div style={{ position: "relative", width: 1080, height: 1920 }}>
        {block.kind === "screen" || block.kind === "picture" ? (
          drawn
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: `540px ${stage.visualCenterY}px`,
              transform: `translateY(${FULL_CENTER_Y - stage.visualCenterY}px) scale(${FULL_SCALE})`,
            }}
          >
            {drawn}
          </div>
        )}
      </div>
    );
  return (
    <div
      style={{
        position: "relative",
        width: 1080,
        height: stage.visualBottom - stage.visualTop,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -stage.visualTop,
          width: 1080,
          height: 1920,
        }}
      >
        {drawn}
      </div>
    </div>
  );
}
