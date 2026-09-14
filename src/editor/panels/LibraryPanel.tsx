import { Tabs } from "@mantine/core";
import { BackgroundLibrary } from "../library/BackgroundLibrary";
import { SceneLibrary } from "../library/SceneLibrary";
import { SoundLibrary } from "../library/SoundLibrary";
import { TextLibrary } from "../library/TextLibrary";
import { VisualLibrary } from "../library/VisualLibrary";
import { VoiceLibrary } from "../library/VoiceLibrary";

const tabs = [
  { id: "text", label: "Text", Component: TextLibrary },
  { id: "visuals", label: "Visuals", Component: VisualLibrary },
  { id: "sound", label: "Sound", Component: SoundLibrary },
  { id: "voice", label: "Voice", Component: VoiceLibrary },
  { id: "scenes", label: "Scenes", Component: SceneLibrary },
  { id: "backgrounds", label: "BG", Component: BackgroundLibrary },
];

export function LibraryPanel() {
  return (
    <Tabs
      defaultValue="text"
      keepMounted={false}
      className="editor-ui flex w-[clamp(260px,19vw,420px)] shrink-0 flex-col overflow-hidden border-0 border-r border-solid border-editor-border bg-editor-panel"
    >
      <Tabs.List className="grid grid-cols-3" aria-label="Library">
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} value={tab.id}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {tabs.map(({ id, Component }) => (
        <Tabs.Panel
          key={id}
          value={id}
          className="min-h-0 flex-1 overflow-y-auto p-3"
        >
          <Component />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
