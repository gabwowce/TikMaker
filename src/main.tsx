import { MantineProvider } from "@mantine/core";
import { createRoot } from "react-dom/client";
import { mantineTheme } from "./editor/mantineTheme";
import { primeDiskCache } from "./editor/state/fileLibrary";
import { migrateLegacyStorage } from "./editor/state/migrateLegacyStorage";
import "./editor/styles.css";
import { primeSfxRegistry } from "./registries/sfxRegistry";

async function main() {
  const migrated = await migrateLegacyStorage().catch(() => false);
  if (migrated) {
    window.location.reload();
    return;
  }

  await primeDiskCache().catch(() => undefined);
  await primeSfxRegistry();
  const { initializeProjectStore } =
    await import("./editor/state/projectStore");
  initializeProjectStore();
  const { Editor } = await import("./editor/Editor");

  createRoot(document.getElementById("root")!).render(
    <MantineProvider theme={mantineTheme} forceColorScheme="dark">
      <Editor />
    </MantineProvider>,
  );
}

void main();
