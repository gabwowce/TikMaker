import { Loader } from "@mantine/core";
import type { AgentRun } from "../../agent/run/run";
import { FoldCard } from "./FoldCard";

// 4 Building in the conversation: one line while Claude Code writes the
// pictures as code (it takes minutes), then what every scene shows – folded –
// with what the checks still found and what the kit lacked.
export function BuildCard({ run }: { run: AgentRun }) {
  const working = run.status === "laying_out";
  const code = run.code;
  if (!code)
    return working ? (
      <Working>
        Writing the pictures as code… (Claude Code with the skills – about a
        minute or two per scene)
      </Working>
    ) : null;
  const failed = code.scenes.filter((scene) => scene.error).length;
  return (
    <FoldCard
      title={`Pictures written as code · ${code.scenes.length} scenes`}
      summary={
        [
          failed ? `${failed} fell back to a plain scene` : "",
          code.wishes.length ? `${code.wishes.length} wishes` : "",
        ]
          .filter(Boolean)
          .join(" · ") || undefined
      }
    >
      <ol className="m-0 flex flex-col gap-1.5 pl-4 text-xs">
        {code.scenes.map((scene, n) => (
          <li key={n}>
            {scene.description || "–"}
            <span className="text-editor-muted">
              {" "}
              · {scene.file.split("/").pop()}
              {scene.version > 1 ? ` · v${scene.version}` : ""}
            </span>
            {scene.error ? (
              <div className="text-amber-300">The code failed: {scene.error.split("\n")[0]}</div>
            ) : null}
          </li>
        ))}
      </ol>
      {code.problems.length ? (
        <ul className="m-0 flex flex-col gap-1 pl-4 text-xs text-amber-300">
          {code.problems.map((problem, i) => (
            <li key={i}>{problem}</li>
          ))}
        </ul>
      ) : null}
      {code.wishes.length ? (
        <div className="text-xs text-editor-muted">
          Wanted but missing: {code.wishes.join(", ")}
        </div>
      ) : null}
      {working ? <Working>Writing the pictures again…</Working> : null}
    </FoldCard>
  );
}

function Working({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs">
      <Loader size={12} />
      {children}
    </div>
  );
}
