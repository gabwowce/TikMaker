import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 8 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 8";

export default function Scene8(props: CodeSceneProps) {
  return <Test4Scene s={7} props={props} />;
}
