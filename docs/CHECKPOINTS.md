# Screenshot checkpoint manifest

Twenty-nine named moments the automated visual tour must capture. The machine-readable source is
`src/qa/checkpoints.ts`; this file is the human-readable mirror.

For each checkpoint the tour:

1. calls `window.__starfall.renderAt(time)` to render one deterministic frame,
2. verifies the chapter, camera shot and active scene are the expected ones, and that under 30% of
   the frame is blown out — this one applies everywhere, not only where a brightness assertion is
   listed,
3. evaluates the listed assertions against measured screen coverage, frame luminance, subtitle
   text, bolt activity and particle usage,
4. runs the full runtime sanity sweep at that instant,
5. writes `qa/screenshots/<id>.png`.

Assertion vocabulary:

| Assertion | Meaning |
| --- | --- |
| `visible(target, f)` | The subject's projected bounds cover at least `f` of the viewport and it is in front of the camera. Bounds are clipped to the near plane first, so a subject straddling the lens is not counted as filling the frame |
| `onScreen(target)` | Some part of the subject is inside the frustum |
| `brightness(min, max)` | Mean frame luminance is inside the range |
| `subtitle(text)` | The visible caption contains that text |
| `boltsActive(n)` | At least `n` energy bolts are genuinely in flight |
| `particlesActive(n)` | At least `n` particles have been emitted for this moment |
| `noIssues` | The runtime sanity sweep reports no errors |

| # | Id | Time | Chapter | Shot | Scene | Expected in frame | Assertions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `01-prologue-open` | 7.5 | prologue | pro-1 | space | Golden prologue typography, starfield | brightness(0.008, 0.35), subtitle("civil war"), noIssues |
| 2 | `02-prologue-final-line` | 39.5 | prologue | pro-1 | space | Final prologue card, starfield | brightness(0.008), noIssues |
| 3 | `03-tatooine-establish` | 54 | tatooine | tat-1 | space | Tatooine limb, atmospheric haze, stars | onScreen(tatooine), brightness(0.05), noIssues |
| 4 | `04-tatooine-corvette` | 80 | tatooine | tat-2 | space | Blockade runner distant, planet below | visible(runner, 0.0008), noIssues |
| 5 | `05-pursuit-tracking` | 92 | pursuit | pur-1 | space | Corvette large, engine glow | visible(runner, 0.01), noIssues |
| 6 | `06-destroyer-reveal` | 112 | pursuit | pur-2 | space | Destroyer bow entering frame, corvette small below | onScreen(destroyer), onScreen(runner), noIssues |
| 7 | `07-under-the-hull` | 126 | pursuit | pur-3 | space | Destroyer underside filling frame, turbolaser fire | visible(destroyer, 0.2), noIssues |
| 8 | `08-battle-profile` | 139 | pursuit | pur-4 | space | Both ships in profile, bolts in flight | onScreen(destroyer), onScreen(runner), boltsActive(1), noIssues |
| 9 | `09-corvette-hit` | 149 | pursuit | pur-5 | space | Corvette taking hits, sparks and smoke | visible(runner, 0.02), noIssues |
| 10 | `10-engines-dead` | 155 | pursuit | pur-6 | space | Engine block blown out, debris | visible(runner, 0.01), noIssues |
| 11 | `11-capture-two-shot` | 165 | capture | cap-1 | space | Destroyer above, corvette below, tractor beam | onScreen(destroyer), onScreen(runner), noIssues |
| 12 | `12-umbilical` | 191 | capture | cap-3 | space | Boarding umbilical, corvette dorsal hull | visible(runner, 0.05), noIssues |
| 13 | `13-corridor-establish` | 200 | corridor | cor-1 | interior | White corridor, defenders moving up, red alarm | brightness(0.06), visible(rebel-0), noIssues |
| 14 | `14-defenders-ready` | 212 | corridor | cor-2 | interior | Rebels aiming at the door, charge glowing | visible(rebel-1), noIssues |
| 15 | `15-door-breach` | 219.1 | corridor | cor-3 | interior | Door blown inward, smoke, debris, hard flash | brightness(0.08), particlesActive(20), noIssues |
| 16 | `16-firefight` | 224.5 | corridor | cor-4 | interior | Stormtroopers advancing, blaster bolts | visible(trooper-0), boltsActive(1), noIssues |
| 17 | `17-line-breaks` | 232 | corridor | cor-5 | interior | Fallen defenders, smoke | noIssues |
| 18 | `18-vader-entrance` | 248 | corridor | cor-7 | interior | Vader silhouette, red rim, troopers aside | visible(vader, 0.01), brightness(0.03), noIssues |
| 19 | `19-vader-advance` | 258 | corridor | cor-8 | interior | Vader walking the corridor, troopers flanking | visible(vader, 0.01), noIssues |
| 20 | `20-leia-console` | 276 | plans | pln-2 | interior | Leia at the archive console, projection booting | visible(leia, 0.01), noIssues |
| 21 | `21-plans-projection` | 284 | plans | pln-3 | interior | Glowing station schematic, Leia | visible(plans), noIssues |
| 22 | `22-transfer` | 293 | plans | pln-4 | interior | Leia kneeling by R2, transfer beam, lit data port | visible(r2, 0.004), visible(leia), noIssues |
| 23 | `23-droids-run` | 310 | escape | esc-1 | interior | Astromech rolling aft, protocol droid following | visible(r2), noIssues |
| 24 | `24-threepio-hesitates` | 316 | escape | esc-2 | interior | Protocol droid at the pod hatch, astromech boarding | visible(threepio, 0.004), noIssues |
| 25 | `25-pod-separation` | 325.5 | escape | esc-3 | space | Pod leaving the corvette, thruster flare | visible(pod, 0.0015), brightness(0.02, 0.5), noIssues |
| 26 | `26-pod-falling` | 334 | escape | esc-4 | space | Pod falling away, both ships above, planet below | onScreen(pod), noIssues |
| 27 | `27-descent` | 348 | escape | esc-5 | space | Pod against the desert, atmosphere | onScreen(pod), brightness(0.05), noIssues |
| 28 | `28-epilogue-entry` | 360 | epilogue | epi-1 | space | Pod as a bright point entering atmosphere | brightness(0.04), noIssues |
| 29 | `29-epilogue-ships` | 374 | epilogue | epi-2 | space | Destroyer and captured corvette overhead, closing line | onScreen(destroyer), noIssues |

## Running the tour

```bash
npm run qa                                  # dev server, medium quality, 1920x1080
npm run qa -- --width 1280 --height 720     # faster iteration
npm run qa -- --controls                    # plus the full interface exercise
npm run qa -- --only 06,15,18                # a subset, by id prefix
npm run qa -- --times 112,219.1              # ad-hoc timestamps, no assertions
npm run qa:build                             # build first, then tour the production bundle
```

Results land in `qa/report.json` and `qa/screenshots/`. Exit code is non-zero if any checkpoint
fails, any console error is recorded, or any page exception is thrown.
