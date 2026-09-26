import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, { type ErrorRequestHandler } from "express";
import fs from "node:fs";
import { getRenderJob } from "./renderJobs.js";
import { appRouter } from "./trpc/router.js";

// Builds the app without starting it, so tests can use it directly while
// index.ts is the only place that listens on a port.
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "500mb" })); // uploads arrive as base64 JSON

  // Every call the editor makes: POST /trpc/assets.upload, GET /trpc/projects.list …
  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
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

  // Last: catches what fails before tRPC sees it, e.g. broken JSON (400).
  const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
    const status = error.status ?? 500;
    if (status >= 500) console.error(error);
    response
      .status(status)
      .json({ error: error instanceof Error ? error.message : String(error) });
  };
  app.use(errorHandler);

  return app;
}
