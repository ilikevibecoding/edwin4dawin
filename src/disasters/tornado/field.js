// Tornado wind field. Pure math, no allocations: callers pass an `out` object that receives the wind
// velocity (blocks/s) at a point given relative to the funnel axis.
//
// Rankine-like vortex: inside the core (r < R) the swirl grows with r, outside it decays as 1/r and is
// windowed to zero at OUTER * R. Components: tangential swirl (direction (dz, -dx): +z -> +x, matching the
// funnel texture spin), inward pull (strongest at the core wall, holds debris in orbit) and updraft (fades
// with height so debris slows near the cloud deck).
export const OUTER = 3;            // influence ends at OUTER * radius
export const SWIRL_SIGN = 1;       // flip to reverse the rotation direction (must match funnel.js uSpin)

// smooth window 1 -> 0 between q = 1 and q = OUTER
export function envelope(q) {
  if (q <= 1) return 1;
  if (q >= OUTER) return 0;
  const s = 1 - (q - 1) / (OUTER - 1);
  return s * s * (3 - 2 * s);
}

// dx, dz: offset from the axis; dy: height above the funnel base; radius: core radius; intensity 0..1;
// strength: global multiplier (rope-out fade); out: {x, y, z} wind velocity in blocks/s. Returns envelope.
export function windAt(dx, dz, dy, radius, intensity, strength, out) {
  const r2 = dx * dx + dz * dz;
  const r = r2 > 1e-6 ? Math.sqrt(r2) : 1e-3;
  const q = r / radius;
  const env = envelope(q);
  if (env <= 0 || strength <= 0) { out.x = 0; out.y = 0; out.z = 0; return 0; }
  const ux = dx / r, uz = dz / r;
  const shape = q < 1 ? 0.25 + 0.75 * q : 1 / q;        // Rankine profile
  const vt = (18 + 14 * intensity) * shape * env * strength;
  const vin = (8 + 6 * intensity) * (q < 1 ? q : 1 / q) * env * strength;
  const hf = dy < 40 ? 1 : dy > 62 ? 0 : 1 - (dy - 40) / 22;  // updraft fades near the cloud deck
  const vup = (13 + 10 * intensity) * (q < 1 ? 1 - 0.35 * q : 0.65 / q) * env * strength * hf;
  // tangential unit (dz, -dx)/r times SWIRL_SIGN, inward -(ux, uz)
  out.x = SWIRL_SIGN * uz * vt - ux * vin;
  out.z = -SWIRL_SIGN * ux * vt - uz * vin;
  out.y = vup;
  return env;
}
