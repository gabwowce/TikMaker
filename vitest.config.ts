import { defineConfig } from "vitest/config";

/**
 * Tests cover the REACT-FREE leaf modules — pacing, keyframes, timings, link
 * resolution, selection ids, normalization. Those are where the subtle bugs
 * live (a cut landing before the voiceover, a keyframe track resolved against
 * the wrong base, a project silently dropped for one out-of-range number), and
 * they need no DOM to prove.
 */
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
