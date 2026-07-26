# Originality Statement

**Northstar Rescue** is an original work. Every asset in this repository was
created from scratch for this project:

- **Code** — all engine, gameplay, AI, UI and tooling code is hand-written
  in this repository on top of the open-source libraries declared in
  `package.json` (three.js, MIT license; Vite and Playwright as dev tools).
- **Geometry** — every model (architecture, props, characters, weapons,
  vehicles) is constructed procedurally in code. No imported meshes.
- **Textures** — every texture is generated at runtime on canvas
  (`src/world/textures.js` and prop atlases). No image files are shipped or
  downloaded.
- **Audio** — every sound is synthesized at runtime with the WebAudio API
  (`src/audio/`). No recorded or sampled audio.
- **Names and branding** — Northstar Dynamics, GlacierPure, AEGIS, all
  department names and signage text, the fictional manufacturers Vektra
  Defense and Halcyon Ordnance with their weapons (P-11 Vireo, VX-7 Kestrel,
  HC-4 Ridgeline, B-12 Boreas, LR-8 Longwatch, Talon Field Knife, FL-2
  Dazzle, SG-3 Veil) and the characters (Dr. Elin Voss, Marcus Reid) are
  fictional and original.
- **Map** — the Northstar Administrative Center layout was designed for this
  game: its footprint, room adjacency, sightlines, spawn/objective placement
  and two-level structure are original and were validated in graybox before
  art production. It does not reproduce `cs_office` or any other existing
  map, room-for-room or otherwise.

No Counter-Strike or Valve source code, models, textures, sounds, sprays,
UI, branding, weapon skins or map sections were copied, traced, ripped,
converted or otherwise reused. The game draws only genre-level inspiration
(deliberate movement, hostage-rescue premise, tactical pacing) from the
tactical-FPS category as a whole.

— Opus 1, lead architect and integration owner
