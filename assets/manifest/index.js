// Merged asset manifest. Domain files are owned per agent (see
// docs/ownership-ledger.md); this index is lead-owned.

import { ARCHITECTURE_ASSETS } from './architecture.js';
import { PROP_ASSETS } from './props-core.js';
import { PROP_FACILITIES_ASSETS } from './props-facilities.js';
import { CHARACTER_ASSETS } from './characters.js';
import { UI_ASSETS } from './ui.js';
import { AUDIO_ASSETS } from './audio.js';

export const MANIFEST = [
  ...ARCHITECTURE_ASSETS,
  ...PROP_ASSETS,
  ...PROP_FACILITIES_ASSETS,
  ...CHARACTER_ASSETS,
  ...UI_ASSETS,
  ...AUDIO_ASSETS,
];

export function manifestById(id) { return MANIFEST.find((a) => a.id === id); }

export function validateManifest() {
  const problems = [];
  const seen = new Set();
  for (const a of MANIFEST) {
    if (!a.id || seen.has(a.id)) problems.push(`duplicate/missing id: ${a.id}`);
    seen.add(a.id);
    for (const k of ['name', 'category', 'owner', 'files', 'status']) {
      if (!a[k]) problems.push(`${a.id}: missing ${k}`);
    }
  }
  return problems;
}
