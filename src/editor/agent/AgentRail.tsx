import { ActionIcon } from "@mantine/core";
import { useLatestRun } from "../../api/agent";
import { useProjectStore } from "../state/projectStore";
import { runRoad } from "./RunProgress";

// The AI panel collapsed: one ✦ button, and while the agent works on the
// open project a dot per step under it, so the progress stays visible
// without the panel taking any room.
export function AgentRail({ onOpen }: { onOpen: () => void }) {
  const projectId = useProjectStore((s) => s.project.id);
  const { run, working } = useLatestRun(projectId);
  const road = run && working ? runRoad(run) : undefined;

  return (
    <aside className="editor-ui flex w-11 shrink-0 flex-col items-center gap-3 border-0 border-l border-solid border-editor-border py-2">
      <ActionIcon
        aria-label="Open the AI agent"
        variant="default"
        onClick={onOpen}
      >
        ✦
      </ActionIcon>
      {road ? (
        <div className="flex flex-col items-center gap-1.5">
          {road.steps.map((step, index) => (
            <span
              key={step.label}
              title={step.label}
              className={`size-1.5 rounded-full ${index <= road.active ? "bg-editor-accent" : "bg-editor-border"} ${index === road.active ? "animate-pulse" : ""}`}
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}
