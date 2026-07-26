# Northstar Rescue — Visual Bible

**Owner:** Fable 1 (art direction, interface).
**Applies to:** every agent producing anything the player can see — architecture, props,
characters, weapons, effects, lighting, decals, UI.
**Companion code:** `src/art/palette.js` is the machine-readable half of this document.
When this file and the palette disagree, fix one of them — never ship the disagreement.

The one-sentence target: **a cold, believable regional office at night, buried in a storm,
lit like a thriller and read like an instrument panel.** Grounded stylised realism — real
proportions and real materials, simplified surfaces, and colour discipline doing the work
that texture detail cannot.

---

## 1. Colour script

All colours are authored in `PALETTE` (`src/art/palette.js`). Do not invent new hex values
in feature code; add to the palette (additively) and reference the key.

### 1.1 The five lighting zones

The map reads through five zones. Every room in `src/map/layout.js` declares one
(`zone:`), and `ZONES` in the palette gives each its key/fill colours and intensities.

| Zone | Rooms | Key light | Fill | Feeling |
| --- | --- | --- | --- | --- |
| **A — Exterior / window-adjacent** | courtyard, aprons, lobby glazing | `daylightCold` `#a8c8e8` | `snowBounce` `#9fc4e6` | Cold, blue, over-exposed snow |
| **B — Open office** | open office, corridors, copy/IT | `fluorescent` `#e8f2e6` | `fluorescentCool` `#dcebf0` | Flat, slightly green, institutional |
| **C — Occupied / executive** | exec suite, conference in use | `tungsten` `#ffc98a` | `deskLamp` `#ffb765` | Warm pools in cold surroundings |
| **D — Service / back of house** | service corridor, loading, garage | `fluorescentTired` `#d8e6c8` | `emergency` `#ff4a3a` | Dim, sparse, navigation lighting |
| **E — Danger / objective accents** | signage, alarms, markers | `emergency` `#ff4a3a` | `hazardAmber` `#f0a020` | Used in square centimetres, not square metres |

Rules:

- Warm light (`tungsten`, `deskLamp`) is **narrative**: it marks habitation and objectives.
  Never use it as general fill.
- Red (`emergency`, `brandRed`, `uiDanger`) is **reserved**: exit signage, alarm states,
  damage feedback. If a surface is red and none of those apply, repaint it.
- Screens glow `screenGlow` `#7fb4d8` (cool) or `screenGlowWarm` `#d8c090` (warm rooms).
- Fog and sky come only from `fogSnow`, `skyZenith`, `skyHorizon`.

### 1.2 Surface families

Use the `PALETTE` surface keys (`drywallWarm/Cool`, `carpetMain/Accent/Exec`,
`concrete/concreteSealed`, `woodVeneer`, `brushedMetal`, …). Saturation discipline:
architecture stays under ~20% saturation; only brand elements, safety equipment and
zone-E accents may exceed it.

### 1.3 Brand

The Northstar corporate identity inside the fiction: `brandDeep` `#0e2233`,
`brandTeal` `#1d6f8c`, `brandIce` `#7fd4e8`, `brandSand` `#d8c9a8`, `brandRed` `#c63b2f`.
The wall accent `drywallAccent` `#39505f` is the corporate deep teal used on feature walls.
The brand mark is the **eight-point compass star** (`compassStar()` in `src/ui/icons.js`)
— long cardinal points, short intercardinals, inside a survey ring. It is the only logo in
the game. No text logotypes on 3D surfaces; use the star plus set-dressing signage.

### 1.4 Interface colours

The UI family lives in both `PALETTE` (`uiInk`, `uiInkDim`, `uiPanel`, `uiPanelHi`,
`uiAccent`, `uiWarn`, `uiDanger`, `uiGood`) and as CSS custom properties in
`src/ui/styles.css` (`--ink`, `--accent`, …). They are the same values; keep them the same.

| Role | Key | Hex | Use |
| --- | --- | --- | --- |
| Ink | `uiInk` | `#e8eef4` | Primary text, crosshair |
| Ink dim | `uiInkDim` | `#8c9aa8` | Secondary text |
| Panel | `uiPanel` | `#0d1620` | Card fields, map paper |
| **Accent (the single accent)** | `uiAccent` | `#4fd0e8` | Focus, selection, interactive keys |
| Warning | `uiWarn` | `#ffb03a` | Hostages, low ammo, cautions |
| Danger | `uiDanger` | `#ff4d43` | Damage, locked, failure |
| Positive | `uiGood` | `#4fe08a` | Extraction, success, completed |

