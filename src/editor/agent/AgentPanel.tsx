import { ActionIcon } from "@mantine/core";
import { useEffect, useRef } from "react";
import { useLatestRun } from "../../api/agent";
import { loadCustomSfx } from "../../api/library";
import { useEditorPrefs } from "../state/editorPrefs";
import { useProjectStore } from "../state/projectStore";
import { usePanelResize } from "../usePanelResize";
import { AgentRail } from "./AgentRail";
import { ChatInput } from "./ChatInput";
import { IdeaForm } from "./IdeaForm";
import { RunProgress } from "./RunProgress";

const MIN_WIDTH = 280;
const MAX_WIDTH = 860;
const DEFAULT_WIDTH = 360;

// The AI agent's side panel: on the right in both modes, next to whatever the
// editor shows, so the agent works on the project you are looking at rather
// than in a window of its own. Open or collapsed and its width are remembered
// in this browser (editorPrefs), like the timeline height.
export function AgentPanel() {
  const open = useEditorPrefs((s) => s.agentPanelOpen ?? true);
  const storedWidth = useEditorPrefs((s) => s.agentPanelWidth);
  const setPrefs = useEditorPrefs((s) => s.set);
  const { size: width, beginResize } = usePanelResize({
    edge: "left",
    stored: storedWidth,
    initial: DEFAULT_WIDTH,
    min: MIN_WIDTH,
    max: MAX_WIDTH,
    save: (agentPanelWidth) => setPrefs({ agentPanelWidth }),
  });

  if (!open) {
    return <AgentRail onOpen={() => setPrefs({ agentPanelOpen: true })} />;
  }

  return (
    <aside
      style={{ width }}
      className="editor-ui relative flex shrink-0 flex-col border-0 border-l border-solid border-editor-border bg-editor-panel"
    >
      <div
        role="separator"
        aria-label="Resize the AI agent panel"
        onPointerDown={beginResize}
        className="absolute top-0 bottom-0 left-[-3px] w-[7px] [cursor:ew-resize] [z-index:20]"
      />
      <header className="flex items-center justify-between gap-2 border-0 border-b border-solid border-editor-border px-3 py-2">
        <span className="text-sm font-semibold">✦ AI agent</span>
        <ActionIcon
          aria-label="Collapse the AI agent"
          variant="default"
          onClick={() => setPrefs({ agentPanelOpen: false })}
        >
          »
        </ActionIcon>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3 text-sm text-editor-muted">
        <AgentPanelBody />
      </div>
      <PanelChat />
    </aside>
  );
}

// The message box at the bottom, outside the scrolling conversation so it is
// always in reach – as soon as the open project has a run.
function PanelChat() {
  const projectId = useProjectStore((s) => s.project.id);
  const { run } = useLatestRun(projectId);
  if (!run) return null;
  return <ChatInput run={run} />;
}

// What the panel shows depends on the project, not on its history:
// - the agent is working on it → that run's progress;
// - no scenes yet → the idea form, to make a new video;
// - scenes already (made by the agent, by hand or imported) → editing.
function AgentPanelBody() {
  const projectId = useProjectStore((s) => s.project.id);
  const hasScenes = useProjectStore((s) => s.project.scenes.length > 0);
  const applyAgentScript = useProjectStore((s) => s.applyAgentScript);
  const applyAgentBlocks = useProjectStore((s) => s.applyAgentBlocks);
  const { loaded, run, working } = useLatestRun(projectId);
  // The video is built only once the agent is past building it: with a
  // voiceover that is after the voice step, so the scenes get its timings.
  // The self-review ("reviewing") comes after that: the video is already in
  // the editor while the agent looks at its frames.
  const built =
    run !== undefined &&
    !["laying_out", "checking", "generating_voice"].includes(run.status);
  // The agent's scenes are still words only: no stage type yet.
  const awaitsBlocks = useProjectStore(
    (s) =>
      built &&
      run?.blocks !== undefined &&
      s.project.scenes.some(
        (scene) => scene.id.startsWith(`scene-${run.id}-`) && !scene.stage,
      ),
  );

  // "Approve": the script goes into the still empty project, so it shows in
  // Storyboard. Once there are scenes, nothing is written over them.
  useEffect(() => {
    if (run?.script?.approved && !hasScenes) applyAgentScript(run);
  }, [run, hasScenes, applyAgentScript]);
  // The agent built the video: its blocks become the scenes' layers, once.
  // Scenes built already, or added by hand, are left as they are.
  useEffect(() => {
    if (!run || !awaitsBlocks) return;
    void withVoiceSounds(run).then(() => applyAgentBlocks(run));
  }, [run, awaitsBlocks, applyAgentBlocks]);
  // The self-review ended (done, or paused at a limit): what it fixed goes
  // into the editor – the whole video built again from the run; recordings and
  // pictures put in meanwhile stay (projectFromBlocks keeps them).
  const lastStatus = useRef(run?.status);
  useEffect(() => {
    const before = lastStatus.current;
    lastStatus.current = run?.status;
    if (!run || before !== "reviewing" || run.status === "reviewing") return;
    void withVoiceSounds(run).then(() => applyAgentBlocks(run));
  }, [run, applyAgentBlocks]);

  if (!loaded) return null;
  // While the agent works, and after it has built this project, the panel
  // shows the run: every step it took stays readable.
  if (run && (working || run.status === "done"))
    return <RunProgress runId={run.id} />;
  if (!hasScenes)
    return (
      <div className="flex flex-col gap-3">
        {/* The last try failed: say why above the form, so starting again
            is an informed choice rather than a guess. */}
        {run?.status === "error" ? (
          <p className="m-0 text-xs text-red-400">
            The last run stopped: {run.error ?? "unknown error"}
          </p>
        ) : null}
        <IdeaForm projectId={projectId} />
      </div>
    );
  return (
    <p className="m-0">
      Changing a scene with the AI works on videos the agent built: start one
      from an empty project.
    </p>
  );
}

// The agent's voiceover clips were made on the server: the editor learns
// about them (the sound list) before a project points at them, or the
// preview would not find the audio.
async function withVoiceSounds(run: { voice?: unknown }): Promise<void> {
  if (run.voice) await loadCustomSfx();
}
