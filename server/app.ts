import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import fs from "node:fs";
import { getRenderJob } from "./renderJobs.js";
import { appRouter } from "./trpc/router.js";

// Uploads arrive as base64 JSON, so a request body may be large.
const MAX_BODY_BYTES = 500 * 1024 * 1024;

// Builds the app without starting it, so tests can use it directly while
// index.ts is the only place that listens on a port.
export function createApp() {
  const app = express();

  // Every call the editor makes: POST /trpc/assets.upload, GET /trpc/projects.list …
  // tRPC reads the request body itself — no express.json() in front of it,
  // which would parse the body a first time and make tRPC's own read fail.
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      maxBodySize: MAX_BODY_BYTES,
      onError({ error, path }) {
        // a bad input is the caller's mistake; only log what broke on our side
        if (error.code === "INTERNAL_SERVER_ERROR") console.error(`[trpc] ${path}:`, error);
      },
    }),
  );

  // The one thing tRPC can't do: answer with a file instead of JSON.
  app.get("/api/renders/:id/file", (request, response) => {
    const job = getRenderJob(request.params.id);
    if (!job?.outputPath || !fs.existsSync(job.outputPath)) {
      response.status(404).json({ error: "Render not finished" });
      return;
    }
    response.download(job.outputPath);
  });

  return app;
}
