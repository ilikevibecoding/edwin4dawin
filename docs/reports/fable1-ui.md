# Fable 1 report — visual bible + full UI/HUD elevation (Wave A)

Owner: Fable 1 (art director, visual bible & interface).
Files touched: `docs/visual-bible.md` (new), `src/ui/style.css`,
`src/ui/menus.js`, `src/ui/hud.js`, `src/ui/weaponIcons.js`,
`src/ui/briefingMap.js`, `assets/manifest/ui.js`, this report.
No other files were modified. No dependencies added. No git operations.

## 1. Visual bible (docs/visual-bible.md)

The reference document is live and opinionated: logline/mood ("cold ·
procedural · humane"), master world palette with per-zone usage rules and
the red-is-rationed law, the confirmed UI palette (ink/ice/amber/danger on
the deep-navy family — kept, it earns its place), a system-font typography
ladder, shape language (chamfered rectangles, hairline rules, corner
brackets, the star-north motif as the game's single emblem), icon grammar
(map glyphs: wedge = player, 4-point star = hostage, diamond = extraction),
material standards deferring to Fable 3's library, per-zone lighting targets
with post-tonemap mid-grey values, scale standards, combat readability
rules, one-line mood targets for every room on both floors, and a 10-point
asset review checklist. §13 is a quick card of UI-specific laws including
the test-locked contract.

## 2. What changed on screen

**Title** — original layered SVG backdrop (storm sky, moon haze, campus
silhouettes, the Northstar Administrative Center with lit windows and an
entrance glow, drifted snowfield) under a directional veil that keeps the
menu column dark and the scene visible; two CSS-gradient snow sheets drift
at parallax speeds; new star-north logomark beside the wordmark; version
footer row. `h1.game-title` still contains "NORTHSTAR".

**Difficulty** — per-difficulty SVG marks (chevron / star-north emblem /
watching eye), proportional stat bars for strength/clock/damage, contextual
subtitle, chamfered cards with a solid SELECTED tab. Card ids and
`.selected` behavior unchanged; cards are now keyboard-operable
(tabindex + Enter/Space) with visible focus states.

**Briefing** — POI dossier cards with amber initials avatar chips (EV/MR),
role and status lines; numbered objective chips; note lines with em-dash
hangs; floor plan upgraded (zone-tinted fills, star/diamond/wedge glyphs
matching the minimap, star-north compass, 10 m scale bar, legend).

**Loadout** — weapon silhouettes redrawn with rails, optics (ice lens
dots), sight posts, magazines, grips with stippling, serrations — still
flat, two-tone, original; kicker line (maker · class); normalized stat bars
for damage/rate/magazine; sidearm silhouette added to "Always carried".

**Loading** — animated blueprint trace of the ground floor (dashed stroke
march + scan line), FIELD NOTE tip treatment, centered composition.

**Pause** — frosted-glass panel (backdrop-filter blur + saturate) with the
same instant show/hide; menu unchanged, confirm-to-restart preserved.

**Victory / defeat** — cinematic type scale (clamped up to 74px), tinted
star-north sigil, stat blocks with geometric icons (clock/contact/
cartridge/rings/person), animated snow behind victory, breathing red
vignette behind defeat. All motion dies under `body.reduced-motion`.

**Settings / controls** — settings split into four titled panels (Audio /
Display / Handling / Accessibility) on a two-column grid; row hover states;
toggles are focusable switches; controls reference rendered as kbd chips
per binding. All setting keys and widget behaviors unchanged.

**HUD** — corner blocks are now quiet framed chips (the smear gradients
read as dirt on bright snow; framed chips match the minimap and stay
legible over the whiteout). Crosshair thinned to 1.5px + round center dot,
dynamic `--gap` preserved, ADS/gadget hiding preserved. Ammo block gains the
active-weapon silhouette (auto-updates on switch), low-ammo amber state at
≤25% mag, and a reload progress micro-bar driven from
`game.weapons.timer` (handles shell-by-shell reloads). Vitals get plate
segmentation on the armor bar and a low-HP border alarm. Mission block adds
the INFIL→LOCATE→RESCUE→EXFIL phase track driven by `game.phase`, and
hostage pips with initials chips. Subtitles/announce/interact prompt get
scrims, fade-ins and an ice kbd chip.

**Minimap** — 2× backing canvas (416px) for high-DPI crispness, corner
brackets, player FOV wedge, north edge indicator, star/diamond objective
glyphs (counter-rotated to stay upright), level chip in the frame label.
**Fixed a pre-existing orientation bug**: the old transform
(`rotate(yaw + π)`) drew player-forward *down*; verified against
`render_game_to_text` (yaw 0 = north, spawn faces the building) and
corrected to `rotate(yaw)`. Also removed the every-other-frame throttle
that left the map stale/blank in deterministic single-step renders.

**Resolution** — root font-size steps up at ≥2560px and ≥3400px viewports;
HUD metrics converted to rem so the whole HUD tracks; crosshair/hitmarker
scale via media-query transforms. Verified at 3840×2160.

## 3. Verification

- Screenshots reviewed at 1920×1080: title (+reduced-motion variant),
  difficulty, briefing, loadout, settings, controls, loading, HUD (plus
  ammo/mission/minimap/vitals/reload/low-ammo crops and north/east
  minimap orientation checks), pause, victory, defeat; HUD at 3840×2160.
  All under `artifacts/f1_*.png`.
- Zero console errors in every probe.
- `npx playwright test tests/01-boot-flow.spec.js`: **4/4 pass** (repeated
  3×; one early failure was a vite module-reload race while I was editing
  mid-run, not reproducible).
- Full suite `npx playwright test`: **14/14 pass** (5.7m).
- Contract intact: all screen ids, `.screen.active`, exports
  (`buildMenus`, `setFlowHandlers`, `getMissionConfig`, `setMissionConfig`,
  `setLoadingProgress`, `buildHud`, `renderHud`, `updateHudTick`,
  `setQaOverlay`), clickable button texts, card `data-id`s, and every HUD
  element id. `renderHud` reads only pre-existing game fields
  (`game.phase` and `game.weapons.timer` already existed).

## 4. Proposed copy changes (constants.js — NOT edited, lead to decide)

1. `DIFFICULTIES.*.tagline` are good; consider a fourth stat line
   ("Reaction time") — the data exists and the cards have room.
2. `MISSION.hostages[*]` could carry a `brief` one-liner (e.g. Voss:
   "Last seen near the server wing she refused to evacuate") to enrich the
   dossier cards without inventing lore UI-side.
3. `LOADING_TIPS` read well; suggest adding one tip that teaches the phase
   track ("Your objective strip tracks INFIL → EXFIL...").

## 5. Cross-cutting suggestions for other agents

- **Fable 2/3 (lighting/props)**: the exterior at spawn is very bright and
  flat (see f1_hud.png) — HUD now survives it, but the §8 exposure targets
  suggest pulling the sky/snow ratio closer and adding storm fog for depth.
- **Fable 4**: muzzle flash/tracer warm-white per bible §10 so they read on
  both snow and interiors; enemy kit should stay the darkest large shapes.
- **Opus 4**: minimap orientation is now correct (forward-up); if any
  screenshot baselines encoded the old flipped map, they need refreshing.
  `tools/shot.mjs` could accept an optional clip region — the crop scripts
  I inlined would become one-liners.

## 6. Known limitations / follow-ups

- The staged loading-screen capture shows the title screen behind it (both
  screens force-activated for the shot); real flow shows one screen at a
  time — verified in the real Begin Mission flow.
- Gadget cards have no stat bars (only ×count) — intentional; radius/fuse
  bars read as noise at this size.
- The pause blur (backdrop-filter) is applied to a ~500px panel only;
  cheap, but worth a low-quality-preset check on weak GPUs in Wave C.
