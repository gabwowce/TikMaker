import { describe, expect, it } from "vitest";
import { z } from "zod";
import { readAnswer, WrongShapeError } from "../claudeCode.js";

// Reading Claude Code's answer – without a real call: stdout as
// `claude -p --output-format json` returns it (shortened).
const schema = z.object({ word: z.string(), n: z.number() });
const answer = (fields: object) =>
  JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    usage: {
      input_tokens: 2,
      cache_creation_input_tokens: 1441,
      cache_read_input_tokens: 10,
      output_tokens: 73,
      output_tokens_details: { thinking_tokens: 5 },
    },
    modelUsage: { "claude-sonnet-5-5": {} },
    ...fields,
  });

describe("readAnswer", () => {
  it("returns the checked answer, the model and the tokens", () => {
    const result = readAnswer(
      answer({ structured_output: { word: "hello", n: 3 } }),
      schema,
    );
    expect(result).toEqual({
      data: { word: "hello", n: 3 },
      model: "claude-sonnet-5-5",
      usage: {
        inputTokens: 1443,
        cachedInputTokens: 10,
        outputTokens: 73,
        thinkingTokens: 5,
        // the fake answer gives no num_turns: one round
        turns: 1,
      },
    });
  });

  it("asks again when there is no structured output or it is the wrong shape", () => {
    expect(() => readAnswer(answer({}), schema)).toThrow(WrongShapeError);
    expect(() =>
      readAnswer(answer({ structured_output: { word: 1 } }), schema),
    ).toThrow(WrongShapeError);
  });

  it("stops on an error Claude Code reports (e.g. not logged in)", () => {
    expect(() =>
      readAnswer(answer({ is_error: true, result: "Not logged in" }), schema),
    ).toThrow("Claude Code: Not logged in");
  });

  it("stops when the output is not JSON", () => {
    expect(() => readAnswer("Error: something", schema)).toThrow(
      "did not answer with JSON",
    );
  });
});
