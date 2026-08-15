# Abyssal Walker

A first-person walkthrough of an original medium deep-sea expedition submarine. The vessel is unbranded industrial construction: curved pressure hull, circular bulkheads, dense control stations, inhabited crew spaces, and a layered aft machinery room.

Everything is procedural. There are no downloaded models, textures, HDRIs, or audio files.

## Stack

- Vite
- Three.js (`WebGLRenderer`)
- Playwright for deterministic screenshots and interaction tests

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run shots
```

`SHOT_ITER=1 npm run shots` writes the full screenshot suite to `shots/iter_1/`.

## Controls

- Click to capture the pointer
- WASD to walk
- Mouse to look
- E to interact
- Esc to release the pointer

## Interactions

1. Sonar console — active ping
2. Crew bunk — rest cycle
3. Aft machinery panel — silent running
