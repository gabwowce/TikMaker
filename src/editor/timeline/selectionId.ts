/**
 * What a timeline selection actually addresses.
 *
 * A bare object id (`line-2`, `visual-abc`, `step-0`) only means something
 * INSIDE one scene — `line-2` is the third headline line of whichever scene
 * happens to be open. Every resolver therefore looked the object up against
 * `selectedSceneId`, which quietly made two things impossible:
 *
 *  - selecting objects from different scenes at once, which is the normal case
 *    in the full-video timeline where every scene is on screen;
 *  - copying from one scene and pasting into another, because by the time the
 *    paste ran, `selectedSceneId` had moved and the copy resolved against the
 *    wrong scene (or nothing at all).
 *
 * Qualifying the id with its scene fixes both at the source. The id is still
 * one opaque string, so the store, the drag handlers and the context menu are
 * unchanged — only the places that RESOLVE an id to an object had to learn to
 * read the scene out of it.
 *
 * Project-level objects (audio clips) carry no scene and stay bare: they are
 * not owned by one, and pretending otherwise would put a meaningless scene id
 * in front of them.
 */

const SEPARATOR = "::";

/** Scene-owned objects get their scene baked in; audio clips do not need one. */
export function qualifySelection(sceneId: string | undefined, objectId: string): string {
  if (!sceneId || objectId.startsWith("audio-clip-")) return objectId;
  return `${sceneId}${SEPARATOR}${objectId}`;
}

export type ParsedSelection = {
  /** Null when the id carries no scene — a project-level object, or an id
   * minted before this existed. Callers fall back to the open scene. */
  sceneId: string | null;
  objectId: string;
};

export function parseSelection(id: string): ParsedSelection {
  const at = id.indexOf(SEPARATOR);
  if (at === -1) return { sceneId: null, objectId: id };
  return { sceneId: id.slice(0, at), objectId: id.slice(at + SEPARATOR.length) };
}

/** The bare object id, for the code that only cares WHICH object it is. */
export function objectIdOf(id: string): string {
  return parseSelection(id).objectId;
}

/** The scene an id belongs to, or the open one when it names none. */
export function sceneIdOf(id: string, fallback: string | null): string | null {
  return parseSelection(id).sceneId ?? fallback;
}
