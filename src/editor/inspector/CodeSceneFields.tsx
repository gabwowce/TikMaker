import {
  Button,
  Fieldset,
  NativeSelect,
  NumberInput,
  Switch,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { getLogo } from "../../registries/logoRegistry";
import { getProp } from "../../registries/propRegistry";
import type { Scene } from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";
import { spokenWords } from "../../utils/voWords";
import { describeFields, type FieldInfo } from "../../video/brand/fields";
import { loadCodeScene } from "../../video/code/loadCodeScene";
import { sceneParams } from "../../video/code/params";
import type { CodeSceneModule } from "../../video/code/types";
import { useAgentRun, useUndoScene } from "../../api/agent";
import { useSaveVisual } from "../../api/visuals";
import { forgetCodeScene } from "../../video/code/loadCodeScene";
import { useProjectStore } from "../state/projectStore";
import { AssetSelect } from "./AssetSelect";

// The fields a code scene lets the creator change without touching its code
// (the file's `schema`, src/video/brand/fields.ts): texts, numbers, the word
// something happens on, and the photos and recordings it asks for – picked
// or imported with the same AssetSelect as any other picture.
export function CodeSceneFields({ scene }: { scene: Scene }) {
  const file = scene.code?.file;
  const module = useCodeModule(file);
  const updateScene = useProjectStore((s) => s.updateScene);
  if (!file) return null;
  if (!module) return <Note>Loading {file}…</Note>;
  if (module instanceof Error) return <Note>{module.message}</Note>;
  const fields = describeFields(module.schema);
  const values = sceneParams(module, scene.code?.params);
  const set = (key: string, value: unknown) =>
    updateScene(scene.id, {
      code: { file, params: { ...scene.code?.params, [key]: value } },
    });
  return (
    <Fieldset legend="Picture (code)">
      {module.description ? (
        <div className="text-[12px] text-editor-muted mb-2">
          {module.description}
        </div>
      ) : null}
      <div className="text-[11px] text-editor-muted mb-3 break-all">
        src/generated/{file}
      </div>
      <CodeVersions scene={scene} file={file} />
      {fields.length ? (
        <div className="flex flex-col gap-3">
          {fields.map((info) => (
            <FieldInput
              key={info.key}
              info={info}
              value={values[info.key]}
              words={spokenWords(scene.vo ?? "")}
              onChange={(value) => set(info.key, value)}
            />
          ))}
        </div>
      ) : (
        <Note>
          This scene lists no editable fields – ask the agent in the chat to
          change it.
        </Note>
      )}
      <SaveAsVisual scene={scene} description={module.description} />
    </Fieldset>
  );
}

function FieldInput({
  info,
  value,
  words,
  onChange,
}: {
  info: FieldInfo;
  value: unknown;
  words: string[];
  onChange: (value: unknown) => void;
}) {
  switch (info.kind) {
    case "number":
      return (
        <NumberInput
          label={info.label}
          value={typeof value === "number" ? value : 0}
          min={info.min}
          max={info.max}
          onChange={(v) => onChange(typeof v === "number" ? v : Number(v) || 0)}
        />
      );
    case "toggle":
      return (
        <Switch
          label={info.label}
          checked={value === true}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
      );
    case "choice":
      return (
        <NativeSelect
          label={info.label}
          value={String(value ?? "")}
          data={info.options ?? []}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "word": {
      const options = [...new Set([String(value ?? ""), ...words])].filter(Boolean);
      return (
        <NativeSelect
          label={info.label}
          value={String(value ?? "")}
          data={options}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    case "photo":
    case "recording":
      return (
        <div>
          <div className="text-[13px] font-medium mb-1">
            {info.kind === "photo" ? "▣ " : "● "}
            {info.label}
          </div>
          {info.hint ? (
            <div className="text-[11px] text-editor-muted mb-1.5">
              {info.kind === "photo" ? "Find: " : "Record: "}
              {info.hint}
            </div>
          ) : null}
          <AssetSelect
            allowNone
            value={slotVisual(info.kind, String(value ?? ""))}
            onChange={(visual) => onChange(visualSrc(visual))}
          />
        </div>
      );
    default:
      return info.long || String(value ?? "").length > 40 ? (
        <Textarea
          label={info.label}
          autosize
          minRows={2}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <TextInput
          label={info.label}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

// A slot's file as the picture AssetSelect shows, and back.
function slotVisual(kind: string, src: string): VisualConfig | undefined {
  if (!src) return undefined;
  return kind === "recording"
    ? { type: "recording", src, frame: "browser", fit: "cover", playbackRate: 1 }
    : { type: "image", src };
}
export function visualSrc(visual: VisualConfig | undefined): string {
  if (!visual) return "";
  if ("src" in visual && typeof visual.src === "string") return visual.src;
  if (visual.type === "prop") return getProp(visual.asset)?.src ?? "";
  if (visual.type === "logo") return getLogo(visual.logo)?.src ?? "";
  return "";
}

// "Save as my visual": the scene's code, a frame of it and what it shows go
// into the channel's visuals (Visuals tab); the agent sees them next time.
function SaveAsVisual({ scene, description }: { scene: Scene; description?: string }) {
  const project = useProjectStore((s) => s.project);
  const save = useSaveVisual();
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <div className="mt-3 flex items-center gap-2">
        <Button size="compact-xs" variant="default" onClick={() => setOpen(true)}>
          ☆ Save as my visual
        </Button>
        {save.isSuccess ? (
          <span className="text-[11px] text-green-400">
            Saved – see Visuals › My visuals
          </span>
        ) : null}
      </div>
    );
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      <TextInput
        size="xs"
        label="Name of the visual"
        placeholder="e.g. Fuel gauge draining"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
      />
      <div className="flex gap-1.5">
        <Button
          size="compact-xs"
          disabled={title.trim().length < 2}
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              {
                workspaceId: project.workspaceId ?? "dev",
                project,
                sceneId: scene.id,
                title: title.trim(),
                ...(description ? { description } : {}),
              },
              {
                onSuccess: () => {
                  setOpen(false);
                  setTitle("");
                },
              },
            )
          }
        >
          Save
        </Button>
        <Button size="compact-xs" variant="subtle" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {save.error ? (
        <span className="text-[11px] text-[#ff8a65]">{save.error.message}</span>
      ) : null}
      <span className="text-[11px] text-editor-muted">
        The code, a frame and its description are kept for the channel; the
        agent can use it in later videos.
      </span>
    </div>
  );
}

// The scene's version and Undo: the agent keeps every earlier version of
// the code it rewrote (a message, the review); Undo puts the one before back.
// Only for a scene of the agent's run ("scene-<run>-<n>").
function CodeVersions({ scene, file }: { scene: Scene; file: string }) {
  const match = /^scene-(.+)-(\d+)$/.exec(scene.id);
  const runId = match?.[1];
  const n = match ? Number(match[2]) - 1 : -1;
  const { data: run } = useAgentRun(runId);
  const undo = useUndoScene();
  const applyScene = useProjectStore((s) => s.applyAgentSceneEdit);
  const code = run?.code?.scenes[n];
  if (!run || !code) return null;
  const back = (code.history ?? []).filter((h) => h.version < code.version).pop();
  return (
    <div className="flex flex-col items-start gap-1.5 mb-3 text-[12px]">
      <span className="text-editor-muted">
        Version {code.version}
        {code.history?.length
          ? ` · changed: ${code.history[code.history.length - 1].changedBy ?? "by the agent"}`
          : ""}
      </span>
      {back ? (
        <Button
          size="compact-xs"
          variant="default"
          loading={undo.isPending}
          onClick={() =>
            undo.mutate(
              { runId: run.id, sceneIndex: n },
              {
                onSuccess: (next) => {
                  forgetCodeScene(file);
                  applyScene(next, n);
                },
              },
            )
          }
        >
          Undo → v{back.version}
        </Button>
      ) : null}
      {undo.error ? (
        <span className="text-[#ff8a65]">{undo.error.message}</span>
      ) : null}
    </div>
  );
}

function useCodeModule(file: string | undefined) {
  const [module, setModule] = useState<CodeSceneModule | Error>();
  useEffect(() => {
    setModule(undefined);
    if (!file) return;
    let live = true;
    void loadCodeScene(file).then((result) => live && setModule(result));
    return () => {
      live = false;
    };
  }, [file]);
  return module;
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] text-editor-muted">{children}</div>;
}
