import { savedBackgroundSchema, savedSceneSchema, voiceVariantSchema } from "../../src/schema/library.js";
import { videoProjectSchema } from "../../src/schema/project.js";
import { sfxOverridesSchema } from "../../src/schema/sfxOverrides.js";
import { parseProject } from "../../src/utils/normalizeProject.js";
import { assetsRouter } from "./assets.js";
import { collectionRouter } from "./collections.js";
import { router } from "./init.js";
import { jsonFileRouter } from "./jsonFile.js";
import { rendersRouter } from "./renders.js";
import { sfxRouter } from "./sfx.js";
import { voiceRouter } from "./voice.js";

// Every procedure the editor can call, e.g. trpc.projects.list or
// trpc.voice.settings.save. The client imports only the TYPE below — never
// this code — and gets every input and output type from it.
export const appRouter = router({
  // db/<folder>/*.json — one file per entry. Projects go through parseProject
  // on the way out, which upgrades files saved by older versions.
  projects: collectionRouter("projects", videoProjectSchema, parseProject),
  scenes: collectionRouter("scenes", savedSceneSchema),
  backgrounds: collectionRouter("backgrounds", savedBackgroundSchema),
  voiceVariants: collectionRouter("voice-variants", voiceVariantSchema),

  // db/sfx-overrides.json — which sound plays for which animation
  sfxOverrides: jsonFileRouter("sfx-overrides.json", sfxOverridesSchema),

  // uploads (file in public/, entry in a db/ manifest) and background jobs
  assets: assetsRouter,
  sfx: sfxRouter,
  voice: voiceRouter,
  renders: rendersRouter,
});

export type AppRouter = typeof appRouter;
