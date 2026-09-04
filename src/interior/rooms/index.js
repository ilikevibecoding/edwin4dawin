// Room builder registry. Each room of layout.js names a builder here. Dedicated builders live in
// their own files (one workstream per file); anything not yet implemented falls back to a placeholder
// shell so the whole ship stays walkable.
import { makePlaceholder } from "./placeholder.js";

const dedicated = {};

// Attempt to register dedicated builders. Each module exports `build<Name>` (see the per-room files).
const modules = import.meta.glob("./*.js", { eager: true });
for (const [path, mod] of Object.entries(modules)) {
  if (path.endsWith("/index.js") || path.endsWith("/placeholder.js")) continue;
  for (const [key, fn] of Object.entries(mod)) {
    if (typeof fn === "function" && key.startsWith("build")) {
      const name = key.slice(5);
      dedicated[name.charAt(0).toLowerCase() + name.slice(1)] = fn;
    }
  }
}

export function getBuilder(name) {
  return dedicated[name] || makePlaceholder(name);
}

export function hasDedicatedBuilder(name) {
  return !!dedicated[name];
}

export function listBuilders() {
  return Object.keys(dedicated);
}
