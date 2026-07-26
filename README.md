# Northstar Rescue

**Northstar Administrative Center · Winter Response**

A single-player tactical first-person shooter. A response operator enters a
snowbound corporate headquarters occupied by the Kestrel Group, locates two
civilian hostages, escorts them to an extraction garage and gets out before the
mission clock runs down.

Runs in a Chromium-based browser on WebGL2. Everything you see and hear is
generated in code — there are no image, model or audio files in this repository.

---

## Start it

```bash
npm install
npm start
```

Then open **http://127.0.0.1:5173/**

That is the one documented command. `npm start` runs Vite bound to
`127.0.0.1:5173`. Nothing is fetched from the network at runtime, so it works
offline.

| Command | What it does |
| --- | --- |
| `npm start` | Development server (the normal way to play) |
| `npm run build` | Production bundle into `dist/` |
| `npm run preview` | Serve the production bundle on port 4173 |
| `npm test` | Full Playwright matrix |
| `npm run qa:shots` | Capture the room-by-room screenshot matrix |

Requirements: Node 20+, a Chromium-based browser with WebGL2 and hardware
acceleration. First load spends about 20 seconds generating textures, geometry,
the navigation grid and audio buffers; the loading screen covers it.

### Useful URL parameters

| Parameter | Effect |
| --- | --- |
| `?quality=low\|medium\|high\|ultra` | Force a quality preset |
| `?autostart=1` | Skip the menus and deploy immediately |
| `?difficulty=recruit\|operator\|veteran\|blackout` | Use with `autostart` |
| `?loadout=breacher\|assault\|infiltrator\|marksman` | Use with `autostart` |
| `?qa=1` | Enable development QA overlays |

---

## Controls

| Input | Action |
| --- | --- |
| **W A S D** | Move |
| **Mouse** | Look |
| **Left Mouse** | Fire |
| **Right Mouse** | Aim down sights |
| **Left Shift** | Slow, quiet walk |
| **Right Shift** | Sprint (forward only, not while aiming) |
| **Ctrl** or **C** | Crouch |
| **Space** | Jump |
| **Q / Z** | Lean left / right |
| **R** | Reload |
| **E** | Interact — doors, hostages, extraction |
| **1 / 2 / 3 / 4** | Primary / Secondary / Knife / Utility |
| **V** | Quick melee |
| **G** | Throw flash device |
| **H** | Throw smoke device |
| **T** | Weapon light |
| **M** | Expand the tactical map |
| **O** | Objectives |
| **F** | Toggle fullscreen |
| **Esc** | Pause, or leave fullscreen |

Click the canvas to capture the mouse. Detailed instructions live in the mission
briefing and the controls reference in the menus, not on the HUD.

---

## The mission

1. Cross the courtyard and enter through the employee entrance.
2. Sweep the building and locate both hostages — Dana Reyes and Milo Chen.
3. Approach each one and press **E** to secure them; they will follow you.
4. Lead them to the extraction garage on the east side.
5. Hold the marked bay with both hostages until the vehicle clears the area.

Press **E** on a following hostage to make them hold position, and again to make
them follow. Hostages open doors on their own and will always find a route to
extraction.

### Difficulties

| | Hostiles | Sight | Clock | Notes |
| --- | --- | --- | --- | --- |
| **Recruit** | 10 | 28 m | 12:00 | Slow reactions, loose aim, 60% incoming damage |
| **Operator** | 14 | 34 m | 10:00 | The intended experience |
| **Veteran** | 18 | 40 m | 8:00 | Tight aim, longer bursts, hostage guards execute after 25 s of open alarm |
| **Blackout** | 22 | 42 m | 6:30 | Building power cut — emergency lighting only |

### Loadouts

**Breacher** shotgun + pistol · **Assault** carbine + pistol (recommended) ·
**Infiltrator** SMG + pistol, lighter armour and faster movement ·
**Marksman** scoped rifle + pistol.

---

## The map

**Northstar Administrative Center** — a 64 × 38 m two-storey office block on a
snowbound site, entirely original in footprint, adjacency, sightlines and visual
identity.

Ground floor: north courtyard, security vestibule, double-height reception lobby,
visitor waiting area, north cross corridor (the map's long sightline), open-plan
cubicle floor in two bays, Aurora conference room, break room and kitchen, copy
and mail room, restrooms, janitor and utility closet, mid-block corridor, server
room, IT workspace, records archive, mechanical plant, west and east corridors,
south service corridor, central concourse, central stairwell, west fire stair,
loading dock and extraction garage.

Upper floor: lobby mezzanine, executive corridor, executive anteroom, executive
office, Northlight boardroom, upper records annex, executive gallery, executive
lounge and both stair landings.

The circulation is a double loop — a perimeter corridor ring plus a central
concourse and a mid-block link — so every objective room has at least two
approaches and no branch dead-ends.

---

## Documentation

| Document | Contents |
| --- | --- |
| `progress.md` | The original brief (preserved verbatim) and the full progress log |
| `docs/architecture.md` | Architecture summary, `render_game_to_text()` schema, QA API, performance |
| `docs/interfaces.md` | The binding interface contract between the eight workstreams |
| `docs/ownership-ledger.md` | File ownership, task board, cross-boundary fix record |
| `docs/asset-manifest.md` | Generated asset manifest (every registered asset with all required fields) |
| `docs/visual-quality-checklist.md` | Per-family 1–5 scores against the ten review categories |
| `docs/playwright-checklist.md` | Every automated scenario and what it asserts |
| `docs/known-issues.md` | Known limitations and their status |
| `docs/room-checklist.md` | Final room-by-room checklist |
| `docs/weapon-character-checklist.md` | Final weapon and character state checklist |
| `docs/screenshot-index.md` | Before-and-after and graybox-to-final screenshot index |

---

## Originality

Every asset in this project is generated at runtime by the code in `src/`:
textures are painted with `CanvasRenderingContext2D`, geometry is assembled from
`THREE.BufferGeometry` primitives, animation is procedural, and all audio is
synthesised through the WebAudio graph. The repository contains no image, model,
audio or font binaries.

**No Counter-Strike or Valve asset, source code, text, texture, sound, model,
map layout or interface element was copied or referenced.** All names, logos,
signage text, weapon manufacturers, characters, room layouts and interface
graphics are original to this project. Weapon designs are fictional and take only
generic firearm *categories* as functional inspiration.
