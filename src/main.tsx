import React from "react";
import ReactDOM from "react-dom/client";
import { migrateLegacyStorage } from "./editor/state/migrateLegacyStorage";
import { primeDiskCache } from "./editor/state/fileLibrary";
import { primeSfxRegistry } from "./registries/sfxRegistry";

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
  await primeSfxRegistry();
  const { Editor } = await import("./editor/Editor");
  // A media editor must mount its Player once. React StrictMode intentionally
  // mounts effects twice in development; a media element may survive between
  // those mounts and remain audible as a duplicate preview voice.
  ReactDOM.createRoot(document.getElementById("root")!).render(<Editor />);
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
