import { Button, Slider, UnstyledButton } from "@mantine/core";
import { useProjectStore } from "../state/projectStore";
import { qualifySelection } from "../timeline/selectionId";

type SceneObjectListProps = {
  rows: {
    id: string;
    label: string;
    detail?: string;
  }[];
  emptyLabel: string;
  onAdd?: () => void;
  addLabel?: string;
  onMove?: (id: string, direction: -1 | 1) => void;
  onRemove?: (id: string) => void;
};

export function SceneObjectList({
  rows,
  emptyLabel,
  onAdd,
  addLabel,
  onMove,
  onRemove,
}: SceneObjectListProps) {
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectObject = useProjectStore((s) => s.selectObject);
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  return (
    <div className="flex flex-col gap-[5px]">
      {rows.length === 0 ? (
        <div className="text-[11px] text-editor-muted">{emptyLabel}</div>
      ) : null}
      {rows.map((row, index) => {
        const qualified = qualifySelection(
          selectedSceneId ?? undefined,
          row.id,
        );
        const selected = selectedObjectId === qualified;
        return (
          <div
            key={row.id}
            className={`flex items-center gap-1 p-[7px_8px] rounded-[7px] ${selected ? "[border:1px_solid_#FF7024]" : "[border:1px_solid_#2c2c2c]"} ${selected ? "bg-[rgba(255,112,36,0.08)]" : "bg-editor-panel-raised"}`}
          >
            <UnstyledButton
              onClick={() => selectObject(qualified)}
              aria-label="Open settings"
              className="flex-1 min-w-0 block min-w-0 rounded-md p-2 text-left"
            >
              <div className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap">
                {row.label || <em className="text-editor-muted">(empty)</em>}
              </div>
              {row.detail ? (
                <div className="text-[10px] text-editor-muted">
                  {row.detail}
                </div>
              ) : null}
            </UnstyledButton>
            {onMove ? (
              <>
                <Button
                  variant="default"
                  className="px-2"
                  disabled={index === 0}
                  aria-label="Move up"
                  onClick={() => onMove(row.id, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="default"
                  className="px-2"
                  disabled={index === rows.length - 1}
                  aria-label="Move down"
                  onClick={() => onMove(row.id, 1)}
                >
                  ↓
                </Button>
              </>
            ) : null}
            {onRemove ? (
              <Button
                variant="default"
                className="px-2"
                aria-label="Remove"
                onClick={() => onRemove(row.id)}
              >
                ×
              </Button>
            ) : null}
          </div>
        );
      })}
      {onAdd ? (
        <Button variant="default" className="px-2 mt-[3px]" onClick={onAdd}>
          {addLabel ?? "+ Add"}
        </Button>
      ) : null}
    </div>
  );
}

type StackPositionFieldsProps = {
  x?: number;
  y?: number;
  onChange: (patch: { richHeadlineX?: number; richHeadlineY?: number }) => void;
};

export function StackPositionFields({
  x,
  y,
  onChange,
}: StackPositionFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      {(
        [
          [
            "X",
            x,
            (value: number | undefined) => onChange({ richHeadlineX: value }),
          ],
          [
            "Y",
            y,
            (value: number | undefined) => onChange({ richHeadlineY: value }),
          ],
        ] as const
      ).map(([label, value, set]) => (
        <div key={label}>
          <div className="flex justify-between text-[10px] text-editor-muted">
            <span>{label}</span>
            <span>
              {value === undefined ? "auto" : `${Math.round(value)}%`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Slider
              min={0}
              max={100}
              step={0.5}
              value={value ?? 50}
              onChange={(value) => set(Number(value))}
              className="flex-1"
            />
            <Button
              variant="default"
              className={`px-2 ${value === undefined ? "opacity-[0.4]" : "opacity-[1]"}`}
              aria-label="Reset to automatic position"
              onClick={() => set(undefined)}
            >
              ↺
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
