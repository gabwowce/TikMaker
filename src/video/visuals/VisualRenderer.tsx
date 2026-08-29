import React from "react";
import { Img } from "remotion";
import type { VisualConfig } from "../../schema/visual";
import { ToolLogo } from "./assets/ToolLogo";
import { ToolFlow } from "./assets/ToolFlow";
import { PropAsset } from "./assets/PropAsset";
import { ScreenRecording } from "./media/ScreenRecording";
import { BrowserMockup } from "./devices/BrowserMockup";
import { PhoneMockup } from "./devices/PhoneMockup";
import { StatCounter } from "./data/StatCounter";
import { Checklist } from "./data/Checklist";
import { PricingCard } from "./data/PricingCard";
import { AppMockup } from "./data/AppMockup";
import { ProgressBar } from "./data/ProgressBar";
import { Flow } from "./diagrams/Flow";
import { NodeGroup } from "./diagrams/NodeGroup";
import { Stack } from "./diagrams/Stack";
import { Transform } from "./diagrams/Transform";
import { CornerFloat } from "./diagrams/CornerFloat";
import { Keycap } from "./dev/Keycap";
import { Terminal } from "./dev/Terminal";
import { CodeDiff } from "./dev/CodeDiff";
import { ClaudeCli } from "./dev/ClaudeCli";
import { assetUrl } from "../../utils/assetUrl";

/** Centers whatever visual is dropped inside a browser/phone frame and lets it
 * fill the screen area — an `image` or `recording` put in a frame should read as
 * the screen's content, not as a graphic floating at the top-left of it. */
const FrameContent: React.FC<{ visual: VisualConfig }> = ({ visual }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}
  >
    <VisualRenderer visual={visual} />
  </div>
);

export const VisualRenderer: React.FC<{ visual: VisualConfig }> = ({ visual }) => {
  switch (visual.type) {
    case "tool-logo":
      return <ToolLogo tool={visual.tool} showName={visual.showName} />;

    case "tool-flow":
      return <ToolFlow tools={visual.tools} />;

    case "prop":
      return <PropAsset name={visual.asset} />;

    case "image":
      return <Img src={assetUrl(visual.src)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />;

    case "recording": {
      const recording = (
        <ScreenRecording
          src={visual.src}
          startFrom={visual.startFrom}
          endAt={visual.endAt}
          playbackRate={visual.playbackRate}
          fit={visual.fit}
          crop={visual.crop}
        />
      );
      if (visual.frame === "browser")
        return (
          <BrowserMockup url={visual.url} title={visual.title} tabs={visual.tabs}>
            {recording}
          </BrowserMockup>
        );
      if (visual.frame === "phone") return <PhoneMockup>{recording}</PhoneMockup>;
      return <div style={{ width: 860, aspectRatio: "16 / 10" }}>{recording}</div>;
    }

    case "browser":
      return (
        <BrowserMockup url={visual.url} title={visual.title} tabs={visual.tabs}>
          <FrameContent visual={visual.content} />
        </BrowserMockup>
      );

    case "phone":
      return (
        <PhoneMockup>
          <FrameContent visual={visual.content} />
        </PhoneMockup>
      );

    case "stat-counter":
      return (
        <StatCounter
          from={visual.from}
          to={visual.to}
          label={visual.label}
          prefix={visual.prefix}
          suffix={visual.suffix}
          decimals={visual.decimals}
          sfx={visual.sfx}
        />
      );

    case "checklist":
      return (
        <Checklist
          items={visual.items}
          font={visual.font}
          size={visual.size}
          stagger={visual.stagger}
          sfx={visual.sfx}
        />
      );

    case "pricing-card":
      return (
        <PricingCard
          title={visual.title}
          price={visual.price}
          period={visual.period}
          features={visual.features}
          highlight={visual.highlight}
        />
      );

    case "app-mockup":
      return (
        <AppMockup
          appTitle={visual.appTitle}
          kind={visual.kind}
          items={visual.items}
          stat={visual.stat}
          chartValues={visual.chartValues}
        />
      );

    case "progress":
      return <ProgressBar value={visual.value} max={visual.max} label={visual.label} />;

    case "flow":
      return <Flow nodes={visual.nodes} direction={visual.direction} animated={visual.animated} />;

    case "node-group":
      return (
        <NodeGroup
          center={visual.center}
          nodes={visual.nodes}
          layout={visual.layout}
          radius={visual.radius}
          speed={visual.speed}
        />
      );

    case "stack":
      return <Stack items={visual.items} direction={visual.direction} />;

    case "transform":
      return <Transform from={visual.from} to={visual.to} holdFrames={visual.holdFrames} />;

    case "keycap":
      return <Keycap keys={visual.keys} caption={visual.caption} />;

    case "terminal":
      return <Terminal title={visual.title} lines={visual.lines} cursor={visual.cursor} />;

    case "code-diff":
      return <CodeDiff filename={visual.filename} lines={visual.lines} />;

    case "claude-cli":
      return (
        <ClaudeCli
          transcript={visual.transcript}
          input={visual.input}
          mode={visual.mode}
          modeActive={visual.modeActive}
          overlay={visual.overlay}
        />
      );

    case "corner-props":
      return (
        <CornerFloat
          assets={visual.assets}
          diagonal={visual.diagonal}
          size={visual.size}
          speed={visual.speed}
          offsets={visual.offsets}
        />
      );

    default:
      return null;
  }
};
