# acgeo — Aircraft geometry + materials gauntlet: defect log

Branch `cursor/acgeo-loop-8213`, worktree `/home/ubuntu/wt-acgeo`. Preview ports: **4543 working, 4544 baseline**
(the assigned 4541 was already bound by another builder's `clouds4-var-4541` session when this loop started).
Captures: `bench/reports/acgeo/tools/views.py <port> <outdir>` writes the shot spec (3 canonical aircraft views +
dev close-ups posed in the body frame: nose, wingtip, tail, rig, door, chase30, below, tailon, noseon);
`tools/acshots.mjs` shoots it from one Chrome instance and dumps the PlaneModel triangle / mesh table.

Scores are self-scores on rubric v2 categories 1 (silhouette), 2 (geometry), 3 (nose/cowling), 5 (wings/control
surfaces), 7 (materials). Baseline medians from the critics: 7 / 5 / 4 / 5 / 5.

## R0 — baseline observation (critic reports iter10 visual-1, h03 visual-2; own r0 stills)

Strongest giveaways, ranked by what they cost at 20–200 m:
1. Nose: the loft closes to a 30 cm flat-capped point behind the spinner — a black cylinder with a chrome cone,
   no inlet, no engine, no exhaust (front quarter B4–C5).
2. Wing and stabiliser read as planks: 11 % / 12 % sections on a 1.95 m chord with a 14 mm trailing edge at the
   root, no visible leading-edge radius from the chase camera.
3. Control surfaces: flap / aileron / elevator / rudder notches are there but the hinge faces are flat plank ends
   with no rolled nose and no dark slot; no trim tabs, no hinge fairings.
4. Materials: every painted surface has the same clear-coat sheen; the cowl is uniform charcoal; no metalness
   anywhere on the fuselage; wear only as faint roughness dots.
5. No door seam in the geometry (a painted outline only), no door handle in 3D, no static wicks, no water-rudder
   cables, no float hatches, cleats are boxes.

## R1 — wing and stabiliser section (plank → airfoil)

- Wrong: 11 % wing / 12 % stabiliser, 14 mm root TE (`te` default 0.0035 × chord); plank silhouette from every
  chase view; tip light patches placed on the chord line (would sink into a thicker wing).
- Changed: `parts/wing.ts` wingSpec thickness 0.11 → 0.15, camber 0.02 → 0.025, te 0.002 (8 mm root TE), chord
  grid 16 → 18 points; `parts/tail.ts` stabiliser 0.12 → 0.13, TE 4 → 3 mm/m; `parts/lights.ts` tip patches on
  the actual upper / lower skin (`wingUpperY` / `wingLowerY`).
- Why: a bush-plane wing carries a 16 % section (DHC-2: NACA 64A416 root); the depth is what the eye reads at
  30 m — the leading edge catches a highlight band and the underside has a real shadow.
- Result / score: see R2 stills (R1 and R2 were shot in one build).

## R2 — radial-engine cowl (black flat-cylinder with a chrome cone → nose bowl, inlet, engine, scoops, flaps, exhaust)

- Wrong: flat-capped loft nose; painted-on louvres; a white box for the intake; two loose stubs for the exhaust.
- Changed (`parts/fuselage.ts`, `geometry/loft.ts` `revolveGeometry`, `geometry/util.ts` `flatUv`,
  `textures/fuselage.ts`, `parts/materials.ts`, `textures/common.ts` SURF):
  - loft stations re-cut: the nose is a near-cylinder r 0.71 rounding forward into a bowl that stops at x 4.50,
    r 0.55, open; a revolved lip rolls into an annular inlet of r 0.4225 around the hub barrel (r 0.29);
  - behind the inlet, one revolved profile gives the nose case, the baffle plate and the duct interior; nine
    cylinders with rocker boxes and pushrod tubes and the ignition harness ring sit in front of the baffle (R-985
    layout, #1 upright), their outer ends hidden by the lip as on the real cowl;
  - carburettor scoop under the bowl and oil-cooler scoop on the anti-glare panel as lofted hoods with dark mouths;
  - two cowl flaps at the cowl's trailing edge, hinged forward, trailing edges lifted 45 mm over dark openings;
  - exhaust: one tailpipe leaving the lower starboard cowl ahead of the firewall seam, elbow, flared mouth with a
    soot-black bore near the smoke hardpoint, stainless heat shield 3 cm off the skin;
  - texture: bare polished-aluminium bowl (metalness 1, roughness 0.30 with brush streaks, no clear coat) through a
    packed clear-coat / roughness / metalness map on the paint material; Dzus fastener ring at the bowl joint and
    fastener rows along the upper / lower cowl panel joints on both sides.
- Why: every element is on a real R-985 Beaver cowl; the open inlet with the engine visible inside is what makes a
  radial nose read as an engine instead of a cap.
- Result / score: pending stills.
