import { ActionIcon, Button, TextInput } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { AssetImportButton, buildAssetOptions } from "../inspector/AssetSelect";
import { useCustomAssetsStore } from "../state/customAssetsStore";
import {
  confirmDeleteTimelineObject,
  describeTimelineObject,
} from "./deleteTimelineObject";
import {
  clipboardHas,
  clipboardLabel,
  copyTimelineObject,
  duplicateTimelineObject,
  pasteTimelineObject,
  replaceVisualAsset,
} from "./objectClipboard";
import { objectIdOf } from "./selectionId";
export type ContextTarget = {
  selectionId: string;
  x: number;
  y: number;
};
type TimelineContextMenuProps = {
  target: ContextTarget;
  playheadLocalFrame: number;
  onClose: () => void;
  onSelect: (selectionId: string | null) => void;
};
export function TimelineContextMenu({
  target,
  playheadLocalFrame,
  onClose,
  onSelect,
}: TimelineContextMenuProps) {
  const [picking, setPicking] = useState(false);
  const { selectionId } = target;
  const isVisual = objectIdOf(selectionId).startsWith("visual-");
  const { deletable } = describeTimelineObject(selectionId);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointerDown() {
      return onClose();
    }
    window.addEventListener("keydown", onKey);
    const timer = setTimeout(
      () => window.addEventListener("pointerdown", onPointerDown),
      0,
    );
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);
  if (picking) {
    return (
      <AssetPicker
        onPick={(visual) => {
          replaceVisualAsset(selectionId, visual);
          onClose();
        }}
        onClose={onClose}
      />
    );
  }
  const pasted = clipboardLabel();
  return (
    <div
      className="editor-ui fixed z-[1000] flex min-w-[210px] flex-col gap-0.5 rounded-lg border border-solid border-editor-border bg-editor-panel p-1 shadow-xl"
      style={{
        left: Math.min(target.x, window.innerWidth - 320),
        top: Math.min(target.y, window.innerHeight - 260),
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {isVisual ? (
        <Button
          variant="default"
          className="w-full"
          onClick={() => setPicking(true)}
        >
          🖼 Replace asset…
        </Button>
      ) : null}
      <Button
        variant="default"
        className="w-full"
        onClick={() => {
          copyTimelineObject(selectionId);
          onClose();
        }}
      >
        Copy <span className="text-[10px] text-editor-muted">Ctrl+C</span>
      </Button>
      <Button
        variant="default"
        className="w-full"
        onClick={() => {
          onSelect(duplicateTimelineObject(selectionId, playheadLocalFrame));
          onClose();
        }}
      >
        Duplicate
      </Button>
      <Button
        variant="default"
        className={`w-full ${clipboardHas() ? "opacity-[1]" : "opacity-[0.4]"}`}
        disabled={!clipboardHas()}
        onClick={() => {
          onSelect(pasteTimelineObject(playheadLocalFrame));
          onClose();
        }}
      >
        Paste{" "}
        {pasted ? (
          <span className="text-[10px] text-editor-muted">
            {pasted.slice(0, 18)}
          </span>
        ) : null}
      </Button>
      {deletable ? (
        <Button
          variant="default"
          className="w-full"
          onClick={() => {
            if (confirmDeleteTimelineObject(selectionId)) onSelect(null);
            onClose();
          }}
        >
          Remove <span className="text-[10px] text-editor-muted">Delete</span>
        </Button>
      ) : null}
    </div>
  );
}
type AssetPickerProps = {
  onPick: (
    visual: ReturnType<
      ReturnType<typeof buildAssetOptions>[number]["toVisual"]
    >,
  ) => void;
  onClose: () => void;
};
function AssetPicker({ onPick, onClose }: AssetPickerProps) {
  const custom = useCustomAssetsStore((state) => state.assets);
  const load = useCustomAssetsStore((state) => state.load);
  const [query, setQuery] = useState("");
  useEffect(() => {
    load();
  }, [load]);
  const options = useMemo(() => buildAssetOptions(custom), [custom]);
  const filtered = query.trim()
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;
  return (
    <div
      className="fixed top-[8vh] left-[50%] [transform:translateX(-50%)] [z-index:1000] w-[min(560px,_92vw)] max-h-[84vh] flex flex-col p-3 rounded-[10px] border border-solid border-editor-border bg-editor-panel [box-shadow:0_24px_60px_rgba(0,0,0,0.65)]"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex gap-1.5 items-center mb-2">
        <TextInput
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search assets…"
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          className="w-full mb-1.5"
        />
        <ActionIcon
          variant="default"
          onClick={onClose}
          className="w-7.5 shrink-0"
          aria-label="Close"
        >
          ×
        </ActionIcon>
      </div>

      <div className="mb-2">
        <AssetImportButton onImported={onPick} />
      </div>

      <div className="grid [grid-template-columns:repeat(auto-fill,_minmax(86px,_1fr))] gap-1.5 flex-1 min-h-0 overflow-y-auto">
        {filtered.map((option) => (
          <Button
            variant="default"
            key={option.key}
            aria-label={option.label}
            onClick={() => onPick(option.toVisual())}
          >
            <img src={option.src} alt="" className="w-11 h-11 object-contain" />
            <span className="text-[9px] max-w-full whitespace-nowrap overflow-hidden text-ellipsis">
              {option.label}
            </span>
          </Button>
        ))}
        {filtered.length === 0 ? (
          <div className="text-[10px] text-editor-muted p-2">
            No results found.
          </div>
        ) : null}
      </div>
      <div className="text-[10px] text-editor-muted mt-2 text-center">
        {filtered.length} assets
      </div>
    </div>
  );
}
