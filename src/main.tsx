import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRoot } from "react-dom/client";
import { queryClient } from "./api/queryClient";
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
      <QueryClientProvider client={queryClient}>
        <Editor />
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

void main();
