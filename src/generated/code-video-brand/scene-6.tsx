import type { CodeSceneProps } from "../../video/code/types";
import { Test4Scene } from "./shared/Slice";

// Scene 6 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 6";

export default function Scene6(props: CodeSceneProps) {
  return <Test4Scene s={5} props={props} />;
}
