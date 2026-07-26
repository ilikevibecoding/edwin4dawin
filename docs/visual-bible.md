# NORTHSTAR RESCUE — Visual Bible

Owner: Fable 1 (art direction & interface). Every artist checks work against
this document. When a call here conflicts with taste, this document wins;
propose amendments through the lead, don't drift.

---

## 1. Logline & mood

> A whiteout swallows a corporate campus at dawn. One operator walks into a
> building full of fluorescent hum, spilled coffee and armed strangers, and
> walks out with two people who thought they were going to die there.

Three words: **cold · procedural · humane.**

- The *storm* is the antagonist's ally and our clock. Exteriors are hostile,
  luminous, directionless — snow-bounce light with no warm anchor.
- The *office* is achingly normal. Beige mundanity interrupted by violence.
  Horror comes from familiarity, not from gloom.
- The *operator* is calm. The UI is their voice: terse, precise, engineered.
  Nothing on screen shouts unless someone is dying.

Reference feelings (not references to copy): the hush after heavy snowfall;
an empty office at 04:00 with half the lights on; instrument panels in a
parked snowplow.

## 2. Master palette (world)

Rules first, swatches second. **The world is neutral; color means something.**

| Zone family | Key hexes | Usage rule |
|---|---|---|
| Exterior / snow | `#c9d6e2` snow shadow, `#eef4f9` snow lit, `#8fa6ba` sky grey-blue, `#5c7186` distant structure | Cold blue daylight, 6500–8000 K. NO warm tones outdoors except emergency beacons. Value range compressed high (0.55–0.95); silhouettes carry the read. |
| Office (open plan, halls) | `#b9b4a6` drywall, `#8a8578` carpet, `#c4c9c6` fluorescent tint | Slightly **green** fluorescent bias (+0.03 G). Mid-value field (0.35–0.7) so both snow-lit windows and dark corners read. |
| Exec / warm accents | `#a06b3c` wood, `#ffb454` desk lamps, `#e8d9bd` warm paper | Warmth = comfort = leadership spaces and human traces (mugs, lamps). Never more than ~20% of a frame. |
| Service / basement | `#5d6166` concrete, `#3d444c` shadow floor, `#87919b` cool strip light | Darker but READABLE: floor value never below 0.12 in playable space. Single-source pools, long falloff. |
| Danger / objective | `#ff5a4e` red, `#ffb454` amber | **Red is rationed**: exit signs, alarm strobes, defeat state, lethal telegraphs. Amber marks objectives/interaction. If a prop is red and not dangerous, repaint it. |
| Life / success | `#7dd87d` | Extraction, secured hostages, victory. Small doses only. |

Snow bounce: exterior-facing rooms receive a cool up-light fill
(≈ `#b8cfe4` at 15–25% of key). Interior-only rooms never receive blue fill.

## 3. UI palette

The confirmed interface family (do not invent new UI hues; tints derive from
these by opacity only):

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#e8f1f8` | Primary text, player marker |
| `--ink-dim` | `#9db4c6` | Secondary text, labels |
| `--ink-faint` | `#5d7284` | Tertiary text, hints, disabled |
| `--ice` | `#7fd2ff` | Interactive accent, selection, friendly data |
| `--ice-dim` | `#3e7ea6` | Ice at rest (rules, bar tracks) |
| `--amber` | `#ffb454` | Objectives, warnings, interaction |
| `--danger` | `#ff5a4e` | Damage, empty mag, defeat. NOTHING else |
| `--ok` | `#7dd87d` | Health, success, extraction |
| deep field | `#060a10` → `#0e1c2c` | Backgrounds, panels (with alpha) |

Contrast floor: body text ≥ 7:1 against its local backplate; tertiary
labels ≥ 4.5:1. If text sits over the 3D scene, it gets a scrim — no
naked text over snow.

## 4. Typography

System stacks only (offline build, zero webfonts). Character comes from
weight, tracking and case — not from typefaces.

- **Display / titles** — `--font-ui` at 700–800, tracking 0.18–0.34em,
  UPPERCASE. Title screen wordmark is the loudest thing in the game; nothing
  else may exceed 60% of its size.
- **Labels / navigation** — 600, 11–13px, tracking 0.2–0.3em, UPPERCASE.
- **Body / narrative** — 400–500, 13.5–15px, tracking normal, sentence case,
  line-height 1.55, measure ≤ 68ch. Briefing prose is the ONLY long-form
  text in the game; treat it like a document, not a poster.
- **Data** — `--font-mono` for every number that changes (ammo, timer,
  stats, coordinates). Numbers never render in the UI face.
- Scale ladder (rem-based in HUD): 0.65 / 0.75 / 0.85 / 1.0 / 1.6 / 2.6 —
  don't invent in-between sizes.

