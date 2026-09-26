import express from "express";
import path from "node:path";
import { readJson, writeJson } from "../db.js";
import { newId, removePublicFile, savePublicFile } from "../uploads.js";

// custom-sfx.json holds uploaded sound effects AND generated voiceovers
// (group "voice", written by routes/voice.ts) — both are playable sounds.
export const SFX_MANIFEST = "custom-sfx.json";
const FOLDER = "assets/custom-sfx";

export type CustomSfx = {
  id: string;
  label: string;
  file: string;
  src: string;
  group: string;
};

export async function readSfxManifest(): Promise<CustomSfx[]> {
  return (await readJson(SFX_MANIFEST, [])) as CustomSfx[];
}

export const sfxRouter = express.Router();

// GET /api/sfx — every uploaded sound and voiceover
sfxRouter.get("/", async (request, response) => {
  response.json(await readSfxManifest());
});

// POST /api/sfx — upload one sound: { filename, label, group, dataBase64 }
sfxRouter.post("/", async (request, response) => {
  const { filename, label, group, dataBase64 } = request.body ?? {};
  if (typeof filename !== "string" || typeof dataBase64 !== "string") {
    response.status(400).json({ error: "filename and dataBase64 are required" });
    return;
  }

  const ext = path.extname(filename) || ".mp3";
  const id = newId(label || filename);
  const file = `${id}${ext}`;
  await savePublicFile(FOLDER, file, Buffer.from(dataBase64, "base64"));

  const sfx: CustomSfx = {
    id,
    label: label || filename,
    file,
    src: `/${FOLDER}/${file}`,
    group: group || "misc",
  };
  await writeJson(SFX_MANIFEST, [...(await readSfxManifest()), sfx]);
  response.status(201).json(sfx);
});

// DELETE /api/sfx/:id — remove the file (wherever it lives) and its entry
sfxRouter.delete("/:id", async (request, response) => {
  const manifest = await readSfxManifest();
  const sfx = manifest.find((entry) => entry.id === request.params.id);
  if (!sfx) {
    response.status(404).json({ error: "Unknown sound" });
    return;
  }
  await removePublicFile(sfx.src);
  await writeJson(
    SFX_MANIFEST,
    manifest.filter((entry) => entry.id !== sfx.id),
  );
  response.sendStatus(204);
});
