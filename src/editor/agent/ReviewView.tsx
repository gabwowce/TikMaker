import type { ReviewInMessage } from "../../agent/run/7-chat";

// The review of the frames as a list instead of a wall of text: the scenes to
// fix first (each with what is wrong and what the agent changes), the good
// scenes as one row of numbers, and the notes – taste, left as they are –
// folded away. The message's text says the same in words; this is how the
// panel shows it.

const NEXT: Record<ReviewInMessage["next"], string> = {
  fixing: "Fixing these now, then looking again…",
  stopped: "The last round did not make it better, so the agent stopped – tell it what to change.",
  last: "That was the last round – tell the agent what to change.",
  proposed: "The fixes below wait for your Do it.",
  done: "Every scene reads well.",
};

const CHANGE: Record<string, string> = {
  pictures: "new pictures",
  words: "shorter words + voice",
  motion: "placement / motion",
};

export function ReviewView({ review }: { review: ReviewInMessage }) {
  const fix = review.scenes.filter((scene) => scene.verdict === "fix");
  const good = review.scenes.filter((scene) => scene.verdict === "good");
  const notes = good.filter((scene) => scene.problems.length);
  return (
    <div className="flex flex-col gap-2">
      <span className="font-semibold">
        {review.round ? `Self-review · round ${review.round}` : "Frames reviewed"}
        <span className="font-normal text-editor-muted">
          {" "}
          · {fix.length ? `${fix.length} to fix` : "nothing to fix"}
        </span>
      </span>
      {fix.map((scene) => (
        <div
          key={scene.sceneIndex}
          className="flex flex-col gap-0.5 rounded-lg border border-solid border-editor-border px-2 py-1.5"
        >
          <span className="flex items-center gap-2">
            <span className="text-red-400">✗</span>
            <span className="font-semibold">Scene {scene.sceneIndex + 1}</span>
            {scene.change ? (
              <span className="ml-auto text-[11px] text-editor-accent">
                → {CHANGE[scene.change.kind] ?? scene.change.kind}
              </span>
            ) : null}
          </span>
          <ul className="m-0 flex flex-col gap-0.5 pl-5 text-editor-muted">
            {scene.problems.map((problem, i) => (
              <li key={i}>{problem}</li>
            ))}
          </ul>
        </div>
      ))}
      {good.length ? (
        <span className="text-editor-muted">
          <span className="text-green-400">✓</span> Good:{" "}
          {good.map((scene) => scene.sceneIndex + 1).join(" · ")}
        </span>
      ) : null}
      {notes.length ? (
        <details className="text-editor-muted">
          <summary className="cursor-pointer">
            {notes.length} note(s) – left as they are
          </summary>
          <ul className="m-0 mt-1 flex flex-col gap-1 pl-4">
            {notes.map((scene) => (
              <li key={scene.sceneIndex}>
                <span className="text-editor-text">
                  Scene {scene.sceneIndex + 1}:
                </span>{" "}
                {scene.problems.join(" ")}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <span className="text-[11px] text-editor-muted">{NEXT[review.next]}</span>
    </div>
  );
}
