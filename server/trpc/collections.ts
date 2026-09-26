import { z } from "zod";
import { readAll, removeOne, writeOne } from "../db.js";
import { procedure, router } from "./init.js";

// A db/<folder> of JSON files, one per entry: list / save / remove.
// `schema` validates every save; `read` turns a file from disk into a valid
// entry (for projects that also upgrades old formats) and may throw — a file
// that can't be read is skipped rather than breaking the whole list.
export function collectionRouter<T extends { id: string }>(
  folder: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  read: (json: unknown) => T = (json) => schema.parse(json),
) {
  return router({
    list: procedure.query(async () => {
      const items: T[] = [];
      for (const json of await readAll(folder)) {
        try {
          items.push(read(json));
        } catch {
          console.warn(`[db] skipped an unreadable entry in db/${folder}`);
        }
      }
      return items;
    }),

    save: procedure.input(schema).mutation(async ({ input }) => {
      await writeOne(folder, input.id, input);
      return input;
    }),

    remove: procedure.input(z.string()).mutation(async ({ input: id }) => {
      await removeOne(folder, id);
    }),
  });
}
