import { TRPCError } from "@trpc/server";
import path from "node:path";
import { z } from "zod";
import {
  isVideoFile,
  transcodeForScrubbing,
} from "../../scripts/transcodeRecording.js";
import { readJson, writeJson } from "../db.js";
import { newId, removePublicFile, savePublicFile } from "../uploads.js";
import { procedure, router } from "./init.js";

const MANIFEST = "custom-assets.json";
const FOLDER = "assets/custom";

export type CustomAsset = {
  id: string;
  label: string;
  file: string;
  src: string;
  kind: "image" | "video";
};

async function readManifest(): Promise<CustomAsset[]> {
  return (await readJson(MANIFEST, [])) as CustomAsset[];
}

// Imported images and screen recordings: the file goes to public/ (where the
// editor and Remotion can load it), its entry to db/custom-assets.json.
export const assetsRouter = router({
  list: procedure.query(() => readManifest()),

  upload: procedure
    .input(
      z.object({
        filename: z.string().min(1),
        label: z.string(),
        dataBase64: z.string().min(1), // the browser sends the file as base64 text
      }),
    )
    .mutation(async ({ input }) => {
      const ext = path.extname(input.filename) || ".png";
      const id = newId(input.label || input.filename);
      let file = `${id}${ext}`;
      const saved = await savePublicFile(
        FOLDER,
        file,
        Buffer.from(input.dataBase64, "base64"),
      );

      // Recordings are re-encoded so the editor can scrub them frame by
      // frame. If ffmpeg fails we keep the original rather than lose it.
      if (isVideoFile(file)) {
        try {
          file = path.basename(transcodeForScrubbing(saved).file);
        } catch (error) {
          console.warn(`[assets] transcode failed, keeping the original: ${error}`);
        }
      }

      const asset: CustomAsset = {
        id,
        label: input.label || input.filename,
        file,
        src: `/${FOLDER}/${file}`,
        kind: isVideoFile(file) ? "video" : "image",
      };
      await writeJson(MANIFEST, [...(await readManifest()), asset]);
      return asset;
    }),

  remove: procedure.input(z.string()).mutation(async ({ input: id }) => {
    const manifest = await readManifest();
    const asset = manifest.find((entry) => entry.id === id);
    if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown asset" });
    await removePublicFile(asset.src);
    await writeJson(MANIFEST, manifest.filter((entry) => entry.id !== id));
  }),
});
