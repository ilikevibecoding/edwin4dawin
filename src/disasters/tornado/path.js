// Deterministic tornado track: the funnel position is a pure function of the simulation tick, the
// parameters and a handful of numbers drawn from the seeded RNG when the tornado is created.
//
// Heading convention (degrees, clockwise when viewed from above, same as a compass):
//   0 = north (-z), 90 = east (+x), 180 = south (+z), 270 = west (-x).
// Direction vector: (sin h, -cos h). The lateral wobble is a sum of two sinusoids whose amplitude scales
// with `wander` (0..1 -> 0..10 blocks) so the track meanders like a real tornado instead of a ruler line.
import { TICK_DT } from '../../constants.js';

const WOBBLE_AMPLITUDE = 10; // blocks at wander = 1

export class TornadoPath {
  constructor(params, rng) {
    this.speed = params.speed;
    this.wander = params.wander;
    // phases / frequencies drawn once from the disaster RNG (deterministic per seed)
    this.f1 = (Math.PI * 2) / rng.range(18, 30);   // slow meander, period 18..30 s
    this.f2 = (Math.PI * 2) / rng.range(6, 11);    // faster jitter, period 6..11 s
    this.p1 = rng.range(0, Math.PI * 2);
    this.p2 = rng.range(0, Math.PI * 2);
    this.surge = rng.range(0.15, 0.35);            // along-track speed modulation fraction
    this.anchor(params.start[0], params.start[1], params.heading, 0);
  }

  // (Re)anchor the track at a position/tick (used at start and when heading/speed change live).
  anchor(x, z, headingDeg, tick) {
    const h = (headingDeg * Math.PI) / 180;
    this.dx = Math.sin(h); this.dz = -Math.cos(h);   // forward
    this.px = Math.cos(h); this.pz = Math.sin(h);    // left-hand perpendicular
    this.heading = headingDeg;
    this.x0 = x; this.z0 = z; this.t0 = tick;
    this.lat0 = this.lateral(tick);
    this.along0 = this.along(tick);
  }

  lateral(tick) {
    const s = tick * TICK_DT;
    return this.wander * WOBBLE_AMPLITUDE * (Math.sin(s * this.f1 + this.p1) + 0.45 * Math.sin(s * this.f2 + this.p2));
  }

  // distance travelled along the heading (constant speed with a gentle surge so it doesn't feel mechanical)
  along(tick) {
    const s = tick * TICK_DT;
    return this.speed * (s + this.surge * this.wander * 2.5 * Math.sin(s * this.f2 * 0.5 + this.p1));
  }

  // Funnel centre at a tick, written into out {x, z} (no allocation).
  positionAt(tick, out) {
    const a = this.along(tick) - this.along0;
    const l = this.lateral(tick) - this.lat0;
    out.x = this.x0 + this.dx * a + this.px * l;
    out.z = this.z0 + this.dz * a + this.pz * l;
    return out;
  }

  // Predicted track as waypoints every `stepTicks` ticks (used by the preview and the admin UI).
  waypoints(fromTick, toTick, stepTicks = 20) {
    const pts = [];
    const p = { x: 0, z: 0 };
    for (let t = fromTick; t <= toTick; t += stepTicks) { this.positionAt(t, p); pts.push({ x: p.x, z: p.z, tick: t }); }
    if ((toTick - fromTick) % stepTicks !== 0) { this.positionAt(toTick, p); pts.push({ x: p.x, z: p.z, tick: toTick }); }
    return pts;
  }
}
