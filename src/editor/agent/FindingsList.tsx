import type { BlocksProblem } from "../../agent/run/4-blocks";

// What the code found in the agent's pictures, in two groups: problems
// (something is broken and the agent could not fix it) in amber, and notes
// (advice on taste – pace, variety, rhythm – which the agent was free to
// weigh) muted. Used by every card that shows the blocks' findings.
export function FindingsList({ findings }: { findings: BlocksProblem[] }) {
  const problems = findings.filter((finding) => !finding.advice);
  const notes = findings.filter((finding) => finding.advice);
  return (
    <>
      {problems.length ? (
        <ul className="m-0 flex flex-col gap-1 pl-4 text-xs text-amber-300">
          {problems.map((problem, index) => (
            <li key={index}>{problem.message}</li>
          ))}
        </ul>
      ) : null}
      {notes.length ? (
        // folded: notes are taste the agent already weighed – there when you
        // want them, not a wall of text every time the card opens
        <details className="text-xs text-editor-muted">
          <summary className="cursor-pointer">
            {notes.length} note(s) – taste, the agent weighed them
          </summary>
          <ul className="m-0 mt-1 flex flex-col gap-1 pl-4">
            {notes.map((note, index) => (
              <li key={index}>{note.message}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}

// "2 problems · 3 notes" for a folded card ("" when there is nothing).
export function findingsSummary(findings: BlocksProblem[]): string {
  const notes = findings.filter((finding) => finding.advice).length;
  const problems = findings.length - notes;
  return [problems ? `${problems} problems` : "", notes ? `${notes} notes` : ""]
    .filter(Boolean)
    .join(" · ");
}
