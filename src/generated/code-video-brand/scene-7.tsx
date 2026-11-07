import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 7 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 7";

export default function Scene7(props: CodeSceneProps) {
  return <Test4Scene s={6} props={props} />;
}
