# Water physics + interaction, loop 2 (wphys2) — defect log

Focus: the float touchdown and the planing run (rubric 11 object-water interaction, 12 water impact response,
13 foam quality; hero targets 9.25). Views: `water-landing-firm` at fly 0.3 .. 4.0 s (touchdown at 0.33 s, on the
step from ~1.2 s), `plane-rear-quarter` (taxi), the 3 s clip 0.2 .. 3.2 s of `water-landing-firm`. Frame numbers
are 10 fps clip frames. Grid cells are 8x8 A-H (columns) / 1-8 (rows) of the 1280x720 frame.

Method per round: observe (stills, clip frames, the Node touchdown probe `/tmp/wphys2/tdprobe.mjs` and the Node
flight harness `/tmp/wphys2/flightnode.mjs`, both driving the bundled `FlightModel` on the real height field and
CPU wave field) -> name the strongest giveaway -> diagnose -> implement -> stress (firm / soft / harness landing,
takeoff run) -> compare at the same camera, seed and sim time -> score -> log. Anti-cheating: no credit for more
particles or brighter foam; credit only for displaced water, sheets instead of lines, attitude changes, foam with
structure.

Starting point: the lead's `332c0ed2` with the previous water-physics loop merged (three wake maps, the signed
height map displacing a near water patch, continuous hull displacement, Kelvin arms, lit instanced spray, the
ditching matrix). Critic h03 visual-2 scores: 11: 3, 12: 3.5, 13: 3.5.

## Round 1 — baseline: what the numbers say the touchdown was

Harness (Node, `flightnode_base.json`): allPass, deterministic; water landing touchdown 1.41 m/s, 1 bounce,
takeoff into wind 19.97 s, liftoff 31.95 m/s.

Touchdown probe of the baseline planing law (`tdprobe_firm.txt`, `water-landing-firm`: 28 m/s, -3 deg, 3.2 m/s
of sink at the keels' touch):

| t (s) | y | pitch | step draft | stern draft | bow draft |
|---|---|---|---|---|---|
| 0.33 touch | 2.20 | -3.2 | 0.03 | -0.40 | 0.00 |
| 0.60 | 1.91 | -0.2 | 0.35 | 0.03 | 0.16 |
| 0.90 skip | 2.27 | 3.6 | -0.02 | -0.16 | -0.42 |
| 1.60 | 2.06 | 5.9 | 0.19 | 0.11 | -0.28 |
| 3.10 | 2.07 | 6.7 | 0.16 | 0.14 | -0.29 |
| 5.80 | 2.05 | 7.2 | 0.19 | 0.17 | -0.33 |

1. **The aircraft never got onto the step.** After the skip it settled at 7 deg of pitch with the step 15-20 cm
   and the *sterns* 15-20 cm under: the whole afterbody keel (which rises 7.3 deg in the hull frame) lay level in
   the water. The planing lift was one fixed station at x +0.7 / 7 cm under the keel with a `55 V^2 (d/0.5) trim`
   law: at 24 m/s it carried 4.5 kN a float on 9 cm of station depth, so the hull had to ride deep to be carried
   and the lift, acting a metre ahead of the CG, held the nose up while the afterbody dragged. The critic's "level
   attitude at touchdown, on the step and taxiing" was the visible half of this; the other half was that nothing
   in the picture changed between the touchdown, the step and the taxi because the hull's attitude and draft did
   not.
2. **Spray as lines** (critic and user): the instanced spray drew a fanned-filament sheet tile and the emission
   pattern of two symmetric fans; even torn, filaments are lines. Nothing in the picture was a continuous film.
3. **The surface under the floats was undisturbed** in the touchdown frames: the wake ribbon knew only the
   speed, so a float driven 35 cm under at 3 m/s of sink drew the same surface as one skimming at 8 cm; the
   height field carried a bow hump and a chine dip sized for the running draft only.

## Round 2 — the hull's attitude: a planing law that trims onto the step

Diagnosis: a single fixed lift station cannot give a planing hull's pitch stability (the lift must move forward
as the hull trims down and wets more forebody) and a `V^2 d` law has no trim dependence worth the name.

