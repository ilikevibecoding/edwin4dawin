# SPECIALIST NOTES — Missile Visual Quality (threats.js + interceptors.js)

Owner: missile visual quality specialist.
Files modified: `src/threats.js`, `src/interceptors.js` (visuals only — no guidance/fuzing/physics/spawn/API changes).
Probe tool added (test-only, not shipped): `tools/probe_missiles.mjs`. Screenshots in `shots_missiles/` (loop-numbered).

## Loops run: 9

- **Loop 1 — Threat rewrite.** Replaced cone+cylinder with a lathe-profile reentry vehicle: flared skirt, boat-tail base, ring frames. Procedural canvas albedo (carbon-carbon weave, panel lines, ablation streaks running nose→aft) + emissive map (nose stagnation glow, streak heating, base recirculation). Decoy became a slim biconic foil replica (gore seams, brushed metal, high metalness) that tumbles end-over-end. Added additive bow-shock sheath cone that fades in with reentry heat, camera-distance-scaled glow sprite, and a normal-blended dark "distant object" speck so the RV reads on a bright sky where additive glow cannot.
- **Loop 2 — Interceptor rewrite.** Three distinct airframes built by lathe + merged fin/strake/raceway geometry (≤3 draw calls each): Rampart PX-4 (slim canard dart), Halberd HA-9 (mid-size single-stage), Sentinel LR-1 (two-stage with interstage flare). Procedural airframe textures: paint base, panel lines, ring frames, raceway conduit, roll patterns, stencils ("RAMPART PX-4", "HALBERD HA-9", "SENTINEL LR-1", tail codes). Exhaust plume mesh with mach-diamond texture, phase-driven flare (boost flicker vs sustainer wisp vs terminal ACM pulse).
- **Loop 3 — Readability pass.** Brightened RV texture contrast; enlarged stencils; shaped boost plume into a directed jet instead of a ball; `fog: false` on glow/flame sprites so km-range cues survive haze; fixed perf measurement to a representative ground view (the earlier 622-call reading was an aerial debug camera artifact).
- **Loop 4 — Plume/flame balance.** Tightened plume opacity/emissive balance so the airframe isn't swallowed at launch; tuned flame sprite near-fade so close-ups show the nozzle, not a billboard.
- **Loop 5 — PBR + distance cues.** RV: roughness 0.45 / metalness 0.3 / envMapIntensity 1.8 so shadow sides keep detail under IBL. Distant dot scale/opacity up (reads at 2+ km). Decoy night soak reduced (was washing out gore seams). Glow sprite scale curve raised for km-range.
- **Loop 6 — Differentiation + mach diamonds.** RV albedo brightened (`#585149`), weave/streak contrast up. Halberd recolored away from Rampart-white. Plume texture reworked: thin shock-cell waist line + bright axisymmetric diamond knots drawn after the core so additive blending keeps them visible. Probe gained atomic closure framing + kill shots.
- **Loop 7 — Terminal plasma + sustainer.** RV terminal plasma trail warmer/tighter (0xffcf92, life 0.7, width 2.4) — reads as incandescent streak, not pink smoke. Halberd base brightened to sage-khaki `#aaa78e` with dark bands. Sustainer flare opacity raised (0.34→0.42) so midcourse interceptors keep a motor cue.
- **Loop 8 — Shadow-side fix.** Interceptor body materials got envMapIntensity 1.5 (was 1.0) — diffuse IBL lift keeps paint/stencil detail readable on the unlit side (this was the Halberd's remaining weakness).
- **Loop 9 — Decoy night polish.** Carved gore seams + ring frames out of the decoy's emissive soak (destination-out at texture build time) so the self-lit foil stays structured at night instead of reading as a featureless glow-stick. Verified no regressions across the full shot list.

## Final self-scores (rubric)

- Silhouette & proportions: **9** — tapered RV with flared skirt vs three visibly different hit-to-kill darts; decoy biconic clearly "wrong" next to a warhead.
- Surface detail: **8.5** — ring frames, raceways, stencils, roll patterns, ablation streaks and scorched nose all readable at <80 m.
- Lighting response: **8.5** — day/sunset/night all verified; envMapIntensity tuning keeps shadow sides alive; decoy glints as bare metal.
- Motion cues: **9** — boost flicker vs sustainer wisp vs terminal ACM pulse; RV heat glow + bow shock + plasma streak ramp with speed/altitude; decoys tumble distinctly with a dimmer, shorter trail.
- Distance readability: **8.5** — long dusty contrail + heat glow + dark speck reads at 2–8 km. Weakest single case: a distant dot aimed almost directly into the sun gets bloom-washed (see requests).

## Performance

- Budget: <420 scene draw calls. Final numbers (SwiftShader probe, 1280×720):
  - Engagement, ground view: **229 calls / 222k tris**.
  - Post-engagement: **185 calls / 168k tris** (early-loop reference was 182 — net +3 calls for the full visual rewrite).
- Frame time constant across loops (25.6 ms under software rasterizer — GPU-bound cost unchanged). Each missile is ≤3 draw calls for the body group + 2 sprites; all geometry/textures built once at pool construction; zero per-frame allocations (reused scratch vectors); all sim-path randomness uses `ctx.vrng`.

## Best screenshots

- `shots_missiles/loop9_interceptor_boost_pad.png` — Sentinel LR-1 off the rail: stencils, roll bands, launch plume.
- `shots_missiles/loop9_interceptor_midcourse_close.png` — midcourse close-up: paint detail + sustainer wisp.
- `shots_missiles/loop9_threat_terminal_dive.png` — RV terminal dive: heat-soaked body, incandescent streak.
- `shots_missiles/loop9_threat_close_sunset.png` — RV silhouette + bow wake at sunset.
- `shots_missiles/loop9_interceptor_boost_night.png` — night launch lighting the pad.

## Requests for other module owners

1. **Post-processing owner (bloom):** a small dark speck near the sun disc gets fully bloom-washed; a slightly higher bloom threshold (or radial sun-glare falloff) would let the distant-threat dot survive that one worst case. HUD track markers already mitigate it.
2. **Lighting/environment owner:** night ambient/IBL is very low; I compensated with per-missile envMapIntensity, but a touch more moonlit ambient would benefit every unlit airframe (and let me dial emissive floors back down).
3. **effects.js owner (optional):** per-emit color on ribbon trails would let a single trail cool white→orange→gray downstream; I currently layer a second short plasma trail to fake it (works, costs one extra trail slot per threat).
