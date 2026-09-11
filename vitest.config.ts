import { defineConfig } from "vitest/config";

/**
 * Tests cover the REACT-FREE leaf modules — pacing, keyframes, timings, link
 * resolution, selection ids, normalization. Those are where the subtle bugs
 * live (a cut landing before the voiceover, a keyframe track resolved against
 * the wrong base, a project silently dropped for one out-of-range number), and
 * they need no DOM to prove.
 *
 * `scripts/` is included for the same reason: the library API is the one place
 * that decides what "saved" means on disk, and it had no coverage at all — which
 * is where the lost-work bugs turned out to live.
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts", "scripts/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
