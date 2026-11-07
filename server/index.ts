import { config as loadEnv } from "dotenv";
import path from "node:path";
import { pauseInterruptedRuns } from "./agent/agent.js";
import { createApp } from "./app.js";
import { ROOT } from "./config.js";

// ELEVENLABS_API_KEY and friends live in .env.local, next to package.json.
loadEnv({ path: path.join(ROOT, ".env.local") });

// Runs whose worker died with the previous server are paused, so "Continue"
// can pick them up (agent.ts).
await pauseInterruptedRuns();

createApp().listen(3001, () => console.log("Api on http://localhost:3001"));
