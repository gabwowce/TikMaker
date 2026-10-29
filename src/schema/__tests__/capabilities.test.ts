import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { backgroundFillKindSchema, visualTypeSchema } from "../capabilities";
import { backgroundFillSchema } from "../scene";
import { visualConfigSchema } from "../visual";

// visual.ts is the code that draws visuals; capabilities.ts is the list people
// and the agent read. The two must name exactly the same visual types.
describe("visualTypeSchema", () => {
  it("lists exactly the visual types visual.ts can parse", () => {
    const union = visualConfigSchema as unknown as z.ZodDiscriminatedUnion<
      "type",
      []
    >;
    const parsedByVisualTs = [...union.optionsMap.keys()].sort();
    expect([...visualTypeSchema.options].sort()).toEqual(parsedByVisualTs);
  });
});

describe("backgroundFillKindSchema", () => {
  it("lists exactly the fill kinds scene.ts can parse", () => {
    const kinds = [...backgroundFillSchema.optionsMap.keys()].sort();
    expect([...backgroundFillKindSchema.options].sort()).toEqual(kinds);
  });
});
