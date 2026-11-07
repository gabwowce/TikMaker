import { Component, useEffect, useState, type ReactNode } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import type { Scene } from "../../schema/scene";
import { loadCodeScene, loadedCodeScene } from "./loadCodeScene";
import { sceneParams } from "./params";
import type { CodeSceneModule, SceneWord } from "./types";

type Props = {
  scene: Scene;
  index: number;
  durationInFrames: number;
  words: SceneWord[];
};

// A code scene in the video: loads the scene's file, then draws its component
// with the scene's words and fields. The render waits for the file
// (delayRender); a file that does not load or a component that throws shows
// what went wrong in the scene's place instead of breaking the whole video.
export function CodeScene({ scene, index, durationInFrames, words }: Props) {
  const file = scene.code?.file;
  const module = useCodeSceneModule(file);
  if (!file) return <CodeSceneError message="This code scene has no file" />;
  if (!module) return null;
  if (module instanceof Error)
    return <CodeSceneError message={`${file}: ${module.message}`} />;
  const Picture = module.default;
  return (
    <CodeSceneBoundary
      file={file}
      resetKey={JSON.stringify(scene.code?.params ?? {})}
      module={module}
    >
      <AbsoluteFill>
        <Picture
          index={index}
          durationInFrames={durationInFrames}
          voiceover={scene.vo ?? ""}
          words={words}
          params={sceneParams(module, scene.code?.params)}
        />
      </AbsoluteFill>
    </CodeSceneBoundary>
  );
}

export function useCodeSceneModule(
  file: string | undefined,
): CodeSceneModule | Error | undefined {
  const [module, setModule] = useState(() =>
    file ? loadedCodeScene(file) : undefined,
  );
  useEffect(() => {
    if (!file) return;
    const ready = loadedCodeScene(file);
    if (ready) {
      setModule(ready);
      return;
    }
    let live = true;
    const handle = delayRender(`Loading code scene ${file}`);
    void loadCodeScene(file).then((result) => {
      if (live) setModule(result);
      continueRender(handle);
    });
    return () => {
      live = false;
      continueRender(handle);
    };
  }, [file]);
  return file ? module : undefined;
}

type BoundaryProps = {
  file: string;
  resetKey: string;
  module: CodeSceneModule;
  children: ReactNode;
};
class CodeSceneBoundary extends Component<BoundaryProps, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(previous: BoundaryProps) {
    // new code or new fields: try again
    const changed =
      previous.file !== this.props.file ||
      previous.resetKey !== this.props.resetKey ||
      previous.module !== this.props.module;
    if (this.state.error && changed) this.setState({ error: undefined });
  }
  render() {
    if (this.state.error)
      return (
        <CodeSceneError
          message={`${this.props.file}: ${this.state.error.message}`}
        />
      );
    return this.props.children;
  }
}

function CodeSceneError({ message }: { message: string }) {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      <div
        style={{
          border: "4px dashed #ef4444",
          borderRadius: 24,
          padding: 40,
          color: "#fca5a5",
          fontFamily: "monospace",
          fontSize: 30,
          lineHeight: 1.4,
          background: "rgba(0,0,0,0.6)",
          maxWidth: 900,
          wordBreak: "break-word",
        }}
      >
        ⚠ Code scene failed
        <br />
        {message}
      </div>
    </AbsoluteFill>
  );
}
