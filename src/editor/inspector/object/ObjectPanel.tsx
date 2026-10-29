import { ActionIcon, Tabs } from "@mantine/core";
import { useEffect, useState } from "react";
import {
  DeleteObjectButton,
  EmptyInspector,
} from "../../timeline/ObjectControls";
import { AudioTab } from "./AudioTab";
import { BasicTab } from "./BasicTab";
import { EffectsTab } from "./EffectsTab";
import { objectTitle, useSelectedObject } from "./selectedObject";

type InspectorTab = "basic" | "effects" | "audio";

type ObjectPanelProps = {
  selectionId: string;
  onClose: () => void;
};

// The right-hand panel for the object picked in the timeline: its name, a ×
// to go back to the scene, and the Basic / Effects / Audio tabs.
export function ObjectPanel({ selectionId, onClose }: ObjectPanelProps) {
  const [tab, setTab] = useState<InspectorTab>("basic");
  useEffect(() => setTab("basic"), [selectionId]);
  const object = useSelectedObject(selectionId);
  if (!object) return <EmptyInspector onClose={onClose} />;
  const { title, subtitle } = objectTitle(object);
  return (
    <aside className="editor-ui w-[clamp(300px,_23vw,_480px)] shrink-0 min-h-0 flex flex-col border-0 border-l border-solid border-editor-border bg-editor-panel text-editor-text">
      <div className="flex justify-between items-start p-[16px_16px_12px] shrink-0">
        <div>
          <div className="text-[14px] font-bold">{title}</div>
          <div className="text-[10px] text-editor-muted mt-0.5">{subtitle}</div>
        </div>
        <ActionIcon
          variant="default"
          onClick={onClose}
          className="w-7"
          aria-label="Back to scene settings"
        >
          ×
        </ActionIcon>
      </div>
      <Tabs
        value={tab}
        onChange={(value) => setTab(value as InspectorTab)}
        className="mx-4 mb-2"
      >
        <Tabs.List grow>
          <Tabs.Tab value="basic">Basic</Tabs.Tab>
          <Tabs.Tab value="effects">Effects</Tabs.Tab>
          <Tabs.Tab value="audio">Audio</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <div className="flex-1 min-h-0 overflow-y-auto p-[4px_16px_20px]">
        {tab === "basic" ? (
          <>
            <BasicTab object={object} />
            <DeleteObjectButton selectionId={selectionId} onDeleted={onClose} />
          </>
        ) : null}
        {tab === "effects" ? <EffectsTab object={object} /> : null}
        {tab === "audio" ? <AudioTab object={object} /> : null}
      </div>
    </aside>
  );
}
