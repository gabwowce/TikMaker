import type { CodeSceneModule } from "./types";

// Loads a code scene's file (src/generated/<project>/scene-N.tsx). One
// dynamic import that both bundlers understand: Vite (the editor's Player)
// turns it into a glob of src/generated/*/*.tsx, webpack (the Remotion
// render, the agent's stills) into a context of the same folder – a file the
// agent has just written is in the next render's bundle.
export function importCodeScene(file: string): Promise<CodeSceneModule> {
  const match = /^([\w-]+)\/([\w.-]+)\.tsx$/.exec(file);
  if (!match) return Promise.reject(new Error(`Not a code scene file: ${file}`));
  const [, folder, name] = match;
  return import(`../../generated/${folder}/${name}.tsx`) as Promise<CodeSceneModule>;
}

// Modules already loaded, so a scene is not imported again on every frame.
const loaded = new Map<string, CodeSceneModule | Error>();
const loading = new Map<string, Promise<CodeSceneModule | Error>>();

export function loadedCodeScene(file: string): CodeSceneModule | Error | undefined {
  return loaded.get(file);
}

export function loadCodeScene(file: string): Promise<CodeSceneModule | Error> {
  const done = loaded.get(file);
  if (done) return Promise.resolve(done);
  let pending = loading.get(file);
  if (!pending) {
    pending = importCodeScene(file).then(
      (module) => {
        const result =
          typeof module.default === "function"
            ? module
            : new Error(`${file} has no default export (the scene's component)`);
        loaded.set(file, result);
        return result;
      },
      (error: unknown) => {
        const result = error instanceof Error ? error : new Error(String(error));
        loaded.set(file, result);
        return result;
      },
    );
    loading.set(file, pending);
  }
  return pending;
}

// Forget a file (it was rewritten): the next render imports it again.
export function forgetCodeScene(file: string): void {
  loaded.delete(file);
  loading.delete(file);
}
