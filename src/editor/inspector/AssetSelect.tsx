import { Button, NativeSelect } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { propList } from "../../registries/propRegistry";
import { toolList } from "../../registries/toolRegistry";
import { type VisualConfig } from "../../schema/visual";
import {
  assetKind,
  useCustomAssetsStore,
  type CustomAsset,
} from "../state/customAssetsStore";

export type AssetOption = {
  key: string;
  label: string;
  src: string;
  toVisual: () => VisualConfig;
};

const staticAssetOptions: AssetOption[] = [
  ...propList.map((prop) => ({
    key: `prop:${prop.id}`,
    label: prop.name,
    src: prop.src,
    toVisual: (): VisualConfig => ({ type: "prop", asset: prop.id }),
  })),
  ...toolList.map((tool) => ({
    key: `tool:${tool.id}`,
    label: tool.name,
    src: tool.src,
    toVisual: (): VisualConfig => ({ type: "tool-logo", tool: tool.id }),
  })),
];

export const assetOptions = staticAssetOptions;

export function customAssetToVisual(asset: CustomAsset): VisualConfig {
  return assetKind(asset) === "video"
    ? {
        type: "recording",
        src: asset.src,
        frame: "browser",
        fit: "cover",
        playbackRate: 1,
      }
    : { type: "image", src: asset.src };
}

export function buildAssetOptions(custom: CustomAsset[]): AssetOption[] {
  return [
    ...staticAssetOptions,
    ...custom.map((asset) => ({
      key: `custom:${asset.id}`,
      label: asset.label,
      src: asset.src,
      toVisual: (): VisualConfig => customAssetToVisual(asset),
    })),
  ];
}

function assetKeyOf(
  visual: VisualConfig | undefined,
  custom: CustomAsset[],
): string {
  if (!visual) return "";
  if (visual.type === "prop") return `prop:${visual.asset}`;
  if (visual.type === "tool-logo") return `tool:${visual.tool}`;
  if (visual.type === "image" || visual.type === "recording") {
    const match = custom.find((a) => a.src === visual.src);
    if (match) return `custom:${match.id}`;
  }
  return "";
}

type AssetImportButtonProps = {
  onImported: (visual: VisualConfig, asset: CustomAsset) => void;
  accept?: string;
  label?: string;
};

export function AssetImportButton({
  onImported,
  accept = "image/*,video/*",
  label = "Import…",
}: AssetImportButtonProps) {
  const upload = useCustomAssetsStore((s) => s.upload);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  async function handleFile(file: File) {
    setBusy(true);
    setError(undefined);
    try {
      const name = file.name.replace(/\.[^.]+$/, "") || file.name;
      const asset = await upload(file, name);
      onImported(customAssetToVisual(asset), asset);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        variant="default"
        className={`${busy ? "opacity-[0.6]" : "opacity-[1]"}`}
        disabled={busy}
        aria-label="Import a PNG or a screen recording from your computer and use it here"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : label}
      </Button>
      {error ? (
        <div className="text-[10px] text-[#ff8a65] mt-1">{error}</div>
      ) : null}
    </>
  );
}

type AssetSelectProps = {
  value: VisualConfig | undefined;
  allowNone?: boolean;
  onChange: (v: VisualConfig | undefined) => void;
};

export function AssetSelect({ value, allowNone, onChange }: AssetSelectProps) {
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);
  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);
  const options = buildAssetOptions(customAssets);
  return (
    <div className="flex gap-1.5 items-start">
      <NativeSelect
        className="w-full flex-1 min-w-0"
        value={assetKeyOf(value, customAssets)}
        onChange={(e) =>
          onChange(
            e.target.value
              ? options.find((a) => a.key === e.target.value)?.toVisual()
              : undefined,
          )
        }
      >
        {allowNone ? <option value="">None</option> : null}
        {customAssets.length > 0 ? (
          <optgroup label="Your Imports">
            {options
              .filter((a) => a.key.startsWith("custom:"))
              .map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
          </optgroup>
        ) : null}
        <optgroup label="Props">
          {options
            .filter((a) => a.key.startsWith("prop:"))
            .map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
        </optgroup>
        <optgroup label="Tool Logos">
          {options
            .filter((a) => a.key.startsWith("tool:"))
            .map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
        </optgroup>
      </NativeSelect>
      <AssetImportButton onImported={onChange} />
    </div>
  );
}
