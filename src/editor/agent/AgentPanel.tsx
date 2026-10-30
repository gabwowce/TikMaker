import { ActionIcon } from "@mantine/core";
import { useLatestRun } from "../../api/agent";
import { useEditorPrefs } from "../state/editorPrefs";
import { useProjectStore } from "../state/projectStore";
import { usePanelResize } from "../usePanelResize";
import { AgentRail } from "./AgentRail";
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
      className="relative flex shrink-0 flex-col border-0 border-l border-solid border-editor-border bg-editor-panel"
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
    </aside>
  );
}

// What the panel shows depends on the project, not on its history:
// - the agent is working on it → that run's progress;
// - no scenes yet → the idea form, to make a new video;
// - scenes already (made by the agent, by hand or imported) → editing.
function AgentPanelBody() {
  const projectId = useProjectStore((s) => s.project.id);
  const hasScenes = useProjectStore((s) => s.project.scenes.length > 0);
  const { loaded, run, working } = useLatestRun(projectId);

  if (!loaded) return null;
  if (run && working) return <RunProgress runId={run.id} />;
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
      Select a scene and describe the change. Editing with the AI arrives in D8.
    </p>
  );
}
