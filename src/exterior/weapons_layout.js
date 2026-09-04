// Weapon / sensor emplacement sites (EXT-B). Shared by weapons.js (which builds them) and
// greebles.js (which keeps surface detail out of their footprints). Everything derives from spec.js.
import { hullTopY, hullBottomY, hullHalfWidth, trenchBand, TERRACES, terraceHalfWidth, HANGAR } from "../spec.js";

/** Half-width of terrace `t`'s base footprint (where its sloped side meets the top plate) at station z. */
export function terraceBaseHalfWidth(t, z) {
  return terraceHalfWidth(t, z) + t.draft * (t.yTop - (hullTopY(z) - 0.5));
}

/** Heavy twin-barrel turbolaser batteries: a row per side on the top plate beside terrace 0. */
export function heavyTurretSites() {
  const t0 = TERRACES[0];
  const out = [];
  const n = 7;
  const z0 = -340;
  const z1 = 440;
  for (let i = 0; i < n; i++) {
    const z = z0 + ((z1 - z0) * i) / (n - 1);
    const xBase = terraceBaseHalfWidth(t0, z);
    const xEdge = 0.72 * hullHalfWidth(z);
    // sit a third of the way across the free strip, leaving the outer part for greebles
    const x = xBase + Math.min(17, (xEdge - xBase) * 0.36);
    for (const s of [-1, 1]) {
      // rest yaw: barrels forward, deflected 28° outboard (local barrels point -z; +yaw swings -z toward -x)
      out.push({ kind: "heavy", x: s * x, y: hullTopY(z), z, yaw: -s * 0.49, r: 13, index: out.length });
    }
  }
  return out;
}

/** Single-barrel ion cannon turrets, further forward on the top plate. */
export function ionTurretSites() {
  const out = [];
  const zs = [-720, -640, -560, -480];
  for (const z of zs) {
    const x = 0.44 * hullHalfWidth(z);
    for (const s of [-1, 1]) out.push({ kind: "ion", x: s * x, y: hullTopY(z), z, yaw: -s * 0.35, r: 8.5, index: out.length });
  }
  return out;
}

/** Point-defence emplacements on the trench floor's outer lip, both sides. */
export function pointDefenceSites() {
  const out = [];
  for (let z = -560; z <= 560; z += 80) {
    const w = hullHalfWidth(z);
    const band = trenchBand(z);
    const x = 0.9825 * w; // middle of the trench floor (0.965 w .. 1.0 w)
    for (const s of [-1, 1]) out.push({ kind: "pd", x: s * x, y: band.yBottom, z, yaw: -s * Math.PI / 2, r: 2.6 });
  }
  return out;
}

/** Tractor-beam projector domes on the ventral plate around the hangar mouth (outside the opening). */
export function tractorSites() {
  const o = HANGAR.opening;
  const out = [];
  for (const [x, z] of [
    [-50, o.z0 - 22],
    [50, o.z0 - 22],
    [-50, o.z1 + 22],
    [50, o.z1 + 22],
  ]) {
    out.push({ kind: "tractor", x, z, y: hullBottomY(z), r: 12 });
  }
  return out;
}

/** Dish antennas / sensor arrays on terrace roofs. */
export function sensorSites() {
  const t0 = TERRACES[0];
  const t1 = TERRACES[1];
  const t2 = TERRACES[2];
  const out = [];
  // dishes on the terrace-1 roof (fully exposed forward of terrace 2)
  for (const s of [-1, 1]) out.push({ kind: "dish", x: s * (terraceHalfWidth(t1, -100) - 14), y: t1.yTop, z: -100, r: 7, yaw: -s * 0.7, size: 5.5 });
  // dishes on the terrace-2 roof forward of the neck
  for (const s of [-1, 1]) out.push({ kind: "dish", x: s * (terraceHalfWidth(t2, 150) - 12), y: t2.yTop, z: 150, r: 6, yaw: -s * 0.5, size: 4.5 });
  // sensor cages on the terrace-0 roof (forward block)
  for (const s of [-1, 1]) out.push({ kind: "array", x: s * (terraceHalfWidth(t0, -300) - 16), y: t0.yTop, z: -300, r: 7, yaw: 0, size: 6 });
  // long-range array on the terrace-1 roof beside the terrace-2 front face
  for (const s of [-1, 1]) out.push({ kind: "array", x: s * (terraceHalfWidth(t1, 30) - 14), y: t1.yTop, z: 30, r: 7, yaw: s * 0.3, size: 6 });
  return out;
}

/** Everything the greeble scatter must stay clear of: { x, z, y, r } discs on a given surface. */
export function weaponExclusions() {
  return [...heavyTurretSites(), ...ionTurretSites(), ...pointDefenceSites(), ...tractorSites(), ...sensorSites()].map((s) => ({ x: s.x, z: s.z, y: s.y, r: s.r + 3 }));
}
