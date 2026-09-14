const SEPARATOR = "::";
export function qualifySelection(
  sceneId: string | undefined,
  objectId: string,
): string {
  if (!sceneId || objectId.startsWith("audio-clip-")) return objectId;
  return `${sceneId}${SEPARATOR}${objectId}`;
}
export type ParsedSelection = {
  sceneId: string | null;
  objectId: string;
};
export function parseSelection(id: string): ParsedSelection {
  const at = id.indexOf(SEPARATOR);
  if (at === -1) return { sceneId: null, objectId: id };
  return {
    sceneId: id.slice(0, at),
    objectId: id.slice(at + SEPARATOR.length),
  };
}
export function objectIdOf(id: string): string {
  return parseSelection(id).objectId;
}
export function sceneIdOf(id: string, fallback: string | null): string | null {
  return parseSelection(id).sceneId ?? fallback;
}
