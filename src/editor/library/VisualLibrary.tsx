import { Button, TextInput, UnstyledButton } from "@mantine/core";
import { Fragment, useState, type ReactNode } from "react";
import { useLatestRun, useSendMessage } from "../../api/agent";
import { catalogBlocks } from "../../video/stage/catalogBlocks";
import { stage } from "../../video/stage/tokens";
import { propList } from "../../registries/propRegistry";
import { logoCategories, logoList } from "../../registries/logoRegistry";
import {
  visualTemplateCategories,
  visualTemplateRegistry,
} from "../../registries/visualTemplateRegistry";
import type { VisualConfig } from "../../schema/visual";
import { readImageSize } from "../../utils/imageSize";
import { splitCornerProps } from "../../utils/normalizeProject";
import { useCustomAssets } from "../../api/library";
import { useRemoveVisual, useVisuals, visualFrameUrl } from "../../api/visuals";
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

// The Visuals tab (docs/perziura-kodas.md, part 10): what is used most comes
// first. A search over everything; "ask the agent" for the selected scene of
// the agent's video; the channel's saved visuals (code scenes); blocks to put
// on top of a scene as layers; your imports, logos and props; the older
// presets folded under "More".

// "List · *grid*" → "List · grid"
const plainName = (name: string) => name.replace(/\*/g, "");
const matches = (query: string, ...texts: (string | undefined)[]) =>
  !query ||
  texts.some((text) => text?.toLowerCase().includes(query.toLowerCase()));

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
      {children}
    </div>
  );
}

