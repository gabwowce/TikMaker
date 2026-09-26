import { config as loadEnv } from "dotenv";
import path from "node:path";
import { createApp } from "./app.js";
import { ROOT } from "./config.js";

// ELEVENLABS_API_KEY and friends live in .env.local, next to package.json.
loadEnv({ path: path.join(ROOT, ".env.local") });

createApp().listen(3001, () => console.log("Api on http://localhost:3001"));
