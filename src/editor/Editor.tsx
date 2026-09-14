import { useState } from "react";
import { EditorInspector } from "./EditorInspector";
import { EditorToolbar } from "./EditorToolbar";
import { GlobalStyles } from "./GlobalStyles";
import { VideoPreview } from "./VideoPreview";
import { LibraryPanel } from "./panels/LibraryPanel";
import { SceneStrip } from "./panels/SceneStrip";
import { ProjectStoryboardView } from "./storyboard/ProjectStoryboardView";
import { SceneTimeline } from "./timeline/SceneTimeline";
import { useEditorShortcuts } from "./useEditorShortcuts";
import { usePreviewPlayer } from "./usePreviewPlayer";

export function Editor() {
  const [mode, setMode] = useState<"scenes" | "storyboard">("scenes");
  const { playerRef, currentFrame, durationInFrames, seekTo } =
    usePreviewPlayer(mode);
  useEditorShortcuts();

  return (
    <div className="flex h-screen flex-col bg-neutral-950 font-sans text-editor-text">
      <GlobalStyles />
      <EditorToolbar mode={mode} onModeChange={setMode} />
      <main
        id={`editor-mode-panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`editor-mode-tab-${mode}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {mode === "storyboard" ? (
          <ProjectStoryboardView onOpenScenes={() => setMode("scenes")} />
        ) : (
          <>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <LibraryPanel />
              <VideoPreview
                playerRef={playerRef}
                durationInFrames={durationInFrames}
              />
              <EditorInspector />
            </div>
            <SceneTimeline currentFrame={currentFrame} onSeek={seekTo} />
            <SceneStrip />
          </>
        )}
      </main>
    </div>
  );
}
