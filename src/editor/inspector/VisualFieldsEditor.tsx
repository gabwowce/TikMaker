import { NativeSelect } from "@mantine/core";
import { type VisualConfig } from "../../schema/visual";
import { DataFields } from "./DataFields";
import { DeviceFields } from "./DeviceFields";
import { DiagramFields } from "./DiagramFields";
import { ListVisualFields } from "./ListVisualFields";
import { ImageSrcField } from "./MediaInputs";
import { RecordingFields } from "./RecordingFields";
function summarizeVisual(visual: VisualConfig): string {
  switch (visual.type) {
    case "flow":
      return `flow: ${visual.nodes.map((n) => n.label ?? "node").join(" → ")}`;
    case "node-group":
      return `node-group (${visual.layout}): ${visual.nodes.length} nodes`;
    case "stack":
      return `stack: ${visual.items.length} items`;
    case "transform":
      return `transform: ${visual.from.type} → ${visual.to.type}`;
    case "browser":
      return `browser: ${visual.content.type}`;
    case "screen":
      return `screen (${visual.aspect ?? "16:10"}): ${visual.content.type}`;
    case "phone":
      return `phone: ${visual.content.type}`;
    default:
      return visual.type;
  }
}

const frameContentKinds: {
  id: VisualConfig["type"];
  label: string;
  build: () => VisualConfig;
}[] = [
  {
    id: "image",
    label: "Image / screenshot",
    build: () => ({ type: "image", src: "" }),
  },
  {
    id: "recording",
    label: "Screen recording",
    build: () => ({ type: "recording", src: "", frame: "none", fit: "cover" }),
  },
  {
    id: "app-mockup",
    label: "App mockup",
    build: () => ({
      type: "app-mockup",
      appTitle: "YOUR APP",
      kind: "list",
      items: ["Row one", "Row two"],
    }),
  },
  {
    id: "checklist",
    label: "Checklist",
    build: () => ({
      type: "checklist",
      items: [{ label: "ITEM ONE" }, { label: "ITEM TWO" }],
    }),
  },
  {
    id: "stat-counter",
    label: "Stat counter",
    build: () => ({ type: "stat-counter", from: 0, to: 100, label: "USERS" }),
  },
];

type FrameContentEditorProps = {
  content: VisualConfig;
  onChange: (v: VisualConfig) => void;
};

function FrameContentEditor({ content, onChange }: FrameContentEditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] text-editor-muted">What's on the screen</div>
      <NativeSelect
        className="w-full"
        value={content.type}
        onChange={(e) => {
          const kind = frameContentKinds.find((k) => k.id === e.target.value);
          if (kind) onChange(kind.build());
        }}
      >
        {frameContentKinds.map((kind) => (
          <option key={kind.id} value={kind.id}>
            {kind.label}
          </option>
        ))}
        {frameContentKinds.every((k) => k.id !== content.type) ? (
          <option value={content.type}>{content.type} (current)</option>
        ) : null}
      </NativeSelect>
      <div className="pl-2 [border-left:2px_solid_#2c2c2c]">
        <VisualFieldsEditor visual={content} onChange={onChange} />
      </div>
    </div>
  );
}

type VisualFieldsEditorProps = {
  visual: VisualConfig;
  onChange: (v: VisualConfig) => void;
};
export function VisualFieldsEditor({
  visual,
  onChange,
}: VisualFieldsEditorProps) {
  switch (visual.type) {
    case "image":
      return (
        <ImageSrcField
          src={visual.src}
          onChange={(src) => onChange({ ...visual, src })}
        />
      );
    case "recording":
      return <RecordingFields visual={visual} onChange={onChange} />;
    case "browser":
    case "phone":
      return (
        <DeviceFields visual={visual} onChange={onChange}>
          <FrameContentEditor
            content={visual.content}
            onChange={(content) => onChange({ ...visual, content })}
          />
        </DeviceFields>
      );
    case "stat-counter":
    case "checkpoint":
    case "progress":
      return <DataFields visual={visual} onChange={onChange} />;
    case "checklist":
    case "pricing-card":
    case "app-mockup":
      return <ListVisualFields visual={visual} onChange={onChange} />;
    case "node-group":
    case "keycap":
      return <DiagramFields visual={visual} onChange={onChange} />;
    default:
      return (
        <div className="text-xs text-editor-muted">
          {summarizeVisual(visual)}
        </div>
      );
  }
}
