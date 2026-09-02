import React from "react";
import ReactDOM from "react-dom/client";
import { migrateLegacyStorage } from "./editor/state/migrateLegacyStorage";
import { primeDiskCache } from "./editor/state/fileLibrary";

/**
 * Two things have to finish before the editor is imported, and both for the
 * same reason: every store reads its collection at module-evaluation time, so
 * anything that changes what is ON DISK has to happen before that import.
 *
 * 1. `migrateLegacyStorage` copies anything still in the old localStorage out
 *    to files, once.
 * 2. `primeDiskCache` asks the dev server what is actually on disk now, instead
 *    of trusting the build-time `import.meta.glob` snapshot.
 */
async function start() {
  const { Editor } = await import("./editor/Editor");
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Editor />
    </React.StrictMode>
  );
}

migrateLegacyStorage()
  .then(async (migrated) => {
    if (migrated) {
      window.location.reload();
      return;
    }
    await primeDiskCache();
    await start();
  })
  .catch(async () => {
    // A failed migration must not cost you the editor — the libraries are on
    // disk either way.
    await primeDiskCache().catch(() => undefined);
    await start();
  });
