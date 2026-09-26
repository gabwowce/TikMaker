import { TRPCError } from "@trpc/server";
import path from "node:path";
import { z } from "zod";
import type { SfxGroup } from "../../src/registries/sfxRegistry.js";
import { readJson, writeJson } from "../db.js";
import { newId, removePublicFile, savePublicFile } from "../uploads.js";
import { procedure, router } from "./init.js";

// custom-sfx.json holds uploaded sound effects AND generated voiceovers
// (group "voice", written by voice.ts) — both are sounds the editor can play.
export const SFX_MANIFEST = "custom-sfx.json";
const FOLDER = "assets/custom-sfx";

export type CustomSfx = {
  id: string;
  label: string;
  file: string;
  src: string;
  group: SfxGroup;
};

export async function readSfxManifest(): Promise<CustomSfx[]> {
  return (await readJson(SFX_MANIFEST, [])) as CustomSfx[];
}

export const sfxRouter = router({
  list: procedure.query(() => readSfxManifest()),

  upload: procedure
    .input(
      z.object({
        filename: z.string().min(1),
        label: z.string(),
        group: z.string(),
        dataBase64: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const ext = path.extname(input.filename) || ".mp3";
      const id = newId(input.label || input.filename);
      const file = `${id}${ext}`;
      await savePublicFile(FOLDER, file, Buffer.from(input.dataBase64, "base64"));

      const sfx: CustomSfx = {
        id,
        label: input.label || input.filename,
        file,
        src: `/${FOLDER}/${file}`,
        group: (input.group || "misc") as SfxGroup,
      };
      await writeJson(SFX_MANIFEST, [...(await readSfxManifest()), sfx]);
      return sfx;
    }),

  // Removes the file wherever it lives (custom-sfx/ or voice/) and its entry.
  remove: procedure.input(z.string()).mutation(async ({ input: id }) => {
    const manifest = await readSfxManifest();
    const sfx = manifest.find((entry) => entry.id === id);
    if (!sfx) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown sound" });
    await removePublicFile(sfx.src);
    await writeJson(SFX_MANIFEST, manifest.filter((entry) => entry.id !== id));
  }),
});
