import type { CodeSceneModule } from "./types";

// The values a code scene is drawn with: the project's values checked by the
// module's schema, which fills in the defaults. A value that no longer fits
// (the agent rewrote the scene, a field changed type) falls back to the
// default instead of breaking the picture.
export function sceneParams(
  module: Pick<CodeSceneModule, "schema">,
  params: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const schema = module.schema;
  if (!schema) return params ?? {};
  const given = params ?? {};
  const whole = schema.safeParse(given);
  if (whole.success) return whole.data;
  // field by field: the ones that fit stay, the others take their default
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema.shape)) {
    const own = field.safeParse(given[key]);
    if (own.success) out[key] = own.data;
    else {
      const fallback = field.safeParse(undefined);
      if (fallback.success) out[key] = fallback.data;
    }
  }
  return out;
}
