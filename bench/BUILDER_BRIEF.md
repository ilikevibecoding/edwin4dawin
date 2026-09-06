# Builder brief — shared conventions (wave 7, master directive)

You are one specialist builder in a parallel team working on a Three.js/WebGL2/TypeScript open-world
floatplane game (an original Vice-City-inspired coastal metropolis: the "crop duster" in the user's words is
our DHC-2-style amphibious floatplane; its floats/wheels are the "landing gear" the user says is already
strong — do not rebuild them). The lead merges branches.

## Persistence — read this first
The VM can be rebuilt without warning; everything outside git on `origin` is lost (worktrees, `/tmp`, home).
Therefore:
- **Push your branch after every commit**: `git push -u origin <branch>` (feature branches only, never the
  lead branch `cursor/vice-city-aerial-8213`, never force).
- Keep your defect log and report **inside your worktree** under `bench/reports/<you>/` (`DEFECTS.md`,
  `REPORT.md`, small crops) and commit them with the code; anything that only lives in `/tmp` is not evidence.
- Copy the 4–8 most telling before/after crops (JPEG, ≤ 400 KB each) to `/opt/cursor/artifacts/` with your
  prefix; that directory persists and is shown to the user.
- If your environment looks freshly rebuilt (no `node_modules`), run `npm ci` and `pip3 install pillow numpy`.

## Environment
- Your worktree and branch are named in your task. Work only there. `npx tsc --noEmit` must be clean.
- Build: `npx vite build --outDir /tmp/<you>-dist --logLevel error`; serve: `npx vite preview --outDir /tmp/<you>-dist --port <PORT> --strictPort` in a tmux session (`tmux -f /exec-daemon/tmux.portal.conf new-session -d -s <you>-preview ...`). Pick a port in the range given in your task; check `ss -ltn` first.
- Chrome launches are gated machine-wide to 3 concurrent instances by the `/usr/local/bin/google-chrome` wrapper (slot locks `/tmp/chrome-slot-N.lock`): a `shot.mjs`/`capture.mjs`/`flighttest.mjs` that seems stuck at startup is waiting for a slot; close pages/browsers you no longer need (`browser.close()`), never leave a puppeteer session open while thinking.
- Captures: `flock /tmp/bench.lock node bench/scripts/capture.mjs --tag <you>-rN --views a,b,c --url http://127.0.0.1:<PORT>/ [--no-clip] [--no-flight]`. The machine has 4 cores shared by ~10 builders: always use the flock, capture only the views you need, prefer `--no-clip` unless motion is the subject. A still takes 1–2 min under load. Views are defined in `src/bench/views.ts` (`?bench=<id>`); do not edit it for ad-hoc cameras: use the `dev` view, `?bench=dev&cam=x,y,z&hdg=<deg>&pch=<deg>&fov=50&time=<h>&weather=clear&plane=x,y,z,hdg,pitch,bank,speed,throttle` (omit `cam` and add `mode=chase|cockpit` for aircraft-relative cameras; see `devView` in `views.ts`), either with `bench/scripts/shot.mjs "<url>&freeze=1&seed=20260904" out.png 1280 720` (quick, ~30–90 s) or with capture: `--views 'label@dev&cam=...;other@dev&...'` (`;`-separated when any entry has an `@`).
- Flight harness (whenever `src/plane/physics.ts`, `aircraft.ts`, `camera.ts`, `waves.ts` or `main.ts` change): `node bench/scripts/flighttest.mjs http://127.0.0.1:<PORT>/ /tmp/<you>/flight.json` must end with `allPass: true`; do not loosen tolerances, fix the model.
- Budgets per bench view: <= 400 draw calls, <= 1.5 M triangles (`metrics.json` from capture), empty `console.txt`. Measure shader cost with interleaved A/B on two preview ports when you change shaders (report a ratio, not single timings).
- Debug flags: `?dbg=nocity,noveg,nobridges,notraffic,nocloudshadow`; `?quality=low|medium|high`; `?freeze=1`; `?seed=`.

## Method (the gauntlet)
OBSERVE → CRITIQUE → DIAGNOSE → IMPLEMENT → STRESS TEST → COMPARE → SCORE → REJECT OR ADVANCE. Never
"one change, declare success". Run at least 10 full rounds on your subsystem; continue while defects are still
findable. Keep a concise defect log per round (`bench/reports/<you>/DEFECTS.md`): what was visibly wrong, what
changed, why that reduces the defect, what remains, perf before/after.

Read `bench/rubric.json` (v2, 30 categories, hero targets 9.25, ordinary 8.0) and `bench/CRITIC_PROTOCOL.md`
(anti-cheating rule, self-play review questions, test matrices) before starting. Score yourself honestly per
round on your categories; a score rises only when a named defect is reduced — never from brighter light, more
saturation/bloom/particles/polygons/texture resolution, scattering objects, shake or blur.

Preserve what already works (record it first): the colour palette, the water coloration, the foliage wind
motion, the floats and wheels, other aircraft in the sky, boats, cars near the water, the highway layout, the
volumetric cloud direction. Improve only observed deficiencies. Compare before/after for regressions in
every bench view your files affect.

## Evidence and hand-off
- Before/after crops at the same camera, same time, same seed, labelled with view + grid cells (8×8 A–H/1–8).
- Final report (`bench/reports/<you>/REPORT.md`, committed, and repeated in your final message): what was
  visibly wrong; what changed (concrete); why it improves realism; what remains weak (criticise your own work);
  performance before/after; rubric categories genuinely affected with your self-scores; the highest-value next
  attack; failed/reverted candidates; every shared-file hunk (file + function) so the lead can merge.
- Commit in logical steps with descriptive messages and push after each. Do not edit files owned by other
  builders (listed in your task). If you must touch a shared file, keep the hunk minimal and list it.
