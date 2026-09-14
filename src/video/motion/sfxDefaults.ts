import sfxOverrides from "../../config/sfxOverrides.json";
import { getSfx } from "../../registries/sfxRegistry";
import type {
  EntrancePreset,
  ExitPreset,
  RichTextSplitBy,
} from "../../schema/scene";
export const SFX_NONE = "none";
export const SFX_VOLUME = 0.35;
export type SfxDefaultKind = "content" | "visual";
const contentEntranceDefaultsBase: Partial<Record<EntrancePreset, string>> = {
  slideUp: "soft-whoosh",
  slideDown: "soft-whoosh",
  slideLeft: "paper-slide",
  slideRight: "paper-slide",
  scaleIn: "swoosh-mt7et8uk",
  pop: "d-pop",
};
const contentExitDefaultsBase: Partial<Record<ExitPreset, string>> = {
  slideUp: "soft-whoosh",
  slideDown: "soft-whoosh",
  slideLeft: "soft-whoosh",
  slideRight: "soft-whoosh",
  scaleOut: "d-pop",
};
const visualEntranceDefaultsBase: Partial<Record<EntrancePreset, string>> = {
  ...contentEntranceDefaultsBase,
};
const visualExitDefaultsBase: Partial<Record<ExitPreset, string>> = {
  ...contentExitDefaultsBase,
};
type SfxOverridesFile = {
  content?: {
    entrance?: Record<string, string>;
    exit?: Record<string, string>;
  };
  visual?: {
    entrance?: Record<string, string>;
    exit?: Record<string, string>;
  };
};
const overrides = sfxOverrides as SfxOverridesFile;
const entranceDefaultsByKind: Record<
  SfxDefaultKind,
  Partial<Record<EntrancePreset, string>>
> = {
  content: { ...contentEntranceDefaultsBase, ...overrides.content?.entrance },
  visual: { ...visualEntranceDefaultsBase, ...overrides.visual?.entrance },
};
const exitDefaultsByKind: Record<
  SfxDefaultKind,
  Partial<Record<ExitPreset, string>>
> = {
  content: { ...contentExitDefaultsBase, ...overrides.content?.exit },
  visual: { ...visualExitDefaultsBase, ...overrides.visual?.exit },
};
export function resolveEntranceSfx(args: {
  override?: string;
  entrance?: EntrancePreset;
  kind?: SfxDefaultKind;
}): string | undefined {
  const { override, entrance, kind = "content" } = args;
  if (override === SFX_NONE) return undefined;
  if (override && getSfx(override)) return override;
  const defaults = entranceDefaultsByKind[kind];
  if (entrance && defaults[entrance]) return defaults[entrance];
  return undefined;
}
export function resolveTextEntranceSfx(args: {
  override?: string;
  entrance?: EntrancePreset;
  splitBy?: RichTextSplitBy;
}): string | undefined {
  const { override, entrance, splitBy } = args;
  if (override === SFX_NONE) return undefined;
  if (override && getSfx(override)) return override;
  if (entrance === "slideUp" && splitBy === "word") return "type-word";
  const defaults = entranceDefaultsByKind.content;
  if (entrance && defaults[entrance]) return defaults[entrance];
  if (splitBy === "word" || splitBy === "letter") return "type-word";
  return undefined;
}
export function resolveExitSfx(args: {
  override?: string;
  exit?: ExitPreset;
  kind?: SfxDefaultKind;
}): string | undefined {
  const { override, exit, kind = "content" } = args;
  if (override === SFX_NONE) return undefined;
  if (override && getSfx(override)) return override;
  const defaults = exitDefaultsByKind[kind];
  if (exit && defaults[exit]) return defaults[exit];
  return undefined;
}
export function resolveExplicitSfx(id?: string): string | undefined {
  if (!id || id === SFX_NONE) return undefined;
  return getSfx(id) ? id : undefined;
}
export function resolveDefaultSfx(
  override: string | undefined,
  defaultId: string,
): string | undefined {
  if (override === SFX_NONE) return undefined;
  if (override && getSfx(override)) return override;
  return getSfx(defaultId) ? defaultId : undefined;
}
