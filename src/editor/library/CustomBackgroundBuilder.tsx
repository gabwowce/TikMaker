import {
  Button,
  FileButton,
  NativeSelect,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import type { BackgroundFill, CustomBackground } from "../../schema/scene";
import { useCustomAssets, useSavedBackgrounds } from "../../api/library";
import { useProjectStore } from "../state/projectStore";
import { SliderField } from "../timeline/ObjectControls";
import { BackgroundSwatch } from "./BackgroundSwatch";
export function CustomBackgroundBuilder({
  sceneId,
}: {
  sceneId: string | null;
}) {
  const { assets, upload: uploadAsset } = useCustomAssets();
  const { save: saveBackground } = useSavedBackgrounds();
  const updateSceneBackground = useProjectStore(
    (state) => state.updateSceneBackground,
  );
  const [kind, setKind] = useState<BackgroundFill["kind"]>("solid");
  const [color, setColor] = useState("#171717");
  const [secondColor, setSecondColor] = useState("#FF7024");
  const [shape, setShape] = useState<"linear" | "radial">("linear");
  const [angle, setAngle] = useState(135);
  const [mediaSrc, setMediaSrc] = useState(""); // picture or video file
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [grid, setGrid] = useState<CustomBackground["grid"]>("none");
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  function buildBackground(): CustomBackground | null {
    if (kind === "solid")
      return { type: "custom", fill: { kind, color }, grid };
    if (kind === "gradient") {
      return {
        type: "custom",
        fill: { kind, colors: [color, secondColor], shape, angle },
        grid,
      };
    }
    if (mediaSrc && (kind === "image" || kind === "video"))
      return {
        type: "custom",
        fill: { kind, src: mediaSrc, focusX, focusY, zoom },
        grid,
      };
    return null;
  }
  const background = buildBackground();
  function applyBackground() {
    if (sceneId && background) updateSceneBackground(sceneId, background);
  }
  // A picture or video background is applied as soon as a file is picked and
  // again on every Focus / Zoom / Grid change, so the preview shows the
  // framing while you adjust it (no need to press Apply).
  const liveMedia = (kind === "image" || kind === "video") && mediaSrc !== "";
  useEffect(() => {
    if (liveMedia) applyBackground();
  }, [liveMedia, kind, mediaSrc, focusX, focusY, zoom, grid, sceneId]);
  function save() {
    if (!background || !name.trim()) return;
    saveBackground(name, background);
    applyBackground();
    setName("");
  }
  // uploads a picture or a video (whichever kind is picked) and selects it
  async function uploadMedia(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const asset = await uploadAsset(file, file.name);
      setMediaSrc(asset.src);
    } catch {
      setError(
        kind === "video" ? "Video upload failed." : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          fullWidth
          variant={kind === "solid" ? "filled" : "default"}
          onClick={() => setKind("solid")}
        >
          Solid
        </Button>
        <Button
          fullWidth
          variant={kind === "gradient" ? "filled" : "default"}
          onClick={() => setKind("gradient")}
        >
          Gradient
        </Button>
        <Button
          fullWidth
          variant={kind === "image" ? "filled" : "default"}
          onClick={() => setKind("image")}
        >
          Image
        </Button>
        <Button
          fullWidth
          variant={kind === "video" ? "filled" : "default"}
          onClick={() => setKind("video")}
        >
          Video
        </Button>
      </div>

      {kind === "solid" || kind === "gradient" ? (
        <TextInput
          type="color"
          label="Color"
          value={color}
          onChange={(event) => setColor(event.currentTarget.value)}
        />
      ) : null}
      {kind === "gradient" ? (
        <>
          <TextInput
            type="color"
            label="Second color"
            value={secondColor}
            onChange={(event) => setSecondColor(event.currentTarget.value)}
          />
          <NativeSelect
            label="Shape"
            data={[
              { value: "linear", label: "Linear" },
              { value: "radial", label: "Radial" },
            ]}
            value={shape}
            onChange={(event) =>
              setShape(
                event.currentTarget.value === "radial" ? "radial" : "linear",
              )
            }
          />
          {shape === "linear" ? (
            <NumberInput
              label="Angle"
              min={0}
              max={360}
              value={angle}
              onChange={(value) => setAngle(Number(value))}
            />
          ) : null}
        </>
      ) : null}
      {kind === "image" || kind === "video" ? (
        <>
          <NativeSelect
            label={kind === "video" ? "Video" : "Image"}
            data={[
              {
                value: "",
                label: kind === "video" ? "Select video" : "Select image",
              },
              ...assets
                .filter((asset) => asset.kind === kind)
                .map((asset) => ({ value: asset.src, label: asset.label })),
            ]}
            value={mediaSrc}
            onChange={(event) => setMediaSrc(event.currentTarget.value)}
          />
          <FileButton
            accept={kind === "video" ? "video/*" : "image/*"}
            onChange={uploadMedia}
          >
            {(props) => (
              <Button {...props} variant="default" loading={uploading}>
                {kind === "video" ? "Upload video" : "Upload image"}
              </Button>
            )}
          </FileButton>
          {error ? (
            <div role="alert" className="text-xs text-red-400">
              {error}
            </div>
          ) : null}
          {/* which part of a wide picture / video stays in the 9:16 frame */}
          <SliderField
            label="Focus X"
            value={focusX}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={setFocusX}
          />
          <SliderField
            label="Focus Y"
            value={focusY}
            min={0}
            max={100}
            step={1}
            suffix="%"
            onChange={setFocusY}
          />
          <SliderField
            label="Zoom"
            value={zoom}
            min={1}
            max={4}
            step={0.05}
            suffix="×"
            onChange={setZoom}
          />
        </>
      ) : null}

      <NativeSelect
        label="Grid overlay"
        value={grid}
        data={[
          { value: "none", label: "None" },
          { value: "lines", label: "Squares" },
          { value: "dots", label: "Dots" },
        ]}
        onChange={(event) =>
          setGrid(event.currentTarget.value as CustomBackground["grid"])
        }
      />
      {background ? <BackgroundSwatch background={background} /> : null}
      <Button disabled={!sceneId || !background} onClick={applyBackground}>
        Apply
      </Button>
      <TextInput
        label="Background name"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <Button
        variant="default"
        disabled={!background || !name.trim()}
        onClick={save}
      >
        Save background
      </Button>
    </div>
  );
}