Implemented (`physics.ts`, planing stations moved to the step keel, x -0.2):
- Savitsky's lift: `C_L0 = tau^1.1 (0.012 sqrt(lambda) + 0.0055 lambda^2.5 / Cv^2)` on beam^2, less the deadrise
  correction `0.0065 beta C_L0^0.6` (beta 22 deg); `tau` = body pitch + the forebody keel's 3.5 deg, capped at
  9 deg; `lambda` = wetted keel length / beam from the keel draft at the step over tan(tau).
- The force acts at the pressure centre, 62 % of the wetted length ahead of the step (`cpK`), computed per step
  and applied there (`cpApply`), so a hull trimming down moves its lift forward and picks the nose up.
- Effective trim includes the flight path's angle into the surface (`atan(sink / V)`): the water-impact lift that
  arrests the sink and fades as it does (3 m/s at 28 m/s adds 6 deg).
- Chines-dry wetted planform: the lift and its added-mass damping carry `wf (0.5 + 0.5 wf)`, `wf` = keel draft /
  0.135 (the chine depth at the step), so the keel's first touch carries nothing and the force builds with the
  draft. Without it (r2a) the harness's 28 m/s / 8 deg touchdown met a 15 kN step per float at the first
  millimetre and skipped three times (`waterBounces` 3, FAIL).
- Induced drag `lift x tan(tau)` plus a spray-drag term at the keel; the full Savitsky friction `1.3 V^2 lambda`
  there tipped a nose-down slam into the bow-scoop nose-over and was dropped (r2b).

Sweeps (`sweep.mjs`, firm and soft bench landings; `flightnode.mjs` with `PLANING=` overrides):

| set | firm: bounces / max pitch / max step draft | on the step @4 s: pitch / step / stern / bow | harness bounces | takeoff s / liftoff m/s |
|---|---|---|---|---|
| liftK 1.0 dampK 120 cpK 0.72 (no planform) | 1 / 6.5 / 0.31 | 2.9 / 0.09 / -0.09 / -0.23 | 3 | - |
| liftK 1.2 dampK 80 cpK 0.62 (no planform) | 1 / 4.5 / 0.31 | 2.0 / 0.07 / -0.14 / -0.18 | 3 | 19.9 / 30.42 |
| **liftK 1.2 dampK 80 cpK 0.62 deepK 0.5 + planform** | **1 / 4.6 / 0.35** | **3.8 / 0.11 / -0.03 / -0.27** | **1** | **21.4 / 31.7** |
| liftK 1.4 cpK 0.7 + planform | 1 / 7.7 / 0.31 | 4.2 / 0.11 / -0.02 / -0.28 | - | - |

Touchdown probe after (`water-landing-firm`, same entry):

| t (s) | y | pitch | step draft | stern draft | bow draft |
|---|---|---|---|---|---|
| 0.33 touch | 2.20 | -3.2 | 0.03 | -0.40 | 0.01 |
| 0.50 | 1.94 | -1.4 | 0.27-0.31 | -0.01 | 0.20 |
| 0.70 | 2.01 | 0.2 | 0.21 | 0.00 | 0.06 |
| 1.10 rebound | 2.27 | 2.4 | -0.05 | -0.27 | -0.30 |
| 1.60 on the step | 2.19 | 3.4 | 0.05 | -0.10 | -0.29 |
| 3.00 | 2.15 | 2.7 | 0.07 | -0.08 | -0.22 |

The keels touch, the steps drive 30 cm under with the bows 20 cm in and the sterns kissing, the nose comes up
through level to 3.5 deg in 1.2 s with one rebound, then the hull rides on the step keel alone (3-12 cm) with the
bows 25-30 cm and the sterns 8-10 cm clear. Harness: 19/19 physics checks PASS, deterministic (touchdown sink
1.26, bounces 1, takeoff 21.4 s / 31.7 m/s, tailwind liftoff 31.34). The takeoff run now shows 4 (headwind) /
8 (tailwind) one-to-three-frame skips at 27-30 m/s where the wing carries nearly everything and the keels kiss
the wave crests (the baseline, riding deep, had 0); not a harness check, and the kind of skimming a floatplane
does just before it flies.
