import { z } from "zod";

export const toolIdSchema = z.string();
export const propIdSchema = z.string();

export type VisualConfig =
  | { type: "tool-logo"; tool: string; showName?: boolean }
  | { type: "tool-flow"; tools: string[] }
  | { type: "prop"; asset: string }
  | { type: "image"; src: string }
  | {
      type: "recording";
      src: string;
      frame: "none" | "browser" | "phone";
      playbackRate?: number;
      startFrom?: number;
      endAt?: number;
      fit?: "cover" | "contain";
      crop?: { x: number; y: number; width: number; height: number };
      /** Chrome for `frame: "browser"` — the address bar and tab strip make a
       * recording read as a real session instead of a floating rectangle. */
      url?: string;
      title?: string;
      tabs?: string[];
    }
  | { type: "browser"; url?: string; title?: string; tabs?: string[]; content: VisualConfig }
  | { type: "phone"; content: VisualConfig }
  | {
      type: "stat-counter";
      from: number;
      to: number;
      label?: string;
      prefix?: string;
      suffix?: string;
      decimals?: number;
      /** Sound effect id (see `sfxRegistry`) ticking as the number counts up —
       * defaults to "counter-short"; "none" silences it. */
      sfx?: string;
    }
  | {
      type: "checklist";
      items: { label: string; done?: boolean }[];
      font?: "tanker" | "clash";
      size?: "hero" | "headline" | "title" | "bodyLarge" | "body" | "label";
      stagger?: number;
      /** Sound effect id (see `sfxRegistry`) played as each item reveals —
       * defaults to "check"; "none" silences it. */
      sfx?: string;
    }
  | {
      type: "pricing-card";
      title: string;
      price: string;
      period?: string;
      features?: string[];
      highlight?: boolean;
    }
  | {
      type: "app-mockup";
      appTitle: string;
      kind: "list" | "stat" | "chart";
      items?: string[];
      stat?: { value: string; label: string };
      chartValues?: number[];
    }
  | { type: "progress"; value: number; max: number; label?: string }
  | { type: "keycap"; keys: string[]; caption?: string }
  | {
      type: "claude-cli";
      transcript?: { text: string; kind?: "user" | "tool" | "result" | "dim" }[];
      input?: string;
      mode?: string;
      modeActive?: boolean;
      overlay?: { title: string; items: { text: string; selected?: boolean }[] };
    }
  | {
      type: "terminal";
      title?: string;
      lines: { text: string; kind?: "prompt" | "output" | "accent" | "dim" }[];
      /** Blinking block cursor after the last line. */
      cursor?: boolean;
    }
  | {
      type: "code-diff";
      filename?: string;
      lines: { text: string; kind?: "added" | "removed" | "context" }[];
    }
  | {
      type: "flow";
      nodes: { label?: string; visual?: VisualConfig }[];
      direction?: "horizontal" | "vertical";
      animated?: boolean;
    }
  | {
      type: "node-group";
      center?: VisualConfig;
      nodes: VisualConfig[];
      layout: "orbit" | "radial" | "one-to-many";
      radius?: number;
      speed?: number;
    }
  | { type: "stack"; items: VisualConfig[]; direction?: "vertical" | "horizontal" }
  | { type: "transform"; from: VisualConfig; to: VisualConfig; holdFrames?: number }
  | {
      type: "corner-props";
      assets: VisualConfig[];
      diagonal?: "tlbr" | "trbl";
      size?: number;
      speed?: number;
      /** Per-asset position override, in percent of frame width/height —
       * index-matched to `assets`. Falls back to the diagonal's default
       * corner slot when an entry is missing. */
      offsets?: { x: number; y: number }[];
    };

const cropSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const visualConfigSchema: z.ZodType<VisualConfig> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tool-logo"),
    tool: toolIdSchema,
    showName: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("tool-flow"),
    tools: z.array(toolIdSchema).min(2).max(4),
  }),
  z.object({
    type: z.literal("prop"),
    asset: propIdSchema,
  }),
  z.object({
    type: z.literal("image"),
    src: z.string(),
  }),
  z.object({
    type: z.literal("recording"),
    src: z.string(),
    frame: z.enum(["none", "browser", "phone"]).default("none"),
    playbackRate: z.number().positive().optional(),
    startFrom: z.number().min(0).optional(),
    endAt: z.number().min(0).optional(),
    fit: z.enum(["cover", "contain"]).optional(),
    crop: cropSchema.optional(),
    url: z.string().optional(),
    title: z.string().optional(),
    tabs: z.array(z.string()).max(3).optional(),
  }),
  z.object({
    type: z.literal("browser"),
    url: z.string().optional(),
    title: z.string().optional(),
    tabs: z.array(z.string()).max(3).optional(),
    content: z.lazy(() => visualConfigSchema),
  }),
  z.object({
    type: z.literal("phone"),
    content: z.lazy(() => visualConfigSchema),
  }),
  z.object({
    type: z.literal("stat-counter"),
    from: z.number(),
    to: z.number(),
    label: z.string().optional(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    decimals: z.number().min(0).max(4).optional(),
    sfx: z.string().optional(),
  }),
  z.object({
    type: z.literal("checklist"),
    items: z.array(z.object({ label: z.string(), done: z.boolean().optional() })).min(1),
    font: z.enum(["tanker", "clash"]).optional(),
    size: z.enum(["hero", "headline", "title", "bodyLarge", "body", "label"]).optional(),
    stagger: z.number().min(0).max(60).optional(),
    sfx: z.string().optional(),
  }),
  z.object({
    type: z.literal("pricing-card"),
    title: z.string(),
    price: z.string(),
    period: z.string().optional(),
    features: z.array(z.string()).optional(),
    highlight: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("app-mockup"),
    appTitle: z.string(),
    kind: z.enum(["list", "stat", "chart"]),
    items: z.array(z.string()).optional(),
    stat: z.object({ value: z.string(), label: z.string() }).optional(),
    chartValues: z.array(z.number()).optional(),
  }),
  z.object({
    type: z.literal("progress"),
    value: z.number(),
    max: z.number(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("keycap"),
    keys: z.array(z.string()).min(1).max(4),
    caption: z.string().optional(),
  }),
  z.object({
    type: z.literal("claude-cli"),
    transcript: z
      .array(
        z.object({
          text: z.string(),
          kind: z.enum(["user", "tool", "result", "dim"]).optional(),
        })
      )
      .max(6)
      .optional(),
    input: z.string().optional(),
    mode: z.string().optional(),
    modeActive: z.boolean().optional(),
    overlay: z
      .object({
        title: z.string(),
        items: z.array(z.object({ text: z.string(), selected: z.boolean().optional() })).min(1).max(5),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("terminal"),
    title: z.string().optional(),
    lines: z
      .array(
        z.object({
          text: z.string(),
          kind: z.enum(["prompt", "output", "accent", "dim"]).optional(),
        })
      )
      .min(1)
      .max(8),
    cursor: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("code-diff"),
    filename: z.string().optional(),
    lines: z
      .array(
        z.object({
          text: z.string(),
          kind: z.enum(["added", "removed", "context"]).optional(),
        })
      )
      .min(1)
      .max(8),
  }),
  z.object({
    type: z.literal("flow"),
    nodes: z
      .array(
        z.object({
          label: z.string().optional(),
          visual: z.lazy(() => visualConfigSchema).optional(),
        })
      )
      .min(2)
      .max(5),
    direction: z.enum(["horizontal", "vertical"]).optional(),
    animated: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("node-group"),
    center: z.lazy(() => visualConfigSchema).optional(),
    nodes: z.array(z.lazy(() => visualConfigSchema)).min(1).max(6),
    layout: z.enum(["orbit", "radial", "one-to-many"]),
    radius: z.number().min(150).max(700).optional(),
    speed: z.number().min(-3).max(3).optional(),
  }),
  z.object({
    type: z.literal("stack"),
    items: z.array(z.lazy(() => visualConfigSchema)).min(1).max(6),
    direction: z.enum(["vertical", "horizontal"]).optional(),
  }),
  z.object({
    type: z.literal("transform"),
    from: z.lazy(() => visualConfigSchema),
    to: z.lazy(() => visualConfigSchema),
    holdFrames: z.number().min(0).optional(),
  }),
  z.object({
    type: z.literal("corner-props"),
    assets: z.array(z.lazy(() => visualConfigSchema)).min(1).max(2),
    diagonal: z.enum(["tlbr", "trbl"]).optional(),
    size: z.number().min(200).max(900).optional(),
    speed: z.number().min(0).max(3).optional(),
    offsets: z
      .array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }))
      .max(2)
      .optional(),
  }),
]) as z.ZodType<VisualConfig>;
