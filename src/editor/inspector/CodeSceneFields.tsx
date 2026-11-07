import {
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
