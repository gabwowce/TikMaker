import { NativeSelect } from "@mantine/core";
import { getSfx, sfxList, type SfxGroup } from "../../registries/sfxRegistry";

const sfxGroupOrder: SfxGroup[] = [
  "voice",
  "impact",
  "reveal",
  "transition",
  "text",
  "ui",
  "success",
  "misc",
];

const sfxByGroupSorted: [SfxGroup, typeof sfxList][] = sfxGroupOrder
  .map(
    (group) =>
      [group, sfxList.filter((s) => s.group === group)] as [
        SfxGroup,
        typeof sfxList,
      ],
  )
  .filter(([, list]) => list.length > 0);

type SfxSelectProps = {
  value: string | undefined;
  mode: "auto" | "explicit";
  autoResolvesTo?: string;
  onChange: (v: string | undefined) => void;
};

export function SfxSelect({
  value,
  mode,
  autoResolvesTo,
  onChange,
}: SfxSelectProps) {
  return (
    <NativeSelect
      className="w-full"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {mode === "auto" ? (
        <option value="">
          {autoResolvesTo
            ? `Auto · ${getSfx(autoResolvesTo)?.label ?? autoResolvesTo}`
            : "Auto (default)"}
        </option>
      ) : null}
      <option value="none">No sound</option>
      {sfxByGroupSorted.map(([group, list]) => (
        <optgroup key={group} label={group}>
          {list.map((sfx) => (
            <option key={sfx.id} value={sfx.id}>
              {sfx.label}
            </option>
          ))}
        </optgroup>
      ))}
    </NativeSelect>
  );
}
