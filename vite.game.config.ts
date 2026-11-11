import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// City Flight (game.html) on its own: a static site with relative paths, so
// it can be published anywhere (GitHub Pages). `npm run game:build` → dist/game/.
export default defineConfig({
  plugins: [react()],
  base: "./",
  publicDir: false,
  build: {
    outDir: "dist/game",
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { input: "game.html" },
  },
});
