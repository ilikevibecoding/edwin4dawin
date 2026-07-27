# Screenshot Index — before, after, and graybox-to-final

All frames are captured off the live WebGL canvas by the tools in `tools/` and the Playwright suite.
Committed evidence is JPEG (`artifacts/screenshots/*.jpg`); per-spec PNGs are regenerated on demand
and deliberately untracked.

## Regenerating

```bash
npm start                    # in one terminal
npm run shots                # canonical 60-frame matrix + artifacts/screenshots/index.md
node tools/audit.mjs         # one frame per checkpoint + artifacts/audit.{json,md}
node tools/smoke.mjs         # lead's fast room tour with luminance readings
npm test                     # the scenario matrix, which writes its own evidence
```

---

## Graybox → final

The map was authored as data and built by `src/map/build.js` from the first commit, so there was
never a separate graybox mesh set to photograph; the graybox stage was the same builder running with
the material families unbuilt and the prop populator absent. The comparison below is therefore
**first playable frame → current frame** for each hero space, which captures the same transition.

| Space | Early state | Current | What changed |
| --- | --- | --- | --- |
| Open-plan floor | `artifacts/smoke/room-openoffice.png` (regenerate) | `artifacts/screenshots/audit-openoffice.jpg` | Ceiling went from a mottled camouflage pattern to fine fissured mineral fibre; cubicle fabric from a high-contrast gingham mesh to a low-contrast weave; carpet from near-black to a readable mid-tone; per-cubicle clutter added |
| Reception atrium | `artifacts/screenshots/audit-lobby.jpg` | `artifacts/screenshots/fable3-after-lobby.jpg` | Empty teal box → brand wall, directory, reception composition, seating nook, hanging banners, pendant cluster, atrium columns |
| First-person weapon | `artifacts/screenshots/fable4-weapon-before-office.png` | `artifacts/screenshots/fable4-weapon-after-office.png` | Unlit black silhouette filling the centre third → parkerised steel / matt polymer / anodised receiver framed in the lower-right sixth |
| HUD | `artifacts/smoke/vm-check.png` (regenerate) | `artifacts/screenshots/matrix-*-hud*.jpg` | Announcer drawn through the objective list and timer; four objectives clipped by the hostage chips → one current objective plus a count, full list on `Tab`, no overlap at three resolutions × three UI scales |

## Canonical matrix

`artifacts/screenshots/matrix-*.jpg` — 60 frames covering the full required flow: title, main menu,
settings, controls, difficulty, briefing (both floors), loadout, loading, spawn, each major room in
production lighting, ADS, firing, reloading, hostage secure, escort, extraction, pause, restart
confirmation, victory and defeat. Indexed with mean luminance and contrast in
`artifacts/screenshots/index.md` and `visual-matrix.md`.

## Room audit

`artifacts/screenshots/audit-*.jpg` — one frame per checkpoint (29 rooms), each row in
`artifacts/audit.md` carrying exposure, contrast, visible registered assets and a severity ranking.

## Asset acceptance views

`artifacts/screenshots/fable4-*.png` — the character and weapon acceptance set: three hostile
variants at 3 m / 10 m / 16 m / 20 m in lit, night and blackout scenarios; four head variants at
3 m; both hostages bound and secured; walk, aim, fire, reload, flinch and three death animations
mid- and end-frame; clipping close-ups; per-weapon framing in a bright and a dark room.

## Doorway and geometry evidence

`artifacts/screenshots/door-*.jpg` — both faces of four doorways plus a control, used to confirm the
head piece above each frame is continuous and that the aperture is cut where the doorway actually
is. These are the frames that caught the mirrored-aperture bug.

## Per-scenario evidence

Each Playwright spec writes a JSON state dump beside its screenshots in `artifacts/` —
`movement-wasd.json`, `weapons-reload.json`, `doors-walkthrough.json`, `mission-victory.json` and so
on — so a failure can be diagnosed from the recorded simulation state rather than from the image
alone.
