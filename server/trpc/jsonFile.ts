import { z } from "zod";
import { readJson, writeJson } from "../db.js";
import { procedure, router } from "./init.js";

// One JSON file in db/ read and replaced as a whole (sfx-overrides.json,
// voice-settings.json). get() parses through the schema, which fills in
// defaults and fails loudly if the file on disk is broken.
export function jsonFileRouter<T>(
  file: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
) {
  return router({
    get: procedure.query(async () => schema.parse(await readJson(file, {}))),

    save: procedure.input(schema).mutation(async ({ input }) => {
      await writeJson(file, input);
      return input;
    }),
  });
}
