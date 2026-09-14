import { Composition } from "remotion";
import { createEmptyProject } from "./schema/project";
import showcaseProjectJson from "./templates/template-showcase.json";
import { projectDurationInFrames } from "./utils/duration";
import { parseProject } from "./utils/normalizeProject";
import { TikTokVideo } from "./video/TikTokVideo";
import { videoDefaults } from "./video/typography/tokens";
const showcaseProject = parseProject(showcaseProjectJson);
const fallbackProject = createEmptyProject("empty", "Empty Project");
export function RemotionRoot() {
  return (
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
  );
}
