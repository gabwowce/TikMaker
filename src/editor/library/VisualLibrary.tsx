import { Button, UnstyledButton } from "@mantine/core";
import { Fragment, useEffect, useState } from "react";
import { propList } from "../../registries/propRegistry";
import { toolList } from "../../registries/toolRegistry";
import {
  visualTemplateCategories,
  visualTemplateRegistry,
} from "../../registries/visualTemplateRegistry";
import type { VisualConfig } from "../../schema/visual";
import { splitCornerProps } from "../../utils/normalizeProject";
import { assetKind, useCustomAssetsStore } from "../state/customAssetsStore";
import type { VisualSlot } from "../state/projectStore";
import { useProjectStore } from "../state/projectStore";
import { VisualThumb } from "./VisualThumb";

const slotOptions: {
  id: VisualSlot;
  label: string;
}[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];
type Target = "layer" | "column";
const targetOptions: {
  id: Target;
  label: string;
}[] = [
  { id: "layer", label: "New layer" },
  { id: "column", label: "Comparison column" },
];
const STACK_STEP = 12;
const STACK_POSITIONS = 4;
export function VisualLibrary() {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const scene = useProjectStore((s) =>
    s.project.scenes.find((sc) => sc.id === s.selectedSceneId),
  );
  const updateSceneVisual = useProjectStore((s) => s.updateSceneVisual);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const activeVisualSlot = useProjectStore((s) => s.activeVisualSlot);
  const setActiveVisualSlot = useProjectStore((s) => s.setActiveVisualSlot);
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);
  const [target, setTarget] = useState<Target>("layer");
  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);
  const disabled = !selectedSceneId;
  const isComparison = scene?.type === "comparison";

  const layersFull = false;
  const showTargets = isComparison;
  const effectiveTarget: Target = isComparison ? target : "layer";
  function assign(visual: VisualConfig) {
    if (!selectedSceneId || !scene) return;
    if (effectiveTarget === "column") {
      if (activeVisualSlot === "main") setActiveVisualSlot("left");
      updateSceneVisual(selectedSceneId, visual);
      return;
    }
    if (layersFull) return;
    const existing = scene.content.visuals ?? [];
    const added = splitCornerProps({
      id: `visual-${Date.now().toString(36)}`,
      visual,
      x: 50,
      y: 50 - (existing.length % STACK_POSITIONS) * STACK_STEP,
    });
    updateSceneVisuals(selectedSceneId, [...existing, ...added]);
  }
  return (
    <div
      className={`${disabled ? "opacity-[0.4]" : "opacity-[1]"} ${disabled ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      {disabled ? (
        <div className="text-[12px] text-editor-muted">No scene selected</div>
      ) : null}

      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Target
      </div>
      {showTargets ? (
        <div className="flex gap-1.5">
          {targetOptions.map((option) => (
            <Button
              variant="default"
              key={option.id}
              onClick={() => setTarget(option.id)}
              className={`flex-1 ${effectiveTarget === option.id ? "[border:1px_solid_#FF7024]" : "[border:1px_solid_#2c2c2c]"} ${effectiveTarget === option.id ? "bg-editor-panel-raised" : "bg-transparent"} ${effectiveTarget === option.id ? "text-editor-accent" : "text-editor-muted"}`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : null}

      {isComparison && effectiveTarget === "column" ? (
        <>
          <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
            Assign visual to
          </div>
          <div className="flex gap-1.5 mb-2">
            {slotOptions.map((slot) => (
              <Button
                variant="default"
                key={slot.id}
                onClick={() => setActiveVisualSlot(slot.id)}
                className={`flex-1 ${activeVisualSlot === slot.id ? "[border:1px_solid_#FF7024]" : "[border:1px_solid_#2c2c2c]"} ${activeVisualSlot === slot.id ? "bg-editor-panel-raised" : "bg-transparent"} ${activeVisualSlot === slot.id ? "text-editor-accent" : "text-editor-muted"}`}
              >
                {slot.label}
              </Button>
            ))}
          </div>
        </>
      ) : null}

      {customAssets.length > 0 ? (
        <>
          <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
            Your Imports
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {customAssets.map((asset) => {
              const isVideo = assetKind(asset) === "video";
              return (
                <UnstyledButton
                  className="grid min-w-0 justify-items-center gap-2 rounded-md border border-solid border-editor-border bg-editor-panel-raised px-2 py-3 text-center text-[10px] [overflow-wrap:anywhere]"
                  key={asset.id}
                  aria-label={
                    isVideo
                      ? "Screen recording — inserted in a browser frame"
                      : asset.label
                  }
                  onClick={() =>
                    assign(
                      isVideo
                        ? {
                            type: "recording",
                            src: asset.src,
                            frame: "browser",
                            fit: "cover",
                            playbackRate: 1,
                          }
                        : { type: "image", src: asset.src },
                    )
                  }
                >
                  {isVideo ? (
                    <video
                      src={asset.src}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-7 h-7 object-cover rounded"
                    />
                  ) : (
                    <img
                      src={asset.src}
                      alt={asset.label}
                      className="w-7 h-7 object-contain"
                    />
                  )}
                  {asset.label}
                </UnstyledButton>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Tool Logos
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {toolList.map((tool) => (
          <UnstyledButton
            className="grid min-w-0 justify-items-center gap-2 rounded-md border border-solid border-editor-border bg-editor-panel-raised px-2 py-3 text-center text-[10px] [overflow-wrap:anywhere]"
            key={tool.id}
            onClick={() => assign({ type: "tool-logo", tool: tool.id })}
          >
            <img
              src={tool.src}
              alt={tool.name}
              className="w-7 h-7 object-contain"
            />
            {tool.name}
          </UnstyledButton>
        ))}
      </div>

      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Props
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {propList.map((prop) => (
          <UnstyledButton
            className="grid min-w-0 justify-items-center gap-2 rounded-md border border-solid border-editor-border bg-editor-panel-raised px-2 py-3 text-center text-[10px] [overflow-wrap:anywhere]"
            key={prop.id}
            onClick={() => assign({ type: "prop", asset: prop.id })}
          >
            <img
              src={prop.src}
              alt={prop.name}
              className="w-7 h-7 object-contain"
            />
            {prop.name}
          </UnstyledButton>
        ))}
      </div>

      {visualTemplateCategories.map((category) => {
        const presets = visualTemplateRegistry.filter(
          (preset) => preset.category === category.id,
        );
        if (presets.length === 0) return null;
        return (
          <Fragment key={category.id}>
            <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
              {category.label}
            </div>
            <div className="flex flex-col gap-1.5">
              {presets.map((preset) => (
                <UnstyledButton
                  className="block min-w-0 rounded-md p-2 text-left"
                  key={preset.id}
                  aria-label={preset.description}
                  onClick={() => assign(preset.build())}
                >
                  <VisualThumb visual={preset.build()} />
                  <div className="min-w-0">
                    <div className="font-semibold">{preset.label}</div>
                  </div>
                </UnstyledButton>
              ))}
            </div>
          </Fragment>
        );
      })}

      {selectedSceneId && isComparison && effectiveTarget === "column" ? (
        <Button
          variant="default"
          className="mt-2.5"
          onClick={() => updateSceneVisual(selectedSceneId, undefined)}
        >
          Remove this column's visual
        </Button>
      ) : null}
    </div>
  );
}
