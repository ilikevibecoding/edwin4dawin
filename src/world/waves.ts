/**
 * CPU mirror of the water surface's wind-sea wave sets (world/water.ts, WATER_FRAG_SURFACE): the same three
 * short-crested sinusoids (11.6 / 7.1 / 4.7 m) with the same phase warp, group modulation and shelter factors, so
 * the floats ride the crests the shader draws around them instead of a separate noise. Left out on purpose:
 *  - the noise-slope chop layers (no analytic height; centimetres the eye cannot match anyway),
 *  - the swell sets (34-340 m, periods 5-15 s): the main water plane is not displaced by them (their slope is
 *    shaded, their rise is not drawn), so a hull heaving 20 cm with an undrawn crest would read as floating
 *    off the surface, and the flight harness's 2 s rest-datum window cannot average a 15 s period out.
 * The near water patch (water.ts, WATER_PATCH) displaces its vertices by the same three sets. Zero-mean heights.
 *
 * Kept in step with the shader by hand: the constants below are the shader's, in the same order.
 */

const TAU = 6.2831853;

function fract(x: number): number { return x - Math.floor(x); }
function smoothstep(a: number, b: number, x: number): number { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }
function hash12(x: number, y: number): number {
  let px = fract(x * 0.1031), py = fract(y * 0.1031), pz = fract(x * 0.1031);
  const d = px * (py + 33.33) + py * (pz + 33.33) + pz * (px + 33.33);
  px += d; py += d; pz += d;
  return fract((px + py) * pz);
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}
/** value of the shader's `noised` (quintic-interpolated value noise) */
function noisedV(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash12(ix, iy), b = hash12(ix + 1, iy), c = hash12(ix, iy + 1), d = hash12(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm2o(x: number, y: number): number {
  return 0.667 * vnoise(x, y) + 0.333 * vnoise(1.6 * x - 1.2 * y + 5.2, 1.2 * x + 1.6 * y + 5.2);
}

interface Site { chopF: number; windG: number; }

export class WaveField {
  private windX = 0.94; private windZ = 0.34; private windSpeed = 6;
  /** shelter / gust factors are re-evaluated when the query moves this far from the cached site */
  private siteX = NaN; private siteZ = NaN; private siteT = NaN;
  private site: Site = { chopF: 0, windG: 1 };

  constructor(private terrainHeightAt: (x: number, z: number) => number) {}

  setWind(dirX: number, dirZ: number, speed: number): void {
    const l = Math.hypot(dirX, dirZ) || 1;
    this.windX = dirX / l; this.windZ = dirZ / l; this.windSpeed = speed;
  }

  /** shelter, depth and gust factors of a spot (the shader's per-pixel terms; slowly varying, so cached per site) */
  private siteAt(x: number, z: number, t: number): Site {
    if (Math.hypot(x - this.siteX, z - this.siteZ) < 6 && Math.abs(t - this.siteT) < 0.5) return this.site;
    this.siteX = x; this.siteZ = z; this.siteT = t;
    const wdx = this.windX, wdz = this.windZ, wcx = -wdz, wcz = wdx;
    const th = this.terrainHeightAt;
    const depth = Math.max(-th(x, z), 0);
    const sway = vnoise(x * 0.0019 + 4.1, z * 0.0019 + 4.1) - 0.5;
    let wjx = wdx + wcx * 0.5 * sway, wjz = wdz + wcz * 0.5 * sway;
    const wl = Math.hypot(wjx, wjz); wjx /= wl; wjz /= wl;
    const reach = 0.8 + 0.4 * (vnoise(x * 0.0031 + 9.3, z * 0.0031 + 9.3) - 0.5);
    const probe = (dist: number) => th(x + wjx * dist * reach, z + wjz * dist * reach);
    const o1 = 1 - smoothstep(-2.5, 0.2, probe(90)), o2 = 1 - smoothstep(-2.5, 0.2, probe(240)), o3 = 1 - smoothstep(-3.0, 0.2, probe(520));
    const open = (o1 + o2 + o3) / 3;
    const chopF = (0.2 + 0.8 * open) * smoothstep(0, 1.2, depth);
    const wind = Math.min(Math.max(this.windSpeed / 6, 0.35), 1.8);
    const gx = x + wdx * 5 * t, gz = z + wdz * 5 * t;
    const gust = 0.74 + 0.52 * fbm2o((gx * wdx + gz * wdz) / 640 + 3.7, (gx * wcx + gz * wcz) / 270 + 3.7);
    this.site = { chopF, windG: wind * gust };
    return this.site;
  }

  /** Surface elevation (m, zero mean) at world (x, z) and wave time t (the water shader's uWaveTime). */
  heightAt(x: number, z: number, t: number): number {
    const s = this.siteAt(x, z, t);
    const wdx = this.windX, wdz = this.windZ;
    let h = 0;
    // sharpened crest profile 0.7 A (s + s^2 / 2) of the shader's swellSlope, less its mean 0.7 A / 4
    const set = (ang: number, L: number, A: number, phase: number, warp: number, gain: number) => {
      const c = Math.cos(ang), sn = Math.sin(ang);
      const dx = c * wdx - sn * wdz, dz = sn * wdx + c * wdz;
      const k = TAU / L, w = Math.sqrt(9.81 * k);
      const sp = Math.sin(k * (x * dx + z * dz) + w * t + phase + warp);
      h += 0.7 * A * (sp + 0.5 * sp * sp - 0.25) * gain;
    };
    if (s.chopF > 0.001) {
      // group noise of the 14 m chop layer (chopSlope: L 14, stretch 2, speed 4.5, seed 1.3, heading +0.15)
      const c = Math.cos(0.15), sn = Math.sin(0.15);
      const dx = c * wdx - sn * wdz, dz = sn * wdx + c * wdz;
      const q0 = ((x * dx + z * dz) + 4.5 * t) * 2 / 14 + 1.3, q1 = (x * -dz + z * dx) / 14 + 1.3 * 1.73;
      const val0 = noisedV(q0, q1);
      const grp = (0.55 + 0.9 * val0) * s.chopF * s.windG;
      const wv = (val0 - 0.5) * 3.0;
      set(-0.33, 11.6, 0.046, 1.0, wv, grp);
      set(0.21, 7.1, 0.058, 3.3, wv * 0.7, grp);
      set(-0.08, 4.7, 0.038, 5.9, wv * 0.5, grp);
    }
    return h;
  }
}