## 5. Shape language

- **Chamfered rectangles.** Panels and cards are rectangles with a single
  45° chamfer or corner-bracket ticks. No border-radius above 4px anywhere
  except avatar chips and the crosshair dot.
- **Thin rules.** 1px hairlines at 12–25% ice; structure through line, not
  through boxes-inside-boxes. Max two nested borders.
- **Corner brackets** (⌐ marks) denote *live/selected* elements: selected
  cards, the minimap frame, active objectives.
- **The star-north motif.** A four-point star with an elongated north limb
  inside a fine ring with 4 cardinal ticks. It appears: title logomark,
  minimap north pointer, briefing compass, victory sigil, hostage "secured"
  pip. It is the game's only emblem — never redraw it freehand, copy the
  path from `src/ui/menus.js` (`starNorth()`).
- Diagonals reserved for hazard: 45° stripes appear only on danger/defeat
  chrome and in-world hazard decals.

## 6. Iconography rules

- Flat, single-weight, geometric. Built on a square grid, 2px stroke at
  24px nominal size; filled silhouettes for weapons/equipment.
- Two tones max per icon: BODY `#a9c3d6`, DARK `#5d7284`, plus one optional
  `--ice` focal dot (optic, LED). No gradients inside icons.
- Weapon silhouettes: side profile, muzzle pointing RIGHT, consistent
  240×80 viewBox, rail/grip/sight detail included but no brand geometry —
  see `src/ui/weaponIcons.js`.
- Map glyph grammar (minimap + briefing must agree):
  player = pointed wedge (ink) · hostage = 4-point star (amber, ice while
  following) · extraction = diamond (green) · doors = amber ticks ·
  hostiles (QA only) = red dots.

## 7. Material standards (summary)

Authority: Fable 3's library (`docs/reports/fable3-materials.md`). UI-side
requirements on top of it:

- Albedo never pure white or black (snow max `#eef4f9`, shadow min `#101418`).
- Roughness tells the story: office = matte (0.7–0.95) except glass, steel
  door hardware, server fronts; exec wood ≈ 0.45; garage floor sealed ≈ 0.35
  with tire-wear darkening.
