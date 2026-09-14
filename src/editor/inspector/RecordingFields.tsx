import { NativeSelect, TextInput } from "@mantine/core";
import { screenAspectSchema, type VisualConfig } from "../../schema/visual";
import { ImportPicker } from "./MediaInputs";
type Props = { visual: VisualConfig; onChange: (visual: VisualConfig) => void };
export function RecordingFields({ visual, onChange }: Props) {
  if (visual.type === "recording") {
    return (
      <div className="flex flex-col gap-2">
        <ImportPicker
          kind="video"
          src={visual.src}
          onChange={(src) => onChange({ ...visual, src })}
        />
        <TextInput
          className="w-full"
          value={visual.src}
          onChange={(e) => onChange({ ...visual, src: e.target.value })}
          placeholder="/assets/recordings/clip.mp4"
        />
        {visual.src ? (
          <video
            src={visual.src}
            muted
            playsInline
            controls
            preload="metadata"
            className="w-full max-h-[140px] rounded-md bg-black"
          />
        ) : null}
        <div className="text-[10px] text-editor-muted">
          Frame around the clip
        </div>
        <NativeSelect
          className="w-full"
          value={visual.frame}
          onChange={(e) =>
            onChange({
              ...visual,
              frame: e.target.value as typeof visual.frame,
            })
          }
        >
          <option value="none">none (bare clip)</option>
          <option value="plain">plain screen (rounded, no chrome)</option>
          <option value="browser">browser window</option>
          <option value="phone">phone</option>
        </NativeSelect>
        {visual.frame === "plain" ? (
          <>
            <div className="text-[10px] text-editor-muted">Card shape</div>
            <NativeSelect
              className="w-full"
              value={visual.aspect ?? "16:10"}
              onChange={(e) =>
                onChange({
                  ...visual,
                  aspect: e.target.value as typeof visual.aspect,
                })
              }
            >
              {screenAspectSchema.options.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </NativeSelect>
          </>
        ) : null}
        {visual.frame === "browser" ? (
          <>
            <div className="text-[10px] text-editor-muted">Browser chrome</div>
            <TextInput
              className="w-full"
              value={visual.url ?? ""}
              onChange={(e) =>
                onChange({ ...visual, url: e.target.value || undefined })
              }
              placeholder="Address bar — e.g. app.yoursite.com/dashboard"
            />
            <TextInput
              className="w-full"
              value={visual.title ?? ""}
              onChange={(e) =>
                onChange({ ...visual, title: e.target.value || undefined })
              }
              placeholder="Active tab title (defaults to the domain)"
            />
            <TextInput
              className="w-full"
              value={(visual.tabs ?? []).join(", ")}
              onChange={(e) =>
                onChange({
                  ...visual,
                  tabs: e.target.value
                    ? e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .slice(0, 3)
                    : undefined,
                })
              }
              placeholder="Other tabs, comma-separated (optional)"
            />
          </>
        ) : null}
        <div className="flex gap-2">
          <NativeSelect
            className="w-full"
            value={visual.fit ?? "cover"}
            onChange={(e) =>
              onChange({ ...visual, fit: e.target.value as typeof visual.fit })
            }
          >
            <option value="cover">cover</option>
            <option value="contain">contain</option>
          </NativeSelect>
          <TextInput
            type="number"
            step={0.1}
            min={0.1}
            className="w-full"
            value={visual.playbackRate ?? 1}
            onChange={(e) =>
              onChange({
                ...visual,
                playbackRate: Number(e.target.value) || undefined,
              })
            }
            placeholder="Speed"
          />
        </div>
        <div className="flex gap-2">
          <TextInput
            type="number"
            min={0}
            className="w-full"
            value={visual.startFrom ?? ""}
            onChange={(e) =>
              onChange({
                ...visual,
                startFrom:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="Start frame"
          />
          <TextInput
            type="number"
            min={0}
            className="w-full"
            value={visual.endAt ?? ""}
            onChange={(e) =>
              onChange({
                ...visual,
                endAt:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            placeholder="End frame"
          />
        </div>
        {visual.endAt !== undefined &&
        visual.endAt <= (visual.startFrom ?? 0) ? (
          <div className="text-[10px] text-[#ff8a65]">
            End frame must follow start frame.
          </div>
        ) : null}
      </div>
    );
  }
  return null;
}
