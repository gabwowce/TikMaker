import type { CodeSceneProps } from "../../video/code/types";
import { copySchema, Test4Scene } from "./shared/Slice";

// Scene 4 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 4";

export const schema = copySchema(3);

export default function Scene4(props: CodeSceneProps) {
  return <Test4Scene s={3} props={props} />;
}
