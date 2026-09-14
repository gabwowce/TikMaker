import {
  Button,
  FileButton,
  NativeSelect,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import type { BackgroundFill, CustomBackground } from "../../schema/scene";
import { assetKind, useCustomAssetsStore } from "../state/customAssetsStore";
import { useProjectStore } from "../state/projectStore";
import { useSavedBackgroundsStore } from "../state/savedBackgroundsStore";
import { BackgroundSwatch } from "./BackgroundSwatch";
export function CustomBackgroundBuilder({
  sceneId,
}: {
  sceneId: string | null;
}) {
  const assets = useCustomAssetsStore((state) => state.assets);
  const loadAssets = useCustomAssetsStore((state) => state.load);
  const uploadAsset = useCustomAssetsStore((state) => state.upload);
  const saveBackground = useSavedBackgroundsStore((state) => state.save);
  const updateSceneBackground = useProjectStore(
    (state) => state.updateSceneBackground,
  );
  const [kind, setKind] = useState<BackgroundFill["kind"]>("solid");
  const [color, setColor] = useState("#171717");
  const [secondColor, setSecondColor] = useState("#FF7024");
  const [shape, setShape] = useState<"linear" | "radial">("linear");
  const [angle, setAngle] = useState(135);
  const [imageSrc, setImageSrc] = useState("");
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const images = assets.filter((asset) => assetKind(asset) === "image");
  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);
  function buildBackground(): CustomBackground | null {
    if (kind === "solid") return { type: "custom", fill: { kind, color } };
    if (kind === "gradient") {
      return {
        type: "custom",
        fill: { kind, colors: [color, secondColor], shape, angle },
      };
    }
    if (imageSrc)
      return { type: "custom", fill: { kind: "image", src: imageSrc } };
    return null;
  }
  const background = buildBackground();
  function applyBackground() {
    if (sceneId && background) updateSceneBackground(sceneId, background);
  }
  function save() {
    if (!background || !name.trim()) return;
    saveBackground(name, background);
    applyBackground();
    setName("");
  }
  async function uploadImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const asset = await uploadAsset(file, file.name);
      setImageSrc(asset.src);
    } catch {
      setError("Image upload failed.");
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
      </div>

      {kind !== "image" ? (
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
      {kind === "image" ? (
        <>
          <NativeSelect
            label="Image"
            data={[
              { value: "", label: "Select image" },
              ...images.map((image) => ({
                value: image.src,
                label: image.label,
              })),
            ]}
            value={imageSrc}
            onChange={(event) => setImageSrc(event.currentTarget.value)}
          />
          <FileButton accept="image/*" onChange={uploadImage}>
            {(props) => (
              <Button {...props} variant="default" loading={uploading}>
                Upload image
              </Button>
            )}
          </FileButton>
          {error ? (
            <div role="alert" className="text-xs text-red-400">
              {error}
            </div>
          ) : null}
        </>
      ) : null}

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
