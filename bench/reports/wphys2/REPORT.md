# Water physics + interaction, loop 2 (wphys2) — report

Subsystem: the float touchdown and the planing run (rubric 11 object-water interaction, 12 water impact response,
13 foam quality). Owned files: `src/render/wakes.ts`, `src/plane/effects.ts`, the wake block and height-patch
vertex code of `src/world/water.ts` (not touched this loop), and the hydrodynamic attitude terms of
`src/plane/physics.ts`. Branch `cursor/wphys2-loop-8213`, from the lead's `332c0ed2` with the previous
water-physics loop merged. Round-by-round observations, diagnoses and numbers are in `DEFECTS.md` beside this file.

## The problem to close

Critic h03 (visual-2) on the previous loop's work: "zero displaced water, spray drawn as thin semi-opaque white
streamer fans that read as air-flow lines, the aircraft level with float sterns buried instead of nose-up on the
step; at rest and taxiing the floats show no wet band, meniscus or wake" (11: 3, 12: 3.5, 13: 3.5). The user: "it
looks like just air flow around it, lines of white"; "the water should go around the plane, it should be buoyant,
it should bounce".

The Node probes of the baseline explained the attitude half of it before a frame was shot: after the firm
touchdown the aircraft settled at 7 deg of pitch with the sterns 15-20 cm under (the afterbody lying level in the
water), because the planing lift was one fixed station a metre ahead of the CG with a `V^2 x depth` law that
needed 20 cm of draft to carry the aircraft. Nothing about the hull's attitude or draft changed between the
touchdown, the step and the taxi, so nothing in the water could either.

## What changed

### Attitude (physics.ts, planing stations only)

Savitsky's planing law replaces the fixed station: `C_L0 = tau^1.1 (0.012 sqrt(lambda) + 0.0055 lambda^2.5 /
Cv^2)` on beam^2 less the deadrise correction, with the wetted length from the keel draft at the step over
tan(trim), the force applied at the pressure centre 62 % of the wetted length ahead of the step (so a hull that
trims down wets more forebody and its lift moves forward: the planing hull's pitch stability), the effective trim
including the flight path's angle into the surface (the water-impact lift that arrests the sink and fades as it
does), and the lift and its added-mass damping scaled by the wetted planform of a V-bottom (a triangle from the
spray root to the step until the chines are under), so the keel's first touch carries nothing and the force
builds with the draft.

Firm touchdown (28 m/s, -3 deg, 3.2 m/s of sink): the steps drive 30 cm under with the bows 20 cm in and the
sterns kissing; the nose comes up through level to 3.5 deg in 1.2 s with one rebound; then the hull rides on the
step keel alone (3-12 cm) with the bows 25-30 cm and the sterns 8-10 cm clear. At full power in the takeoff run
the hull trims 6-8 deg with the elevator near neutral. Flight harness: 19/19 physics checks pass in Node,
deterministic (touchdown sink 1.26 m/s, bounces 1, takeoff 21.4 s, liftoff 31.7 m/s).

### Spray (effects.ts)

A `SpraySheet` mesh per chine (four): a continuous film emitted one column per 1/30 s while the chine runs in the
water, its root on the hull's real deep-V bottom at the piled-up waterline (Wagner's pile-up, x1.4; at the chine
and the spray rail once the hull is deep enough), launched along the bottom's tangent (40 deg off the V, 18 deg
off the rail) at about a fifth of the hull's speed plus the wedge jet of a sinking hull, and drawn as the ballistic
flight of those samples through the water's frame: a swept fan that hangs behind the hull, arching out and down.
Lit by the standard pipeline (alpha tested, roughness from glassy at the whole root to matte where torn), a
coverage shader that keeps the root whole and tears the film into ligaments and holes with age, keyed by the
column's emission time so the tears travel with the water, and a depth material of the same coverage so the
sheet casts its ragged shadow on the water. The index buffer is rebuilt per frame so no quad spans an emission gap
(a skip). The instanced spray keeps the droplets and mist; its sheet tile is a torn veil, not fanned filaments.

### Foam and displacement (wakes.ts)

The wake ribbons carry each float's draft and sink rate, per point at the moment it was laid (a lane laid by a
hull driven deep at touchdown keeps its marks after the hull has risen). The foam shader builds the planing
structure from them: spray roots along the chines from the stagnation line to the step, a glassy hollow behind
the step, the rooster tail where the flows close, the spray landing band outboard; the height shader deepens the
chine dip and hollow, raises the rooster tail and adds the pile-up ridge along the wetted forebody, so the
surface under the floats is carved rather than painted. A hull below ~2 m/s radiates millimetre rest ripples from
its waterline in the height field.

## Round table

(filled in as the rounds are shot; see DEFECTS.md)

## Residual defects

(filled in at the end)

## Flight harness

Node: `/tmp/wphys2/flightnode.mjs` (the page suite line for line, minus the camera checks): 19/19 PASS,
deterministic. Page: `node bench/scripts/flighttest.mjs http://127.0.0.1:4551/ /tmp/wphys2/flight.json`
(result recorded at the end).
