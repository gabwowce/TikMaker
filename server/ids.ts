import { slugify } from "./db.js";

// The one way an id is made: "my-logo-mtq3k1z0" (slug + time in base 36).
// Never the same twice in one server, even for two ids asked for in the
// same millisecond (two runs started at once once got one id and shared a
// file). Runs, messages, uploads and renders all take theirs from here.
let lastStamp = 0;
export function newId(label: string): string {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return `${slugify(label)}-${lastStamp.toString(36)}`;
}