There is **one accent colour**. Amber, red and green are semantic states, not decoration.

### 1.5 Cartography (2D maps)

The HUD minimap and briefing plan use `MAP_INK` and `MAP_ZONE_FILLS` (palette, additive
exports). Zone fills are darkened translations of the lighting zones so the 2D map recalls
the lit 3D spaces. Hostages/objectives are `uiWarn`, extraction `uiGood`, the player and
glazing `uiAccent`, hostile marks `uiDanger`.

---

## 2. Shape language

Machine-readable constants: `SHAPE_LANGUAGE` in the palette.

- **Rectilinear architecture.** Right angles, honest spans. Walls 0.1 m
  (`wallThickness`), partitions 0.06 m, doors 0.95 × 2.1 m, sills at 0.85 m.
- **No razor edges.** Every player-height edge carries a ~3–4 mm chamfer
  (`edgeBevel: 0.004`). Silhouettes read as manufactured, not extruded.
- **Props are boxy with softened corners** — the same 2 px corner radius idea the UI uses,
  translated to millimetre bevels. Nothing organic except people and clutter paper.
- **Characters**: realistic proportions (eye 1.68 m, shoulder 1.42 m, width 0.52 m).
  Silhouette first: hostiles read by bulk and headgear at 30 m in zone-D light;
  hostages read by bright, warm-toned civilian layers.
- **Weapons**: one product family. Straight top line, angular receivers, matte finishes;
  accents limited to a single `uiAccent`-coloured detail per weapon (sight dot, selector).

## 3. Lighting references (what "right" looks like)

- **Exterior:** overcast blue hour in falling snow — flat sky dome, snow as the bounce
  card, silhouettes over detail. No sun, no long shadows.
- **Lobby:** double-height cold daylight through tinted curtain glazing, warm reception
  desk lamp as the single counterpoint.
- **Open office:** even fluorescent grid with tired-tube variation (`fluorescentTired` on
  ~1 in 6 fixtures), monitors as local cool glows.
- **Service spine:** widely spaced battens, pools of dark between them, red emergency
  boxes at exits. The 28 m sightline should end in gloom, not in fog.
- **Server room:** the darkest interior — rack LEDs (`serverBlue`, `serverAmber`) carry
  the room.
- Bloom is for **emissive sources only** (fixtures, screens, muzzle flash), never for
  bright albedo. Motion blur defaults **off**.

## 4. Material standards

- Procedural textures only (`src/art/texgen.js`); no image files, no binary assets.
- PBR sanity: albedo within 30–240 sRGB; metals only for actual metal
  (`brushedMetal`, `stainless`, `aluminum`); roughness tells the story of wear.
- Every material resolves to a palette surface key. Variation comes from `shade()` /
  `mix()` on the base value — nudge value, not hue.
- Wear is directional and motivated: scuffs at kick height, polish on push plates,
  carpet tracking along desire lines to doors.
- Glass: `glassKind` clear / tinted / frosted per `layout.js`; tinted exterior glazing
  leans `brandDeep`.

## 5. Scale standards

From `SHAPE_LANGUAGE`: desks 0.735 m, counters 0.92 m, chair seats 0.45 m, office
ceilings 3.0 m, service 2.6 m. **Check every prop against the door (2.1 m) and the desk
(0.735 m)** before submitting; a wrong-scale prop breaks the whole room. The player
capsule assumes those numbers — cover that should hide a crouching player must top out
at ≥ 1.1 m; sightline breaks must reach ≥ 1.8 m.

## 6. Typography

System stacks only (declared in `styles.css`); the game never loads a webfont.

- **Display** (`--font-display`, condensed grotesque: Bahnschrift / DIN Alternate /
  Oswald / Arial Narrow): headings, menu items, vitals numerals. Uppercase, generous
  letter-spacing — 0.15–0.42 em depending on size (bigger type, tighter tracking).
- **UI text** (`--font-ui`: Inter / Segoe UI / Helvetica): body copy, descriptions,
  subtitles. Sentence case, never tracked.
- **Mono** (`--font-mono`: JetBrains Mono / Consolas): key labels, coordinates, build
  strings, table values.
- **Numerals that change must not jiggle:** `font-variant-numeric: tabular-nums` on
  ammo, health, timers, results.
