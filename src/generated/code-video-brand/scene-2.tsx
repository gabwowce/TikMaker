import { z } from "zod";
import { field } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { copyFields, Test4Scene } from "./shared/Slice";

// Scene 2 of test 4 (CodeVideoBrand), moved into a project.
export const description = "Test 4 (CodeVideoBrand), scene 2";

export const schema = z.object({
  ...copyFields(1),
  photo: field.photo(
    "Burning dollar",
    "Cut-out: a US dollar bill on fire, flames at one corner, no background",
  ),
});

export default function Scene2(props: CodeSceneProps) {
  return <Test4Scene s={1} props={props} />;
}
