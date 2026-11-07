import { describe, expect, it } from "vitest";
import { z } from "zod";
import { describeFields, field } from "../fields";
import { wordFrame } from "../kit";
import { sceneParams } from "../../code/params";

describe("code scene fields", () => {
  const schema = z.object({
    title: field.text("Headline", "One *endless* session"),
    tokens: field.number("Tokens", 184000, { min: 0, max: 1e6 }),
    photo: field.photo("Burning dollar", "a dollar bill on fire"),
    demo: field.recording("Demo", "type /clear"),
    at: field.word("Appears on", "dollars"),
    look: field.choice("Look", ["cutout", "card"], "card"),
    loud: field.toggle("Shake", false),
    plain: z.string().default("x"),
  });

  it("lists every field for the form, in order", () => {
    const fields = describeFields(schema);
    expect(fields.map((f) => [f.key, f.kind])).toEqual([
      ["title", "text"],
      ["tokens", "number"],
      ["photo", "photo"],
      ["demo", "recording"],
      ["at", "word"],
      ["look", "choice"],
      ["loud", "toggle"],
      ["plain", "text"],
    ]);
    expect(fields[1]).toMatchObject({ label: "Tokens", min: 0, max: 1e6 });
    expect(fields[2].hint).toBe("a dollar bill on fire");
    expect(fields[5].options).toEqual(["cutout", "card"]);
  });

  it("gives the component the defaults", () => {
    expect(sceneParams({ schema }, {})).toMatchObject({
      title: "One *endless* session",
      photo: "",
      at: "dollars",
      look: "card",
    });
  });
});

describe("wordFrame", () => {
  const words = [
    { text: "Teams", frame: 0, endFrame: 8 },
    { text: "spend", frame: 9, endFrame: 16 },
    { text: "thirteen", frame: 18, endFrame: 25 },
    { text: "dollars,", frame: 26, endFrame: 38 },
    { text: "dollars", frame: 60, endFrame: 70 },
  ];
  it("finds the word whatever its case and punctuation", () => {
    expect(wordFrame(words, "Dollars")).toBe(26);
    expect(wordFrame(words, "dollars", 0, 4)).toBe(60);
  });
  it("falls back when it is not said", () => {
    expect(wordFrame(words, "euros", 42)).toBe(42);
  });
});
