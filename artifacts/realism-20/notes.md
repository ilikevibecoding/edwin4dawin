# Realism pass 20 — global grade + ship checks

- Full-frame light grade over the arena render: warm key tint from the upper
  left falling to a cool shade lower right, laid over every sprite after the
  scene draws so towers, troops, effects and ground share one light.
- Rebuilt `dist/arena-rumble.html` (197 KB) with all 20 passes inlined.
- Verification: `tools/e2e.js` green (full loop, zero console errors) and
  `tools/check-single.js` green (file:// run, font, chest, battle, result).
- README updated: final screenshots now point at this pass, and the 20-pass
  realism phase is documented alongside the original 15-iteration loop.
