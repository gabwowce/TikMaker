import React from "react";
import { Composition } from "remotion";
import { TikTokVideo } from "./video/TikTokVideo";
import { videoDefaults } from "./video/typography/tokens";
import { projectDurationInFrames } from "./utils/duration";
import { videoProjectSchema, createEmptyProject } from "./schema/project";
import showcaseProjectJson from "../projects/template-showcase.json";
import claudeConnectorsJson from "../projects/claude-connectors.json";

const showcaseProject = videoProjectSchema.parse(showcaseProjectJson);
const claudeConnectorsProject = videoProjectSchema.parse(claudeConnectorsJson);
const fallbackProject = createEmptyProject("empty", "Empty Project");

export const RemotionRoot: React.FC = () => {
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
          durationInFrames: projectDurationInFrames(props.project ?? fallbackProject),
        })}
      />
      <Composition
        id="ClaudeConnectorsExample"
        component={TikTokVideo}
        durationInFrames={projectDurationInFrames(claudeConnectorsProject)}
        fps={videoDefaults.fps}
        width={videoDefaults.width}
        height={videoDefaults.height}
        defaultProps={{ project: claudeConnectorsProject }}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: projectDurationInFrames(props.project ?? fallbackProject),
        })}
      />
    </>
  );
};