// "Ask the agent": what this scene should show, in words – sent to the
// conversation as a message about the selected scene, so the agent picks
// its pictures again (the router makes it a "pictures" change).
function AskAgent({ sceneId }: { sceneId: string | null }) {
  const projectId = useProjectStore((s) => s.project.id);
  const { run } = useLatestRun(projectId);
  const send = useSendMessage();
  const [text, setText] = useState("");
  const prefix = run ? `scene-${run.id}-` : "";
  const sceneIndex =
    run && sceneId?.startsWith(prefix)
      ? Number(sceneId.slice(prefix.length)) - 1
      : -1;
  if (!run || sceneIndex < 0 || run.status !== "done") return null;
  return (
    <div className="flex flex-col gap-1.5">
      <SectionTitle>Ask the agent · scene {sceneIndex + 1}</SectionTitle>
      <div className="flex gap-1.5">
        <TextInput
          className="flex-1"
          size="xs"
          placeholder="e.g. show the cost as a burning banknote"
          value={text}
          onChange={(event) => setText(event.currentTarget.value)}
        />
        <Button
          size="xs"
          disabled={text.trim().length < 2}
          loading={send.isPending}
          onClick={() =>
            send.mutate(
              {
                runId: run.id,
                text: `Change this scene's picture: ${text.trim()}`,
                attachments: [{ sceneIndex, label: `Scene ${sceneIndex + 1}` }],
              },
              { onSuccess: () => setText("") },
            )
          }
        >
          Ask
        </Button>
      </div>
      <span className="text-[11px] text-editor-muted">
        The answer comes in the AI agent panel.
      </span>
    </div>
  );
}
// "My visuals" (docs/tikmaker-kryptis.md): the channel's saved code scenes –
// a frame, the name and what it shows. "Use here" asks the agent to put one
// into the selected scene of its video, fitted to that scene's words.
function MyVisuals({ sceneId, query }: { sceneId: string | null; query: string }) {
  const projectId = useProjectStore((s) => s.project.id);
  const workspaceId = useProjectStore((s) => s.project.workspaceId ?? "dev");
  const { data: visuals = [] } = useVisuals(workspaceId);
  const remove = useRemoveVisual();
  const { run } = useLatestRun(projectId);
  const send = useSendMessage();
  const prefix = run ? `scene-${run.id}-` : "";
  const sceneIndex =
    run && run.status === "done" && sceneId?.startsWith(prefix)
      ? Number(sceneId.slice(prefix.length)) - 1
      : -1;
  const shown = visuals.filter((v) => matches(query, v.title, v.description));
  if (!shown.length) return null;
  return (
    <>
      <SectionTitle>My visuals</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {shown.map((visual) => (
          <div
            key={visual.id}
            className="grid min-w-0 gap-1 rounded-md border border-solid border-editor-border bg-editor-panel-raised p-1.5 text-[10px]"
          >
            {visual.hasFrame ? (
              <img
                src={visualFrameUrl(workspaceId, visual.id)}
                alt={visual.title}
                className="w-full aspect-[9/16] object-cover rounded"
              />
            ) : (
              <div className="w-full aspect-[9/16] rounded bg-black/40" />
            )}
            <div className="font-semibold text-[11px]">{visual.title}</div>
            <div className="text-editor-muted line-clamp-3">{visual.description}</div>
            <div className="flex gap-1">
              <Button
                size="compact-xs"
                className="flex-1"
                disabled={sceneIndex < 0}
                loading={send.isPending}
                title={
                  sceneIndex < 0
                    ? "Select a scene of the agent's finished video"
                    : `Ask the agent to use it in scene ${sceneIndex + 1}`
                }
                onClick={() =>
                  run &&
                  send.mutate({
                    runId: run.id,
                    text: `Use my saved visual "${visual.title}" (${visual.id}) in this scene – adapt its code to this scene's words.`,
                    attachments: [{ sceneIndex, label: `Scene ${sceneIndex + 1}` }],
                  })
                }
              >
                {sceneIndex < 0 ? "Use here" : `Use in scene ${sceneIndex + 1}`}
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                aria-label={`Delete ${visual.title}`}
                onClick={() => remove.mutate({ workspaceId, id: visual.id })}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function VisualLibrary() {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const scene = useProjectStore((s) =>
    s.project.scenes.find((sc) => sc.id === s.selectedSceneId),
  );
  const updateSceneVisual = useProjectStore((s) => s.updateSceneVisual);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const activeVisualSlot = useProjectStore((s) => s.activeVisualSlot);
  const setActiveVisualSlot = useProjectStore((s) => s.setActiveVisualSlot);
  const { assets: customAssets } = useCustomAssets();
  const [target, setTarget] = useState<Target>("layer");
  const [query, setQuery] = useState("");
  const blocks = catalogBlocks.filter((entry) =>
    matches(query, plainName(entry.name), entry.block.kind),
  );
  const imports = customAssets.filter((asset) => matches(query, asset.label));
  const props = propList.filter((prop) => matches(query, prop.name, prop.id));
  const presets = visualTemplateRegistry.filter((preset) =>
    matches(query, preset.label, preset.description),
  );
  const disabled = !selectedSceneId;
  const isComparison = scene?.type === "comparison";

  const layersFull = false;
  const showTargets = isComparison;
  const effectiveTarget: Target = isComparison ? target : "layer";
  // A block goes where the agent's blocks go: centred on the stage's top zone.
  function assignBlock(block: (typeof catalogBlocks)[number]["block"]) {
    if (!selectedSceneId || !scene) return;
    const existing = scene.content.visuals ?? [];
    updateSceneVisuals(selectedSceneId, [
      ...existing,
      {
        id: `visual-${Date.now().toString(36)}`,
        visual: { type: "stage-block", block: { onWord: "", ...block } },
        x: 50,
        y: (stage.visualCenterY / 1920) * 100,
        scale: 1,
      },
    ]);
  }

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

      <TextInput
        size="xs"
        placeholder="Search blocks, logos, props…"
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <AskAgent sceneId={selectedSceneId} />
      <MyVisuals sceneId={selectedSceneId} query={query} />

      {blocks.length ? (
        <>
          <SectionTitle>Blocks · layers on top</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5">
            {blocks.map((entry) => (
              <UnstyledButton
                key={entry.name}
                className="grid min-w-0 justify-items-center gap-1 rounded-md border border-solid border-editor-border bg-editor-panel-raised p-1.5 text-center text-[10px]"
                aria-label={plainName(entry.name)}
                onClick={() => assignBlock(entry.block)}
              >
                <VisualThumb
                  visual={{
                    type: "stage-block",
                    block: { onWord: "", ...entry.block },
                    settled: true,
                  }}
                  height={96}
                />
                {plainName(entry.name)}
              </UnstyledButton>
            ))}
          </div>
        </>
      ) : null}

      {showTargets ? <SectionTitle>Target</SectionTitle> : null}
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

      {imports.length > 0 ? (
        <>
          <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
            Your Imports
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {imports.map((asset) => {
              const isVideo = asset.kind === "video";
              return (
                <UnstyledButton
                  className="grid min-w-0 justify-items-center gap-2 rounded-md border border-solid border-editor-border bg-editor-panel-raised px-2 py-3 text-center text-[10px] [overflow-wrap:anywhere]"
                  key={asset.id}
                  aria-label={
                    isVideo
                      ? "Screen recording — inserted in a browser frame"
                      : asset.label
                  }
                  onClick={() => {
                    if (isVideo) {
                      assign({
                        type: "recording",
                        src: asset.src,
                        frame: "browser",
                        fit: "cover",
                        playbackRate: 1,
                      });
                      return;
                    }
                    // store the picture's real size, so scale 1 = its own px
                    readImageSize(asset.src)
                      .then((size) =>
                        assign({ type: "image", src: asset.src, ...size }),
                      )
                      .catch(() => assign({ type: "image", src: asset.src }));
                  }}
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

      {logoCategories.map((category) => {
        const logos = logoList.filter(
          (logo) =>
            logo.category === category.id && matches(query, logo.name, logo.id),
        );
        if (logos.length === 0) return null;
        return (
          <Fragment key={category.id}>
            <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
              Logos · {category.label}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {logos.map((logo) => (
                <UnstyledButton
                  className="grid min-w-0 justify-items-center gap-2 rounded-md border border-solid border-editor-border bg-editor-panel-raised px-2 py-3 text-center text-[10px] [overflow-wrap:anywhere]"
                  key={logo.id}
                  onClick={() => assign({ type: "logo", logo: logo.id })}
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="w-7 h-7 object-contain"
                  />
                  {logo.name}
                </UnstyledButton>
              ))}
            </div>
          </Fragment>
        );
      })}

      {props.length ? <SectionTitle>Props</SectionTitle> : null}
      <div className="grid grid-cols-3 gap-1.5">
        {props.map((prop) => (
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

      {presets.length ? (
        <details className="mt-3" open={Boolean(query)}>
          <summary className="cursor-pointer text-[11px] uppercase tracking-[1px] text-editor-muted">
            More · older presets ({presets.length})
          </summary>
          {visualTemplateCategories.map((category) => {
            const inCategory = presets.filter(
              (preset) => preset.category === category.id,
            );
            if (inCategory.length === 0) return null;
            return (
              <Fragment key={category.id}>
                <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
                  {category.label}
                </div>
                <div className="flex flex-col gap-1.5">
                  {inCategory.map((preset) => (
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
        </details>
      ) : null}

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
