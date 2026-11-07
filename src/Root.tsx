import { Composition } from "remotion";
import { createEmptyProject } from "./schema/project";
import showcaseProjectJson from "./templates/template-showcase.json";
import { projectDurationInFrames } from "./utils/duration";
import { parseProject } from "./utils/normalizeProject";
import { StageCatalog, STAGE_CATALOG_FRAMES } from "./video/stage/StageCatalog";
import { StageDemo, STAGE_DEMO_FRAMES } from "./video/stage/StageDemo";
import { StageTypes, STAGE_TYPES_FRAMES } from "./video/stage/StageTypesDemo";
import { TikTokVideo } from "./video/TikTokVideo";
import { CodeVideo } from "./experiments/codeVideo/CodeVideo";
import { FreeVideo } from "./experiments/codeVideo/FreeVideo";
import codeVideoProjectJson from "../db/projects/project-1793969945652.json";
import { videoDefaults } from "./video/typography/tokens";
const showcaseProject = parseProject(showcaseProjectJson);
const fallbackProject = createEmptyProject("empty", "Empty Project");
// The experiment's video: test 11 (3 Claude Code mistakes that burn tokens).
const codeVideoProject = parseProject(codeVideoProjectJson);
export function RemotionRoot() {
  return (
    <>
      <Composition
        id="TikTokVideo"
        component={TikTokVideo}
        durationInFrames={projectDurationInFrames(showcaseProject)}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
        defaultProps={{ project: showcaseProject }}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: projectDurationInFrames(
            props.project ?? fallbackProject,
          ),
        })}
      />
      {/* Experiment: every scene's picture written as code by Claude Code */}
      <Composition
        id="CodeVideo"
        component={CodeVideo}
        durationInFrames={projectDurationInFrames(codeVideoProject)}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
        defaultProps={{ project: codeVideoProject }}
      />
      {/* The same experiment without any of our design, one skill each */}
      <Composition
        id="CodeVideoOfficial"
        component={FreeVideo}
        durationInFrames={projectDurationInFrames(codeVideoProject)}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
        defaultProps={{ project: codeVideoProject, variant: "official" }}
      />
      <Composition
        id="CodeVideoOnetake"
        component={FreeVideo}
        durationInFrames={projectDurationInFrames(codeVideoProject)}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
        defaultProps={{ project: codeVideoProject, variant: "onetake" }}
      />
      {/* Pavyzdinė „stage“ scena (docs/motion-planas.md) */}
      <Composition
        id="StageDemo"
        component={StageDemo}
        durationInFrames={STAGE_DEMO_FRAMES}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
      />
      {/* All stage blocks in a row (docs/motion-planas.md) */}
      <Composition
        id="StageCatalog"
        component={StageCatalog}
        durationInFrames={STAGE_CATALOG_FRAMES}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
      />
      {/* The five stage types (docs/motion-planas.md) */}
      <Composition
        id="StageTypes"
        component={StageTypes}
        durationInFrames={STAGE_TYPES_FRAMES}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
      />
    </>
  );
}
