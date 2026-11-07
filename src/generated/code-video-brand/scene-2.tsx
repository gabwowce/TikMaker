import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 2 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 2";

export default function Scene2(props: CodeSceneProps) {
  return <Test4Scene s={1} props={props} />;
}
