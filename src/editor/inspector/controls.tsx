import { Button, Slider, TextInput } from "@mantine/core";
import { OFF_FRAME_DISTANCE } from "../../video/motion/entrances";
import { videoDefaults } from "../../video/typography/tokens";
import { useProjectStore } from "../state/projectStore";

function animationSeconds(frames: number) {
  return Number((frames / videoDefaults.fps).toFixed(2));
}

type SecondsSliderProps = {
  label: string;
  frames: number;
  minFrames?: number;
  maxFrames?: number;
  onChange: (frames: number) => void;
};

export function SecondsSlider({
  label,
  frames,
  minFrames = 0,
  maxFrames = 300,
  onChange,
}: SecondsSliderProps) {
  const seconds = animationSeconds(frames);
  const begin = useProjectStore((state) => state.beginHistoryTransaction);
  const end = useProjectStore((state) => state.endHistoryTransaction);
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
          {label}
        </span>
        <span className="text-[10px] text-editor-text">
          {seconds.toFixed(2)} s
        </span>
      </div>
      <Slider
        thumbLabel={label}
        onChangeEnd={end}
        min={minFrames / videoDefaults.fps}
        max={maxFrames / videoDefaults.fps}
        step={0.1}
        value={seconds}
        onPointerDown={begin}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={begin}
        onKeyUp={end}
        onChange={(value) =>
          onChange(
            Math.max(
              minFrames,
              Math.min(
                maxFrames,
                Math.round(Number(value) * videoDefaults.fps),
              ),
            ),
          )
        }
        className="w-full"
      />
    </div>
  );
}

type DistanceControlProps = {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
};

export function DistanceControl({
  label,
  value,
  onChange,
}: DistanceControlProps) {
  return (
    <div className="mb-1.5">
      <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
        {label} — {value === undefined ? "Auto" : `${value}px`}
      </div>
      <div className="grid [grid-template-columns:2fr_1fr] gap-1.5 items-center">
        <Slider
          thumbLabel={label}
          min={0}
          max={1800}
          step={20}
          value={value ?? 60}
          onChange={(value) => onChange(Number(value))}
        />
        <TextInput
          type="number"
          min={0}
          max={2400}
          className="w-full"
          value={value ?? ""}
          placeholder="auto"
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      </div>
      <div className="flex gap-1.5 mt-1">
        <Button variant="default" onClick={() => onChange(undefined)}>
          Default
        </Button>
        <Button variant="default" onClick={() => onChange(600)}>
          Far
        </Button>
        <Button variant="default" onClick={() => onChange(OFF_FRAME_DISTANCE)}>
          Off-frame
        </Button>
      </div>
    </div>
  );
}

// Saugiklių įspėjimas. Rodomas ten, kur redaguojama jį sukėlusi reikšmė —
// įspėjimas kitame skydelyje nei priežastis nepasiekia autoriaus.
export function Warning({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      role="status"
      className="mt-1.5 rounded-md border border-solid border-orange-500/40 bg-orange-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-orange-300"
    >
      {text}
    </div>
  );
}
