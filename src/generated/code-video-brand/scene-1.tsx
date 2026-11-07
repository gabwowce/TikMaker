import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 1 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 1";

export default function Scene1(props: CodeSceneProps) {
  return <Test4Scene s={0} props={props} />;
}
