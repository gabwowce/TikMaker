import express, { type ErrorRequestHandler } from "express";
import { sfxOverridesSchema } from "../src/schema/sfxOverrides.js";
import { voiceSettingsSchema } from "../src/schema/voiceSettings.js";
import { assetsRouter } from "./routes/assets.js";
import { collectionRouter } from "./routes/collections.js";
import { jsonFileRouter } from "./routes/jsonFile.js";
import { renderRouter } from "./routes/render.js";
import { sfxRouter } from "./routes/sfx.js";
import { VOICE_SETTINGS, voiceRouter } from "./routes/voice.js";

// Builds the app without starting it, so tests can call it directly
// (supertest) while index.ts is the only place that listens on a port.
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "500mb" }));

  app.get("/api/health", (request, response) => {
    response.json({ ok: true });
  });

  // db/<folder>/*.json — one file per entry
  const COLLECTIONS = [
    "projects",
    "storyboards",
    "scenes",
    "templates",
    "backgrounds",
    "voice-variants",
  ];
  for (const folder of COLLECTIONS) {
    app.use(`/api/${folder}`, collectionRouter(folder));
  }

  // db/<file>.json — one file read and replaced as a whole, validated by the
  // same Zod schema the editor uses
  app.use("/api/sfx-overrides", jsonFileRouter("sfx-overrides.json", sfxOverridesSchema));
  app.use("/api/voice/settings", jsonFileRouter(VOICE_SETTINGS, voiceSettingsSchema));

  // uploads (file in public/, entry in a db/ manifest) and long-running jobs
  app.use("/api/assets", assetsRouter);
  app.use("/api/sfx", sfxRouter);
  app.use("/api/voice", voiceRouter);
  app.use("/api/renders", renderRouter);

  // Last, so it catches errors thrown by any route above. Errors that know
  // their own status (express.json's 400 for broken JSON) keep it.
  const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
    const status = error.status ?? 500;
    if (status >= 500) console.error(error); // a client's mistake isn't ours to log
    response
      .status(status)
      .json({ error: error instanceof Error ? error.message : String(error) });
  };
  app.use(errorHandler);

  return app;
}
