import type { Scene } from "../../schema/scene";

export type SceneComponentProps = Omit<Scene, "type">;
