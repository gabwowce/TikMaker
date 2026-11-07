import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 3 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 3";

export default function Scene3(props: CodeSceneProps) {
  return <Test4Scene s={2} props={props} />;
}
