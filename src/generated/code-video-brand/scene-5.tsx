import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 5 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 5";

export default function Scene5(props: CodeSceneProps) {
  return <Test4Scene s={4} props={props} />;
}