- Minimum sizes at 1080p: 11 px body, 9 px labels (never below).
- In-fiction signage follows real wayfinding conventions: room codes
  (`G-14 COPY & MAIL`), disciplined arrows, no jokes.

## 7. HUD philosophy

1. **The centre of the screen belongs to the game.** Crosshair and hitmarker only.
   Everything persistent lives in the corners; `#hud` never covers the middle third
   with anything opaque.
2. **Instrument, not billboard.** Type and hairlines on darkness — no chrome panels,
   no gradients behind gameplay, no default browser widgets anywhere.
3. **State changes announce themselves once**, quietly (announcer band, 4 s), then get
   out of the way. Detailed instruction lives in the **briefing**, not on the HUD.
4. **Feedback is graded:** hit tick < kill ring < headshot colour; damage vignette scales
   with the hit; the crosshair opens with the real spread value from
   `weapons.spreadDegrees` (no fake feedback).
5. **Everything on the HUD is testable.** If it is displayed, it is in `hudState()`.
6. Accessibility is not a mode: subtitles, crosshair styles, reduced motion/blood, UI
   scale and high-contrast targets are first-class settings, live-applied.
7. **Menus are audible.** Every interface emits the shared audio events with a
   `kind` payload the audio engine switches on:
   - `EVT.UI_NAV { kind:'move' }` — selection/focus change (arrows, Tab, cycler steps).
   - `EVT.UI_NAV { kind:'slider', value:0..1 }` — slider drag (audio-volume sliders are
     exempt: `settings.js` self-ticks those so the sample plays at the *new* volume).
   - `EVT.UI_NAV { kind:'back', direction:'back' }` — Escape, Back buttons, cancelling
     a confirm dialog.
   - `EVT.UI_CONFIRM { kind:'select' }` — activation (click/Enter on a control,
     completing a key rebind, dismissing the title).
   - `EVT.UI_CONFIRM { kind:'deny' }` — rejected input (e.g. trying to bind Escape).
   Buttons that emit their own sound opt out of the delegated click handler with
   `data-uisound="none"` so nothing double-fires.

## 8. Iconography rules

All glyphs live in `src/ui/icons.js`. One drawing system:

- 24 × 24 viewBox, stroke width **1.6**, round caps and joins, corner radius **1.5**,
  `currentColor` only (CSS owns colour).
- Icons are **outlines**, not fills (the brand star and marker dots are the exceptions).
- One concept per glyph; no compound icons; no text inside icons; **no emoji anywhere**.
- Weapon classes use side-profile stencils sharing a common baseline and muzzle
  direction (pointing right).
- Map markers: hostage = person arc, objective = diamond, extraction = bracketed arrow,
  danger = triangle. The same shapes appear on the HUD, minimap and briefing — never
  invent a second symbol for a concept that already has one.

## 9. Consistency-review checklist

Run this before merging anything visible. Anyone on the team may hold any asset to it.

**Colour**
- [ ] Every colour resolves to a `PALETTE` key (or a `shade()`/`mix()` of one).
- [ ] Warm light only where the story says "occupied"; red only where it says "danger/exit".
- [ ] Nothing saturated above ~20% except brand, safety and zone-E accents.

**Form & scale**
- [ ] Player-height edges chamfered; no zero-width edges in reach.
- [ ] Prop passes the door/desk scale check (2.1 m / 0.735 m).
- [ ] Silhouette reads at gameplay distance in its room's zone lighting.

**Materials**
- [ ] Albedo in PBR range; metalness binary; roughness varied with motivated wear.
- [ ] No image/binary assets; textures generated in code.

**Interface**
- [ ] Uses existing CSS variables and classes from `src/ui/styles.css`.
- [ ] Type: display stack for headings/labels (uppercase + tracked), UI stack for body,
      tabular numerals for changing numbers.
- [ ] Keyboard: reachable, focus-visible, and escapable — Escape never traps.
- [ ] Works at 1920 × 1080 and when resized to ~1024 wide; honours `--ui-scale`.
- [ ] Respects `prefers-reduced-motion` and the `subtitles`/`crosshair`/comfort settings.
- [ ] New icons follow §8 (stroke 1.6, radius 1.5, currentColor).
- [ ] Anything displayed by the HUD is reflected in `hudState()`.

**Fiction**
- [ ] No Counter-Strike / Valve names, layouts, icons or HUD conventions;
      no real manufacturer or agency names. Everything is Northstar-original.
