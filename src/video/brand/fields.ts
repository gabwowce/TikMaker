import { z } from "zod";

// The fields a code scene lists as editable (docs/tikmaker-kryptis.md,
// "Redagavimas"): the scene file exports `schema = z.object({...})` built from
// these, every field with a default. The Inspector shows them as a form
// (src/editor/inspector/CodeSceneFields.tsx); the values live in the project
// (scene.code.params) and reach the component as `params`.
//
//   export const schema = z.object({
//     title: field.text("Headline", "One *endless* session"),
//     tokens: field.number("Tokens", 184000, { min: 0 }),
//     photo: field.photo("Burning dollar", "a dollar bill on fire, cut out"),
//     demo: field.recording("Demo", "Claude Code: type /clear, the context empties"),
//     showAt: field.word("Photo appears on", "dollars"),
//   });

export type FieldKind = "text" | "number" | "photo" | "recording" | "word" | "toggle" | "choice";

// What the Inspector needs to draw one field.
export type FieldInfo = {
  key: string;
  kind: FieldKind;
  label: string;
  // a photo: what to find; a recording: what to record
  hint?: string;
  min?: number;
  max?: number;
  options?: string[];
  long?: boolean;
};

type Meta = { kind: FieldKind; label: string; hint?: string; long?: boolean };
const meta = (m: Meta) => JSON.stringify(m);

export const field = {
  // Text on screen. `*word*` marks a key word (drawn in the accent colour).
  text: (label: string, value: string, opts: { long?: boolean } = {}) =>
    z.string().default(value).describe(meta({ kind: "text", label, long: opts.long })),
  number: (label: string, value: number, opts: { min?: number; max?: number } = {}) => {
    let schema = z.number();
    if (opts.min !== undefined) schema = schema.min(opts.min);
    if (opts.max !== undefined) schema = schema.max(opts.max);
    return schema.default(value).describe(meta({ kind: "number", label }));
  },
  toggle: (label: string, value: boolean) =>
    z.boolean().default(value).describe(meta({ kind: "toggle", label })),
  choice: <T extends string>(label: string, options: [T, ...T[]], value: T) =>
    z.enum(options).default(value).describe(meta({ kind: "choice", label })),
  // A real picture the creator puts in: a file under public/ ("" – not yet;
  // the scene shows a place saying what to find).
  photo: (label: string, find: string) =>
    z.string().default("").describe(meta({ kind: "photo", label, hint: find })),
  // A real screen recording, the same way.
  recording: (label: string, record: string) =>
    z.string().default("").describe(meta({ kind: "recording", label, hint: record })),
  // A word of the scene's voiceover something happens on (the form offers
  // the scene's words); the code turns it into a frame with wordFrame().
  word: (label: string, value: string) =>
    z.string().default(value).describe(meta({ kind: "word", label })),
};

// The fields of a scene's schema, in order, for the form. A field made
// without `field.*` still shows, guessed from its type.
export function describeFields(schema: z.ZodObject<z.ZodRawShape> | undefined): FieldInfo[] {
  if (!schema) return [];
  return Object.entries(schema.shape).map(([key, type]) => {
    const own = readMeta(type.description);
    const inner = unwrap(type);
    const info: FieldInfo = {
      key,
      kind: own?.kind ?? guessKind(inner),
      label: own?.label ?? (type.description || key),
      ...(own?.hint ? { hint: own.hint } : {}),
      ...(own?.long ? { long: true } : {}),
    };
    if (inner instanceof z.ZodNumber) {
      if (inner.minValue !== null) info.min = inner.minValue;
      if (inner.maxValue !== null) info.max = inner.maxValue;
    }
    if (inner instanceof z.ZodEnum) info.options = [...inner.options];
    return info;
  });
}

function readMeta(description: string | undefined): Meta | undefined {
  if (!description?.startsWith("{")) return undefined;
  try {
    return JSON.parse(description) as Meta;
  } catch {
    return undefined;
  }
}

function unwrap(type: z.ZodTypeAny): z.ZodTypeAny {
  let inner = type;
  while (
    inner instanceof z.ZodDefault ||
    inner instanceof z.ZodOptional ||
    inner instanceof z.ZodNullable
  )
    inner = inner._def.innerType;
  return inner;
}

function guessKind(type: z.ZodTypeAny): FieldKind {
  if (type instanceof z.ZodNumber) return "number";
  if (type instanceof z.ZodBoolean) return "toggle";
  if (type instanceof z.ZodEnum) return "choice";
  return "text";
}
