import { NativeSelect, TextInput } from "@mantine/core";
import { useEffect } from "react";
import { assetKind, useCustomAssetsStore } from "../state/customAssetsStore";
import { AssetImportButton } from "./AssetSelect";
export type ImportPickerProps = {
  kind: "image" | "video";
  src: string;
  onChange: (src: string) => void;
};

export function ImportPicker({ kind, src, onChange }: ImportPickerProps) {
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);
  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);
  const matching = customAssets.filter((a) => assetKind(a) === kind);
  const importButton = (
    <AssetImportButton
      accept={kind === "video" ? "video/*" : "image/*"}
      label={kind === "video" ? "Upload recording…" : "Upload image…"}
      onImported={(_visual, asset) => onChange(asset.src)}
    />
  );
  if (matching.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] text-editor-muted">
          {kind === "video" ? "No recordings" : "No images"}
        </div>
        <div className="flex">{importButton}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-1.5 items-center">
      <NativeSelect
        className="w-full flex-1 min-w-0"
        value={matching.some((a) => a.src === src) ? src : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        <option value="">Choose an uploaded file…</option>
        {matching.map((asset) => (
          <option key={asset.id} value={asset.src}>
            {asset.label}
          </option>
        ))}
      </NativeSelect>
      {importButton}
    </div>
  );
}

export type ImageSrcFieldProps = {
  src: string;
  onChange: (src: string) => void;
};

export function ImageSrcField({ src, onChange }: ImageSrcFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <ImportPicker kind="image" src={src} onChange={onChange} />
      <TextInput
        className="w-full"
        value={src}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/assets/… or a data URL"
      />
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full max-h-[120px] object-contain rounded-md bg-black"
        />
      ) : null}
    </div>
  );
}
