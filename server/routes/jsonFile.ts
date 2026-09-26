import express from "express";
import type { z } from "zod";
import { readJson, writeJson } from "../db.js";

// One JSON file in db/ that the client reads and replaces as a whole
// (sfx-overrides.json, voice-settings.json). The schema is the SAME one the
// editor uses, so the server can refuse data the editor would not understand.
export function jsonFileRouter(file: string, schema: z.ZodTypeAny) {
  const router = express.Router();

  router.get("/", async (request, response) => {
    // parse() fills in defaults and throws (→ 500) if the file on disk is
    // broken — better a loud error than quietly serving bad data.
    response.json(schema.parse(await readJson(file, {})));
  });

  router.put("/", async (request, response) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      response
        .status(400)
        .json({ error: `Invalid ${file}`, issues: result.error.issues });
      return;
    }
    await writeJson(file, result.data);
    response.json(result.data);
  });

  return router;
}
