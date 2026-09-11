import React from "react";
import { useProjectStore } from "./state/projectStore";

/**
 * The props a range input needs so one drag (or one held arrow key) becomes ONE
 * undo step.
 *
 * Every slider in the editor was wiring this by hand as
 * `onPointerDown={begin} onKeyDown={begin} onKeyUp={end}`, and the keyboard half
 * was wrong in a way that used to be catastrophic: `onKeyDown` fires for EVERY
 * key, Tab included, and Tab moves focus before the `keyup` — so the transaction
 * opened and was never closed. While autosave was gated on that same flag (it no
 * longer is; see `projectStore`), one Tab silently stopped saving for the rest of
 * the session.
 *
 * So only the keys that actually move a slider open a transaction, and `blur`
 * closes one no matter how focus left.
 */
const VALUE_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

export function useHistoryGesture() {
  const begin = useProjectStore((state) => state.beginHistoryTransaction);
  const end = useProjectStore((state) => state.endHistoryTransaction);

  // Closing on unmount matters for the panels that swap their contents while a
  // pointer is still down — selecting another scene, switching Inspector tab.
  // The element that would have received the pointer-up is gone by then.
  React.useEffect(() => end, [end]);

  return {
    onPointerDown: begin,
    onPointerUp: end,
    onPointerCancel: end,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (VALUE_KEYS.has(event.key)) begin();
    },
    onKeyUp: (event: React.KeyboardEvent) => {
      if (VALUE_KEYS.has(event.key)) end();
    },
    onBlur: end,
  };
}
