import express from "express";
import path from "node:path";
import {
  isVideoFile,
  transcodeForScrubbing,
} from "../../scripts/transcodeRecording.js";
import { readJson, writeJson } from "../db.js";
import { newId, removePublicFile, savePublicFile } from "../uploads.js";

const MANIFEST = "custom-assets.json";
const FOLDER = "assets/custom";

type CustomAsset = {
  id: string;
  label: string;
  file: string;
  src: string;
  kind: "image" | "video";
};

async function readManifest(): Promise<CustomAsset[]> {
  return (await readJson(MANIFEST, [])) as CustomAsset[];
}

export const assetsRouter = express.Router();

// GET /api/assets — every imported image and recording
assetsRouter.get("/", async (request, response) => {
  response.json(await readManifest());
});

// POST /api/assets — upload one file: { filename, label, dataBase64 }
assetsRouter.post("/", async (request, response) => {
  const { filename, label, dataBase64 } = request.body ?? {};
  if (typeof filename !== "string" || typeof dataBase64 !== "string") {
    response.status(400).json({ error: "filename and dataBase64 are required" });
    return;
  }

  const ext = path.extname(filename) || ".png";
  const id = newId(label || filename);
  let file = `${id}${ext}`;
  const saved = await savePublicFile(FOLDER, file, Buffer.from(dataBase64, "base64"));

  // Recordings are re-encoded so the editor can scrub them frame by frame.
  // If ffmpeg fails we keep the original rather than losing the upload.
  if (isVideoFile(file)) {
    try {
      file = path.basename(transcodeForScrubbing(saved).file);
    } catch (error) {
      console.warn(`[assets] transcode failed, keeping the original: ${error}`);
    }
  }

  const asset: CustomAsset = {
    id,
    label: label || filename,
    file,
    src: `/${FOLDER}/${file}`,
    kind: isVideoFile(file) ? "video" : "image",
  };
  await writeJson(MANIFEST, [...(await readManifest()), asset]);
  response.status(201).json(asset);
});

// DELETE /api/assets/:id — remove the file and its manifest entry
assetsRouter.delete("/:id", async (request, response) => {
  const manifest = await readManifest();
  const asset = manifest.find((entry) => entry.id === request.params.id);
  if (!asset) {
    response.status(404).json({ error: "Unknown asset" });
    return;
  }
  await removePublicFile(asset.src);
  await writeJson(
    MANIFEST,
    manifest.filter((entry) => entry.id !== asset.id),
  );
  response.sendStatus(204);
});
