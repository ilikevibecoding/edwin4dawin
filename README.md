# Abyssal Surveyor

First-person walkthrough of an original medium deep-sea expedition submarine. Built with Vite, Three.js, and Playwright. All geometry, materials, labels, and underwater scenery are procedural — no downloaded assets.

```bash
npm install
npx playwright install chromium
npm run dev
```

Click the canvas to lock the pointer. WASD to walk from the forward control room to the aft machinery space. Press E to interact.

```bash
npm run shots
```

Writes deterministic 1600×900 screenshots to `shots/iter_N/`.
