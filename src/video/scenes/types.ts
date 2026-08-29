import type { Scene } from "../../schema/scene";

export type SceneComponentProps = Omit<Scene, "type" | "durationSeconds"> & {
  /** Always the RESOLVED length (see `resolveSceneDuration` in
   * `src/utils/pacing.ts`) — `Scene.durationSeconds` is optional on the data
   * side, but by the time a scene renders its length is settled, and every
   * exit/kenBurns/sfx calculation depends on that. */
  durationSeconds: number;
};
