import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRoot } from "react-dom/client";
import { loadCustomSfx } from "./api/library";
import { queryClient } from "./api/queryClient";
import { trpc } from "./api/trpc";
import { AutoSave } from "./editor/AutoSave";
import { mantineTheme } from "./editor/mantineTheme";
import "./editor/styles.css";

async function main() {
  // Before the first paint: the project list (so the right project opens)
  // and every uploaded sound (so the preview can play them).
  const projects = await queryClient.fetchQuery(trpc.projects.list.queryOptions());
  await loadCustomSfx();
  const { initializeProjectStore } =
    await import("./editor/state/projectStore");
  initializeProjectStore(projects);
  const { Editor } = await import("./editor/Editor");

  createRoot(document.getElementById("root")!).render(
    <MantineProvider theme={mantineTheme} forceColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <Editor />
        <AutoSave />
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

void main();
