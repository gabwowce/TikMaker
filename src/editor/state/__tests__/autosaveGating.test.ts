import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The regression this whole branch exists for.
 *
 * `beginHistoryTransaction` groups a drag into one undo step. It also used to
 * gate the autosave subscription, and those two facts together made a missing
 * `endHistoryTransaction` catastrophic: one unmatched `begin` — pressing Tab on
 * a slider, a panel unmounting mid-drag — stopped every write to disk for the
 * rest of the session, while the save badge went on reading "saved".
 *
 * The fix is that durability does not consult undo state at all. This test
 * fails if anything ever puts that guard back.
 */

const saved: { kind: string; id: string }[] = [];

vi.mock("../fileLibrary", () => ({
  readDisk: () => [],
  scheduleSave: (kind: string, data: { id: string }) => {
    saved.push({ kind, id: data.id });
  },
  saveNow: async () => undefined,
  deleteEntry: async () => undefined,
  usePreferences: { getState: () => ({ set: () => undefined, lastOpenedProjectId: undefined }) },
  useSaveStatus: { getState: () => ({ state: "idle" }), setState: () => undefined },
  useLoadFailures: { setState: () => undefined },
}));

/**
 * The store registers its autosave subscription behind `typeof window !==
 * "undefined"`, so under the node environment it would simply never run and
 * this test would pass for the wrong reason. The few members it touches are
 * cheaper to stub than a whole DOM is to install.
 */
function stubBrowserGlobals() {
  const store = new Map<string, string>();
  Object.assign(globalThis, {
    window: {
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
    },
  });
}

async function freshStore() {
  vi.resetModules();
  stubBrowserGlobals();
  saved.length = 0;
  const { useProjectStore } = await import("../projectStore");
  return useProjectStore;
}

describe("autosave is never gated on undo state", () => {
  beforeEach(() => {
    saved.length = 0;
  });

  it("writes an edit made while a history transaction is open", async () => {
    const store = await freshStore();
    store.getState().createProject("Testas");
    const sceneId = store.getState().project.scenes[0]?.id;
    saved.length = 0;

    store.getState().beginHistoryTransaction();
    store.getState().updateProjectTitle("Pakeistas per vilkimą");

    expect(saved.map((entry) => entry.kind)).toContain("project");
    expect(store.getState().project.title).toBe("Pakeistas per vilkimą");
    expect(sceneId === undefined || typeof sceneId === "string").toBe(true);
  });

  it("keeps writing after a transaction that is never closed", async () => {
    const store = await freshStore();
    store.getState().createProject("Testas");

    // The unmatched `begin` — exactly what Tab on a slider used to produce.
    store.getState().beginHistoryTransaction();
    store.getState().updateProjectTitle("pirmas");
    saved.length = 0;

    store.getState().updateProjectTitle("antras");
    store.getState().updateProjectTitle("trečias");

    expect(saved).toHaveLength(2);
  });

  it("still collapses a transaction into a single undo step", async () => {
    const store = await freshStore();
    store.getState().createProject("Testas");

    store.getState().beginHistoryTransaction();
    store.getState().updateProjectTitle("a");
    store.getState().updateProjectTitle("ab");
    store.getState().updateProjectTitle("abc");
    store.getState().endHistoryTransaction();

    expect(store.getState().canUndo).toBe(true);
    store.getState().undo();
    expect(store.getState().project.title).toBe("Testas");
  });
});
