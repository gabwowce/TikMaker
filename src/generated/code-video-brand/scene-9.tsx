import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 9 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 9";

export default function Scene9(props: CodeSceneProps) {
  return <Test4Scene s={8} props={props} />;
}
