import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { SOURCE_DIRS, syncAssets } from "./scripts/syncAssets";
// props/ai/sfx/fonts source paths can be overridden in .env.local
loadEnv({ path: path.resolve(__dirname, ".env.local") });
function assetSyncPlugin(): Plugin {
  const sources = Object.values(SOURCE_DIRS).map((dir) => path.resolve(dir));
  function isSourceFile(file: string) {
    const resolved = path.resolve(file);
    return sources.some((dir) => resolved.startsWith(dir + path.sep));
  }
  return {
    name: "asset-sync",
    configureServer(server) {
      function run(reason: string) {
        try {
          const result = syncAssets();
          if (result.changed) {
            console.log(
              `[asset-sync] ${reason}: ${result.props} props, ${result.logos} logos, ${result.sfx} sfx`,
            );
          }
        } catch (error) {
          console.error("[asset-sync] failed:", error);
        }
      }
      run("startup");
      let timer: NodeJS.Timeout | undefined;
      function schedule(file: string) {
        if (!isSourceFile(file)) return;
        clearTimeout(timer);
        timer = setTimeout(() => run(`changed ${path.basename(file)}`), 150);
      }
      server.watcher.add(sources);
      server.watcher.on("add", schedule);
      server.watcher.on("unlink", schedule);
      server.watcher.on("change", schedule);
    },
    buildStart() {
      if (process.env.NODE_ENV !== "development") syncAssets();
    },
  };
}
export default defineConfig({
  plugins: [
    react(),
    assetSyncPlugin(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
    // Everything the editor asks the server goes to the Express app in
    // server/ (npm run dev starts both): /trpc for every call, /api for the
    // one plain route that downloads a finished MP4.
    proxy: {
      "/api": "http://localhost:3001",
      "/trpc": "http://localhost:3001",
    },
    watch: {
      // db/ is the server's, so saving a project must not reload the page.
      // The one exception is sfx-overrides.json: sfxDefaults.ts imports it,
      // and reloading that module is how a changed sound rule reaches the
      // preview (and the timeline's cues) without a manual refresh.
      ignored: (file: string) => {
        const resolved = path.resolve(file);
        if (resolved.startsWith(path.resolve(__dirname, "out"))) return true;
        const db = path.resolve(__dirname, "db");
        // db/ itself must stay watched, or the watcher never looks inside it
        if (!resolved.startsWith(db + path.sep)) return false;
        return path.relative(db, resolved) !== "sfx-overrides.json";
      },
    },
  },
});
