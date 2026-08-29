import { getSfx } from "../../registries/sfxRegistry";
import type { EntrancePreset, ExitPreset, RichTextSplitBy } from "../../schema/scene";
import sfxOverrides from "../../config/sfxOverrides.json";

/** Sentinel value authors can pick in the Inspector to explicitly silence an
 * otherwise-automatic sound cue (as opposed to leaving the field unset, which
 * means "auto"). */
export const SFX_NONE = "none";

/** Shared playback volume for every sfx cue in the system (scene cues, block/
 * rich-headline word cues, visual entrance/exit, checklist/counter ticks).
 * ~-9dB below unity gain (0.5 linear ≈ -6dB was judged too loud against
 * narration/music) — audible without fighting for attention. Change here,
 * not per-callsite, so the whole video stays consistently mixed. */
export const SFX_VOLUME = 0.35;

/** There are two independent default tables, not one: the scene's text/badge
 * cue (`motion.sfx`, fired once per scene, plus Blocks/Rich Headline lines)
 * and the primary visual's own entrance (`visualSfx`). Sharing one table
 * meant picking a sound for "slideUp" changed both a headline whoosh and a
 * screenshot's reveal sound identically — which reads as one flat, repetitive
 * cue across a whole video. Keeping them separate lets a video have a crisp
 * click for text and a soft bloom for visuals, say, even though both use the
 * same slideUp preset. Each table is user-editable from the editor's Sound
 * library (Defaults section, split into "Text / content" and "Visual"
 * columns) and persisted to `src/config/sfxOverrides.json`. */
export type SfxDefaultKind = "content" | "visual";

/** "whoosh", "swipe", and "bloom" were pulled from the sound pack for quality
 * reasons (2026-08-24) — see `removedSfxIds` in `sfxRegistry.ts`. Replaced
 * here with "paper-slide" (closest built-in fit for a horizontal slide),
 * "soft-whoosh" (already used for vertical slides), and the user-uploaded
 * "swoosh" custom sfx (closest fit for a scale-in reveal), respectively. */
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

/** Visual defaults start identical to the content table (no behavior change
 * until a user picks something different for the "Visual" column) — there's
 * no principled reason to guess a different built-in pairing than what
 * shipped before this split existed. */
const visualEntranceDefaultsBase: Partial<Record<EntrancePreset, string>> = {
  ...contentEntranceDefaultsBase,
};

const visualExitDefaultsBase: Partial<Record<ExitPreset, string>> = {
  ...contentExitDefaultsBase,
};

type SfxOverridesFile = {
  content?: { entrance?: Record<string, string>; exit?: Record<string, string> };
  visual?: { entrance?: Record<string, string>; exit?: Record<string, string> };
};
const overrides = sfxOverrides as SfxOverridesFile;

const entranceDefaultsByKind: Record<SfxDefaultKind, Partial<Record<EntrancePreset, string>>> = {
  content: { ...contentEntranceDefaultsBase, ...overrides.content?.entrance },
  visual: { ...visualEntranceDefaultsBase, ...overrides.visual?.entrance },
};

const exitDefaultsByKind: Record<SfxDefaultKind, Partial<Record<ExitPreset, string>>> = {
  content: { ...contentExitDefaultsBase, ...overrides.content?.exit },
  visual: { ...visualExitDefaultsBase, ...overrides.visual?.exit },
};

/** Resolves the sfx id to play for a scene/visual's entrance: an explicit
 * override wins (`"none"` suppresses it entirely), otherwise `kind`'s table
 * for the entrance preset, falling back to no sound. Scene-to-scene
 * transitions (`motion.transition`) deliberately contribute no sound of
 * their own — the cut is silent by default, independent of the entrance cue. */
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

/** Same as `resolveEntranceSfx` (always `kind: "content"` — Blocks/Rich
 * Headline lines are text), but for split-text elements where a word-by-word
 * slide-up reads as a typewriter beat — that specific combination gets
 * `"type-word"` instead of the generic slideUp whoosh. A word/letter split
 * ALWAYS gets a cue (2026-08-24: per-unit animation should always have a
 * sound) — even presets with no content default of their own (e.g. `fade`)
 * fall back to `"type-word"` rather than playing silently, since each word
 * appearing is itself the beat that needs punctuating. Whole-line splits keep
 * falling through to silence when there's no default, same as before. */
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

export function resolveExitSfx(args: { override?: string; exit?: ExitPreset; kind?: SfxDefaultKind }): string | undefined {
  const { override, exit, kind = "content" } = args;
  if (override === SFX_NONE) return undefined;
  if (override && getSfx(override)) return override;
  const defaults = exitDefaultsByKind[kind];
  if (exit && defaults[exit]) return defaults[exit];
  return undefined;
}

/** Explicit-only resolution for individually opt-in elements (blocks, freeform
 * positioned visuals) — no automatic default, silent unless a sound is picked. */
export function resolveExplicitSfx(id?: string): string | undefined {
  if (!id || id === SFX_NONE) return undefined;
  return getSfx(id) ? id : undefined;
}

/** Like `resolveExplicitSfx`, but with a fallback sound instead of silence —
 * for data visuals whose own per-unit reveal (a checklist item ticking on, a
 * counter incrementing) is itself a beat worth punctuating by default, same
 * as a Block's text entrance. `override: "none"` still silences it. */
export function resolveDefaultSfx(override: string | undefined, defaultId: string): string | undefined {
  if (override === SFX_NONE) return undefined;
  if (override && getSfx(override)) return override;
  return getSfx(defaultId) ? defaultId : undefined;
}
