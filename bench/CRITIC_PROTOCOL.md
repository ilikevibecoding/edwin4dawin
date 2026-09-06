# Critic protocol (rubric v2, 30 categories)

Every benchmark round runs three independent visual critics and one technical critic. Critics never see
one another's scores. Each critic receives:

- the reference image `bench/reference/reference_a.png` and its measurements `bench/reference/reference_a.json`;
- the captured frames of the round under `bench/out/<tag>/<view>/` (`still.png`, `still_grid.png` with the
  8×8 grid A1–H8, `flight.png`, `crops/*.png`, `clip.mp4` where present) and `metrics.json`;
- the rubric `bench/rubric.json` (30 categories, 0–10 anchors, hero/ordinary targets, merge gate). The
  previous 27-category rubric is kept as `bench/rubric_v1.json` for rounds iter01–iter09.

## The question every critic answers first

> Why does this still look like a game or demo instead of a high-budget production asset?

Answer it per frame before scoring, then score.

## Rules

1. Score every category for every frame you are given. Never write "looks better" or "quality improved":
   name the measured property, the region (grid cell or crop id), the test condition, the numeric score,
   one sentence of evidence, one sentence naming the exact defect (if any), one sentence naming the exact
   fix, and whether the defect is a hard failure.
2. Review every visible region of every frame, not only the airplane. Sky, clouds, horizon haze, water
   foreground, reflections, wakes, beaches, islands, vegetation, bridges, roads, boats, buildings,
   skyline, lighting, shadows, HUD and animated objects each get inspected.
3. A 10 requires an explanation of why the component passes every named test. A 9 requires that the
   difference from a production asset needs focused inspection, and the critic must name that difference.
   Anything a player sees in ordinary play is 8 or below.
4. Anti-cheating: a score may not rise because lighting got brighter, saturation or bloom increased, more
   particles or objects were added, texture resolution or polygon count increased, camera shake or motion
   blur increased. A score rises only when a previously named visible or physical defect is reduced; say
   which one.
5. Hard failures (any of): stretched primitives, intersecting parts, silhouette changes between LODs,
   paper-thin or floating geometry, uniform roughness across a whole object, opaque/flickering/mis-sorted
   glass, water that reads as a flat blue plane or tiles visibly, hard horizon seam, uniform foam rings or
   opaque white wake streaks, floating shores, clone buildings/trees, synchronized wind, evenly spaced
   objects, bridges whose supports miss the water, roads that float or terminate randomly, popping,
   shimmer, detached shadows, frozen or wrong reflections, brown/glazed sun reflection on water, flat
   opaque cloud bases, HUD blocking the reference composition, streaming stutter.
6. Output machine-readable JSON (schema below) followed by a short prose summary listing the three
   details that most damage realism and the three strongest details per frame.

## Self-play review (implementers, after every pass)

Before handing work to the critics, answer as a hostile professional reviewer:

1. What immediately gives away that this is not AAA?
2. Which asset looks cheapest?
3. Which material looks synthetic?
4. Which object appears weightless?
5. Which interaction violates physics most obviously?
6. Where is repetition visible?
7. Where does geometry look procedural?
8. Where does scale feel wrong?
9. Where does lighting expose weak geometry?
10. Which improvement would create the greatest increase in perceived realism?

Then implement the most important answer and repeat. Keep a concise defect log per round.

## Test matrices

Never judge from one still. Each gauntlet captures the states below that apply to it.

- Camera: cockpit, chase, low/medium/high altitude, toward and away from the skyline, parallel to the
  beach, straight down, toward the horizon, toward and away from the sun, boat level, shoreline, highway level.
- Water: stationary/slow/medium/fast boat, sharp turn, stopping, reversing, hitting shore; aircraft wheel
  touch, belly landing, wingtip strike, full-speed crash; floating and sinking objects; several movers.
- Aircraft: engine off, idle, low and full throttle, taxi, takeoff, climb, bank, hard bank, stall,
  recovery, landing, hard landing, water contact, crash.
- City: 2 km, 1 km, 500 m, 200 m, 100 m, street level — each distance must reveal a new detail layer.

## Output schema

```json
{
  "critic": "visual-1 | visual-2 | visual-3 | technical",
  "tag": "<round tag>",
  "frames": {
    "<view>": {
      "giveaway": "one sentence: the strongest cue that this is not a production title",
      "scores": { "<category id>": <0-10>, ... },
      "entries": [
        { "category": <id>, "score": <0-10>, "cells": "C4-E6", "condition": "...", "evidence": "...", "defect": "...", "fix": "...", "hardFailure": false, "kind": "visual|technical|performance|architectural" }
      ],
      "worst3": ["...", "...", "..."],
      "best3": ["...", "...", "..."]
    }
  }
}
```

The lead aggregates with the median per criterion. When the highest and lowest score for a criterion differ
by more than 2, a disagreement-review agent inspects the same evidence and explains the disagreement.

## Merge gate

A pass is accepted only when the mean of the category medians is >= 9.0, no category is below 8.0, and
every hero category (marked `critical` in the rubric: aircraft silhouette, aircraft geometry, propeller,
cockpit and pilot, aircraft materials, water wave physics, object-water interaction, water crash response,
boat wakes, city skyline, building geometry, lighting/exposure, water reflections) is >= 9.25. A hero
score of 9.5 or more must come with an explanation of why almost no major deficiency remains. A component
also fails if any critic reports a hard artifact, another component regressed, the performance budget
fails, or the component only works from one angle or one lighting condition.
