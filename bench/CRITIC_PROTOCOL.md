# Critic protocol

Every benchmark round runs three independent visual critics and one technical critic. Critics never see
one another's scores. Each critic receives:

- the reference image `bench/reference/reference_a.png` and its measurements `bench/reference/reference_a.json`;
- the captured frames of the round under `bench/out/<tag>/<view>/` (`still.png`, `still_grid.png` with the
  8×8 grid A1–H8, `flight.png`, `crops/*.png`, `clip.mp4` where present) and `metrics.json`;
- the rubric `bench/rubric.json` (27 categories, 0–10 anchors, critical/ordinary targets).

## Rules

1. Score every category for every frame you are given. Never write "looks better" or "quality improved":
   name the measured property, the region (grid cell or crop id), the test condition, the numeric score,
   one sentence of evidence, one sentence naming the exact defect (if any), one sentence naming the exact
   fix, and whether the defect is a hard failure.
2. Review every visible region of every frame, not only the airplane. Sky, clouds, horizon haze, water
   foreground, reflections, wakes, beaches, islands, vegetation, bridges, roads, boats, buildings,
   skyline, lighting, shadows, HUD and animated objects each get inspected.
3. A 10 requires an explanation of why the component passes every named test. A 9 requires that the
   difference from the reference needs focused inspection. Anything a player sees in ordinary play is 8 or
   below.
4. Hard failures (any of): stretched primitives, intersecting parts, silhouette changes between LODs,
   paper-thin or floating geometry, uniform roughness across a whole object, opaque/flickering/mis-sorted
   glass, water that reads as a flat blue plane or tiles visibly, hard horizon seam, uniform foam rings,
   floating shores, clone buildings/trees, synchronized wind, evenly spaced objects, bridges whose
   supports miss the water, roads that float or terminate randomly, popping, shimmer, detached shadows,
   frozen or wrong reflections, HUD blocking the reference composition, streaming stutter.
5. Output machine-readable JSON (schema below) followed by a short prose summary listing the three
   details that most damage realism and the three strongest details per frame.

## Output schema

```json
{
  "critic": "visual-1 | visual-2 | visual-3 | technical",
  "tag": "<round tag>",
  "frames": {
    "<view>": {
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
by more than 2, a disagreement-review agent inspects the same evidence and explains the disagreement. The
component score is the median of its criterion scores; a component fails if any critical criterion is
below 9.0, any ordinary criterion is below 8.5, any critic reports a hard artifact, another component
regressed, the FPS gate fails, or the component only works from one angle or one lighting condition.
