# Prompt: Build "Arena Rumble" — a Clash Royale–style demo (non-commercial, original assets)

Copy everything below this line into a fresh Fable 5 agent run. If you have reference
screenshots of the real game, drop them into a `reference/` folder in the repo root
before starting the agent — it will use them for layout/proportion comparison.

---

## Mission

Build a playable browser demo in this repo that captures the look, feel, and flow of a
mobile arena card battler in the style of Clash Royale. Two connected experiences:
a **home/chest screen** and a **real-time tower battle**, linked in a full game loop.

This is a private, non-commercial study project. All art must be **original** — draw it
in code (SVG/canvas) or generate it yourself with your image tool. Do **not** download,
extract, decompile, or trace Supercell assets, and do not use the name "Clash Royale",
Supercell logos, or their specific character designs anywhere. You get the "looks just
like it" effect by matching layout, proportions, palette language, and animation energy,
and by using generic fantasy archetypes (knight, giant, archer) rendered in your own style.

## Tech constraints

- Plain HTML/CSS/JS. No framework, no build step. `index.html` + ES modules in `src/`,
  images in `assets/`.
- Portrait stage at 9:16. Design at 360×640 logical pixels, scale to fit the window,
  letterbox the rest with a dark background.
- Render the battle arena and units on a `<canvas>`; UI chrome (top bars, card hand,
  buttons, overlays) may be DOM+CSS.
- Serve with `python3 -m http.server` (or any static server). Install Playwright +
  headless Chromium as the only dev dependency, used exclusively for screenshots.
- `requestAnimationFrame` game loop, 60fps target, zero console errors.

## Art direction

Chunky cartoon fantasy, read-at-a-glance:

- Thick dark outlines, saturated colors, simple cel shading, rounded silhouettes,
  slight top-down 3/4 perspective on the arena.
- Generate sprites in consistent batches with identical style directives so nothing
  looks out of place: towers (side + king variants for both teams), 4+ unit types,
  chest (closed / rattling / burst-open), card frames by rarity, elixir drop, crowns,
  coins, gems, arena ground tiles, river, wooden bridges, rocks/fences/trees, buttons.
- Palette: two-tone checkered grass greens, warm stone grays, wood browns, river blue,
  team accents (player = blue, enemy = red), magenta/pink for elixir, gold for rewards.
- Typography: heavy rounded display font (download e.g. "Lilita One" or "Luckiest Guy"
  locally from Google Fonts), white or gold fill with a dark outline and drop shadow.

## Screens and flow (state machine)

`HOME → CHEST_OPENING → HOME → BATTLE → RESULT → HOME`

1. **HOME** — Top bar: player name + level badge on the left, gold and gem counters on
   the right. Center: big glossy "Battle" button. Bottom: a row of 4 chest slots — one
   glowing "Ready to open!", one showing an unlock countdown, two empty. Subtle animated
   background (drifting clouds or shimmering banner).
2. **CHEST_OPENING** — Dark overlay; the ready chest slides to center and wobbles when
   tapped; after 3 taps the lid bursts with light rays and particles. Rewards fly out
   one by one: gold with a count-up ticker, then 2–3 card stacks with rarity-colored
   frames and count-ups. An "Okay" button returns HOME.
3. **BATTLE** — Full arena per the layout spec below. Player deploys by tapping a card
   then tapping their half of the arena (or drag-and-drop). Enemy AI deploys on a timer.
   3:00 countdown.
4. **RESULT** — "Victory!" or "Defeat" banner with crowns earned animating in; a reward
   chest drops into an empty HOME slot on win; continue button returns HOME, completing
   the loop.

## Battle screen layout spec (match this closely)

- **Top-left:** small banner with the opponent's name. **Top-right:** a "Time left: m:ss"
  panel.
- **Enemy half (top):** king tower centered at the very top on a stone platform with a
  crown emblem above it; two smaller side towers left and right, each with a level badge
  and a red HP bar showing the number (e.g. 840). **Player half (bottom):** mirror image
  with blue HP bars.
