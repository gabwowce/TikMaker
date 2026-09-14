import { Button } from "@mantine/core";
import { useEffect, useState } from "react";
import { InspectorPanel } from "./panels/InspectorPanel";
import { useProjectStore } from "./state/projectStore";
import { TimelineObjectPanel } from "./timeline/TimelineObjectPanel";

export function EditorInspector() {
  const selectedObjectId = useProjectStore((state) => state.selectedObjectId);
  const selectObject = useProjectStore((state) => state.selectObject);
  const [tab, setTab] = useState<"object" | "scene">("object");
  useEffect(() => setTab("object"), [selectedObjectId]);

  if (!selectedObjectId) return <InspectorPanel />;

  return (
    <aside className="panel-stack flex min-h-0 w-[clamp(300px,23vw,480px)] shrink-0 flex-col overflow-hidden border-0 border-l border-solid border-editor-border bg-editor-panel">
      <div className="editor-ui flex shrink-0 gap-2 px-3 pt-2">
        <Button
          fullWidth
          variant={tab === "object" ? "filled" : "default"}
          onClick={() => setTab("object")}
        >
          Object
        </Button>
        <Button
          fullWidth
          variant={tab === "scene" ? "filled" : "default"}
          onClick={() => setTab("scene")}
        >
          Scene
        </Button>
      </div>
      {tab === "object" ? (
        <TimelineObjectPanel
          selectionId={selectedObjectId}
          onClose={() => selectObject(null)}
        />
      ) : (
        <InspectorPanel />
      )}
    </aside>
  );
}
