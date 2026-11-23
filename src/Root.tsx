import { Composition } from "remotion";
import { createEmptyProject } from "./schema/project";
import showcaseProjectJson from "./templates/template-showcase.json";
import { projectDurationInFrames } from "./utils/duration";
import { parseProject } from "./utils/normalizeProject";
import { TikTokVideo } from "./video/TikTokVideo";
import { videoDefaults } from "./video/typography/tokens";
import { SoundKitDemo, soundKitFrames } from "./video/SoundKitDemo";
import { BulbCity, BULB_CITY_FRAMES } from "./showcase/bulbCity/BulbCity";
const showcaseProject = parseProject(showcaseProjectJson);
const fallbackProject = createEmptyProject("empty", "Empty Project");
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
      {/* Showcase clip: "one sentence → a 3D animation" (a video's resource) */}
      <Composition
        id="BulbCity"
        component={BulbCity}
        durationInFrames={BULB_CITY_FRAMES}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
      />
      {/* Listening to the sound kit: npm run sfx:listen */}
      <Composition
        id="SoundKit"
        component={SoundKitDemo}
        durationInFrames={soundKitFrames()}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
      />
    </>
  );
}
