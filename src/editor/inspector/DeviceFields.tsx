import { TextInput } from "@mantine/core";
import type { ReactNode } from "react";
import { type VisualConfig } from "../../schema/visual";
type Props = {
  visual: VisualConfig;
  onChange: (visual: VisualConfig) => void;
  children: ReactNode;
};
export function DeviceFields({ visual, onChange, children }: Props) {
  if (visual.type === "browser") {
    return (
      <div className="flex flex-col gap-2">
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
        {children}
      </div>
    );
  }
  if (visual.type === "phone") {
    return <>{children}</>;
  }
  return null;
}