- **Field:** green two-tone checkered grass framed by stone tiles; fences, rocks, and
  shrubs decorate the outer edges. A horizontal river crosses the middle with two plank
  bridges aligned to the two lanes.
- **Right edge, midfield:** stacked crown counters (enemy red on top, player blue below),
  each showing 0–3.
- **Bottom UI panel (dark blue):** 4 card slots in rounded frames with unit art and a
  pink elixir-cost drop badge in the corner; a smaller "Next:" preview card pinned
  bottom-left; beneath the hand, a segmented magenta elixir bar filling left to right
  with a numbered elixir drop at its left end.
- **Units:** deploy with a countdown ring, carry a level badge + mini HP bar overhead,
  walk their lane toward the nearest bridge then the nearest tower, attack with
  squash-and-stretch impacts, floating damage numbers, and a poof on death.
- At least 4 playable archetypes with distinct silhouettes: a slow high-HP **tank**, a
  cheap 3-unit melee **swarm**, a **ranged pair**, and a direct-damage **spell** with a
  projectile arc and explosion.

## Gameplay rules (simplified but real)

- Elixir for both sides: regen ~1 per 2.8 s, cap 10, cards cost 2–5.
- Enemy AI plays a random affordable card near one of its bridges every few seconds;
  after 60 s it gets slightly smarter and pressures the player's weaker lane.
- Targeting: units attack the nearest enemy unit in range, else the nearest tower;
  towers shoot the nearest unit in range.
- Destroying a side tower = +1 crown. Destroying the king tower = instant win, 3 crowns.
  At 0:00 the side with more crowns wins (tie = draw screen).

## Polish checklist

Tower-destruction explosion with smoke and debris, elixir-drain animation when a card is
played, hand refill slide-in, button press bounce, chest glow pulse, quick fade/swipe
screen transitions, and idle motion everywhere (waving flags, shimmering water, chest
sparkle). Optional: WebAudio-synthesized SFX for tap / deploy / hit / explosion / victory
fanfare — never copied audio.

## The visual iteration loop — run all 15

After the first end-to-end build works, run **exactly 15 improvement iterations**.
Each iteration:

1. Serve the app and use Playwright to capture PNGs of five states: HOME,
   CHEST_OPENING mid-burst, BATTLE at ~10 s in (units from both sides on the field),
   BATTLE at a tower-destruction moment, and RESULT. Save to `artifacts/iter-NN/`.
2. Actually look at every screenshot. Score each 1–10 on this rubric:
   (a) layout fidelity to the spec and to any images in `reference/`,
   (b) sprite quality and style consistency,
   (c) palette cohesion,
   (d) text/UI readability at 360 px wide,
   (e) animation and game-feel evident even in stills,
   (f) overall "could pass for a real mobile game" impression.
3. Write the scores plus the **5 most damaging visual problems** to
   `artifacts/iter-NN/notes.md`.
4. Fix those 5 problems before anything else. If sprites are the weak point, regenerate
   them in batches with identical style directives — style drift between sprites is the
   most common failure. Prioritize the most visible surfaces first: arena, towers, cards,
   units; edge decorations last.
5. Re-capture the affected screenshots and confirm each fix actually landed before
   moving to the next iteration.

Rules: never skip an iteration. Use `reference/` images only to compare proportions,
spacing, and HUD scale — never copy or embed them in the game. If every category scores
9+, spend the remaining iterations on animation polish and micro-detail: shadows,
highlights, particles, easing curves.

## Definition of done

- `index.html` runs the full HOME → chest → battle → result loop with no console errors.
- All 15 `artifacts/iter-NN/` folders exist with screenshots and notes.
- README documents how to run it, with final screenshots embedded.
- Nothing Supercell-owned (names, logos, art, audio) exists anywhere in the repo.
