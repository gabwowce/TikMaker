import { useContext, type ReactNode } from "react";
import { VisualStartContext } from "../visuals/visualStart";
import type { BlockFromAi } from "../../agent/run/4-blocks";
import {
  BigNumber,
  Compare,
  FlowSchema,
  HeroObject,
  LibraryIcon,
  ScreenBody,
  TerminalBody,
} from "./StageBlocks";
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
// frames apart.
const STEP = 8;
// Far enough back that every build-up of a block's content has finished.
const SETTLED_FRAMES = 600;

export function StageBlock({ block, at }: { block: BlockFromAi; at: number }) {
  const times = (n: number) =>
    Array.from({ length: n }, (_, i) => at + i * STEP);
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
      return (
        <DeckCard at={at} height={600}>
          <ScreenBody label={block.text ?? ""} />
        </DeckCard>
      );
    case "list":
      return (
        <BigList
          top={stage.visualTop + 90}
          items={(block.items ?? []).map((text, i) => ({
            text,
            at: at + i * STEP,
          }))}
        />
      );
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
        />
      );
    case "object":
      return <HeroObject id={block.id ?? ""} at={at} />;
    case "schema": {
      const nodes = block.nodes ?? [];
      return (
        <FlowSchema
          nodes={nodes.map((node) => ({ label: node.label, icon: node.id }))}
          ats={times(nodes.length)}
        />
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
// of the top zone, the block drawn inside it as if on the full frame. It
// starts on the layer's own start (its delay), so moving the layer on the
// timeline moves the block's animation with it. A `settled` block (carried
// in from the previous scene) is drawn as if it had arrived long ago, so its
// content does not build itself up a second time.
export function StageBlockVisual({
  block,
  settled,
}: {
  block: BlockFromAi;
  settled?: boolean;
}) {
  const start = useContext(VisualStartContext) - (settled ? SETTLED_FRAMES : 0);
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
        <StageBlock block={block} at={start} />
      </div>
    </div>
  );
}