- No baked directional light in any texture (bible-level law; verified in
  Fable 3's pass).

## 8. Lighting reference targets

One shadowed sun (storm-diffused), quality-budgeted interior points. Targets
below are post-tonemap perceived values at player eye height.

| Zone | Key intent | Target mid-grey | Notes |
|---|---|---|---|
| Plaza / exterior | Directionless storm daylight | 0.65 | Sky and snow within 25% of each other; blizzard fog flattens distance. Exposure anchored so interiors read dim from outside. |
| Lobby / vestibule | Daylight ingress + cool ceiling wash | 0.55 | Tall glass = brightest interior zone; watch blown highlights at the curtain wall. |
| Open office / halls | Even fluorescent grid, slight green | 0.45 | Some fixtures dead/flickering for rhythm; never a fully dark cubicle aisle. |
| Exec wing / conference | Fluorescent + warm lamp pools | 0.42 | Warm:cool ratio ≈ 1:3. Lamps are landmarks. |
| Server / IT | Cool tech glow + LED points | 0.35 | Ice-blue rim from racks; the one "sci-fi" room, keep restrained. |
| Service / storage / mech | Sparse strip lights | 0.28 | Pools + falloff; corridors light at the ends so players chase light. |
| Basement / garage | Darkest playable | 0.22 | Emergency red allowed HERE only as tiny beacons; extraction van headlights are the warm goal-light. |

Exposure guidance: ACES, exposure locked per session (no auto-adapt).
Nothing gameplay-relevant below 0.08 luminance. Bloom stays off; glow is
painted (emissive sprites), vignette ≤ 0.55 CSS overlay.

## 9. Scale standards

1 unit = 1 m. Deviating from these reads instantly as wrong:

door 2.06 × 0.92 · ceiling office 3.0 / lobby 4.4 / basement 2.6–3.2 ·
desk 0.75 · counter 0.9–1.1 · seat pan 0.45 · monitor 0.61 (24") ·
partition 1.5 · rail 1.0 · stair riser 0.17, tread 0.28 · server rack 2.0 ·
van 1.9 h · fire extinguisher 0.6 · ceiling tile grid 0.6 · A4 paper 0.297.
Cover grammar: low cover 0.9–1.1 (crouch), high cover 1.5+ (stand).

## 10. Readability rules (combat)

- Enemy silhouettes are the **darkest large shapes** in any playable frame
  (charcoal/black kit) — the world stays mid-value so they pop; hostages
  wear light civilian colors (never red, never charcoal).
- Objective color = amber, exactly one meaning. If amber appears, the player
  may walk to it or press E at it.
- Muzzle flash and tracers must read against snow AND against office
  interiors: warm-white core with amber falloff.
- Glass must show its presence (frame + smudge + specular) before the
  player wastes a magazine on it.
- The HUD never covers the center 40% of the screen except crosshair,
  hitmarker and the interact prompt (which sits below eyeline at 58%).

## 11. Room mood targets (one line each)

Ground floor:
- **Employee Entrance (plaza)** — whiteout no-man's-land; drifted steps, buried planters, wind-driven snow ropes.
- **Security Vestibule** — airlock hush; badge gate dead, red standby LED the only saturation.
- **Reception Lobby** — corporate pride under siege: tall glass, stone floor, backlit NORTHSTAR DYNAMICS letters half-lit.
- **Security Office** — cramped monitor-glow cave; six live camera feeds, one tipped chair.
- **Visitor Waiting** — magazine-neat seating nobody will use again; abandoned coats.
- **Restrooms & hall** — clinical tile bounce, frosted daylight, dripping-tap stillness.
- **Janitor Closet** — mop-bucket clutter, bare bulb, the building's honest backstage.
- **West Hallway** — transitional beat; noticeboard flyers, wayfinding arrows, one flickering tube.
- **Copy & Mail Room** — toner-dust utilitarian; pigeonholes, a jammed copier mid-blink.
- **Open-Plan Office (cubicles)** — the heart: a hundred interrupted mornings, monitors asleep, one radio still playing.
- **Records Archive** — dense shelving canyons, sealed-concrete echo, motion-sensor lights that wake as you move.
- **IT Workspace** — cable spaghetti and monitor towers; the nerd-cave warm spot of the north wing.
- **Server Room** — cold aisle: rack LEDs, hum, ice-blue rim light; keycard-locked prize.
- **East Hall** — vinyl service spine with glass peeks into archive and IT; mid-value connective tissue.
- **Executive Corridor** — carpet quiets your feet; framed mountain photography, brass door hardware.
- **Conference Room** — long table as cover; whiteboard strategy no one finished; storm-wall of south glass.
- **Executive Office** — warmest room in the game: wood, lamp pools, a view the CTO paid for — now a cell.
- **North Corridor** — the dangerous artery: long, low-ceilinged, marksman bait; light it in stripes.
- **Break Room** — half-eaten normalcy; vending glow, kettle steam, the most human room.
- **Facilities Office** — hi-vis vests and site plans; Reid's world, keys to everything.
- **Training Room** — stacked chairs and projector twilight; wide north glass onto the storm.
- **Facilities Storage** — steel shelving gauntlet, motion-light delay, good ambush geometry.
- **Stairwells (west & central)** — bare concrete verticality, painted rails, stenciled floor numbers, fire-code lighting.
- **Mechanical Room** — AHU bulk and duct shadow; the building breathing loudly.

Basement:
- **Service Corridor** — pipe-lined artery, pooled strip light, painted floor lane markings.
- **Utility Room** — panels and conduit; breaker-hum menace, deepest shadow pockets.
- **Loading Area** — pallet clutter and roller door; cold daylight leak under the shutter.
- **South Service Link & stair bases** — tight red-valve punctuation marks between volumes; keep floors readable.
- **Extraction Garage** — the finale: parked vans, tire-worn sealed slab, headlight goal-glow and the shutter to the storm.

## 12. Asset review checklist (UI & world art)

Score 1–5, everything ships at ≥4.

1. **Silhouette** — reads at 100% and 25% zoom; nothing mushy.
2. **Proportions** — checked against §9; a door is 2.06 or it's wrong.
3. **Palette** — every hex traceable to §2/§3; red audit passed (§2 rule).
4. **Value** — sits in its zone's target band (§8); no crushed/blown areas.
5. **Story** — the asset says who used it and what interrupted them.
6. **Consistency** — motif, chamfers, tracking, icon grammar match this doc.
7. **Readability** — does not fight enemy silhouettes or objective color.
8. **Performance** — merged/batched per architecture rules; UI is DOM/SVG/CSS only, no images fetched.
9. **Motion** — all animation dies under `body.reduced-motion`; nothing strobes faster than 3 Hz.
10. **Originality** — zero borrowed marks, fonts, or recognizable real-world branding.

## 13. UI-specific laws (quick card)

- Screens keep their ids and the `.screen.active` mechanism — test-locked.
- Buttons: uppercase, tracked, left-aligned label, hover = ice edge + fill
  lift, focus-visible = 2px ice ring offset 2px (accessibility is chrome).
- One primary action per screen, always bottom-right (or top of menu stack).
- The HUD is quiet: at rest it is four corners + crosshair. New HUD elements
  require a bible amendment.
- Every number the player watches under stress (ammo, timer, HP) is mono,
  ≥ 1rem, on a scrim.
