import * as THREE from 'three';
import { BrickBuilder, PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { RNG } from '../engine/rng.js';
import { num, bool, clamp, smoothstep, hash2i, fbm2, ridge2, setGloss } from './common.js';

/*
 * Tatooine dune sea.
 *
 * The whole point is the stepped-plate contour: the height field is quantised
 * to whole LEGO plates and laid out on a coarse stud grid, so every slope
 * becomes a staircase of terraces the way a real brick-built landscape does.
 * Nothing here is a smooth mesh.
 */

/**
 * Continuous dune height in world units, before plate quantisation.
 *
 * Wavelengths are deliberately long -- roughly two dune ridges across a
 * 200-stud plot. Anything shorter and the plate terraces collapse into
 * single-cell corduroy instead of reading as broad stepped contours.
 */
export function duneHeight(x, z, seed, amp) {
  // Long rolling swell across the whole plot.
  const swell = fbm2(x / 135 + 11, z / 155 + 5, { seed, octaves: 2 });
  // Wind-blown crests running north-east: tight across the wind, stretched along it.
  const wx = (x * 0.87 + z * 0.5) / 64;
  const wz = (-x * 0.5 + z * 0.87) / 170;
  const crest = ridge2(wx + swell * 0.55, wz, { seed: seed + 41, octaves: 2 });
  // One octave of gentle secondary dunes so the field is not two ridges and a plain.
  const drift = fbm2(x / 52 + 3, z / 44 + 8, { seed: seed + 77, octaves: 2 });
  return amp * (0.05 + swell * 0.40 + Math.pow(crest, 1.85) * 0.78 + drift * 0.16);
}

/**
 * Lay a plate-stepped dune field.
 * Returns a sampler so props can be dropped onto the surface.
 */
export function duneField(bb, {
  size = 200, cell = 4, seed = 1207, amp = 13,
  x0 = 0, z0 = 0, step = PLATE, flatten = null, taper = 0.42, mask = null,
} = {}) {
  const n = Math.max(1, Math.round(size / cell));
  const H = new Float32Array(n * n);
  // Height before the rim taper. Shading has to key off this, not off H: with
  // the taper folded in, every cell near the edge counts as "low ground" and
  // the plot ends up ringed by a band of dark tan.
  const R = new Float32Array(n * n);
  const skip = mask ? new Uint8Array(n * n) : null;
  const half = size / 2;

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = x0 - half + (i + 0.5) * cell;
      const z = z0 - half + (j + 0.5) * cell;
      let h = duneHeight(x - x0, z - z0, seed, amp);
      R[j * n + i] = h;
      // Fade the rim down to a sand shelf. Without this the plot ends in a
      // full-height cliff, which from a low camera looks like a cake slice.
      // The zone has to be wide: bring 17 studs of dune down over 10 and every
      // cell in the ramp is a four-stud riser, which reads as a quarry.
      if (taper > 0) {
        // Wobble the falloff so the rim is a ragged sand shelf rather than a
        // set of perfectly nested rectangles.
        const w = half * taper * (0.62 + 0.76 * fbm2(x / 34, z / 34, { seed: seed + 301, octaves: 2 }));
        const e = Math.min((half - Math.abs(x - x0)) / w, (half - Math.abs(z - z0)) / w);
        const s = smoothstep(0, 1, clamp(e, 0, 1));
        h = h * s + step * 2 * (1 - s);
      }
      if (flatten) h = flatten(x - x0, z - z0, h);
      H[j * n + i] = Math.max(step, Math.round(h / step) * step);
      // Masked-out cells are holes in the ground, not low ground: something
      // else (a courtyard, a hangar mouth) is going to occupy the space.
      if (skip && !mask(x - x0, z - z0)) skip[j * n + i] = 1;
    }
  }

  const at = (i, j) => (i < 0 || j < 0 || i >= n || j >= n ? 0 : H[j * n + i]);
  const raw = (i, j) => (i < 0 || j < 0 || i >= n || j >= n ? 0 : R[j * n + i]);
  const maxH = H.reduce((a, b) => Math.max(a, b), 0);
  const maxR = R.reduce((a, b) => Math.max(a, b), 0) || 1;

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (skip && skip[j * n + i]) continue;
      const h = H[j * n + i];
      // A masked neighbour is a cliff edge: drop this cell to the ground so
      // the terrain closes off the hole rather than floating over it.
      const nb = (a, b) => {
        if (a < 0 || b < 0 || a >= n || b >= n) return 0;
        return skip && skip[b * n + a] ? 0 : H[b * n + a];
      };
      const low = Math.min(nb(i - 1, j), nb(i + 1, j), nb(i, j - 1), nb(i, j + 1));
      const yb = Math.max(0, low - step);
      const x = x0 - half + (i + 0.5) * cell;
      const z = z0 - half + (j + 0.5) * cell;

      // Sand is tan; the troughs between ridges and the lee faces -- the ones
      // falling away from the wind, which blows toward +x/+z here -- go dark
      // tan. Two colours only: nougat and friends are far too saturated next
      // to tan and turn the field into a sunburn.
      const t = raw(i, j) / maxR;
      const grad = (raw(i + 1, j) - raw(i - 1, j)) * 0.87 + (raw(i, j + 1) - raw(i, j - 1)) * 0.5;
      const spec = hash2i(i, j, seed + 9);
      let color = C.tan;
      if (t < 0.2) color = spec < 0.7 ? C.darkTan : C.tan;
      else if (grad < -step * 1.4) color = spec < 0.55 ? C.darkTan : C.tan;
      // Tall risers are lee faces standing in their own shade: darkening them
      // is what keeps a steep step from reading as a bright quarry wall.
      else if (h - low > step * 4) color = C.darkTan;
      // Stray plates only where the contour already steps: an odd dark tile in
      // the middle of a flat terrace reads as a pothole.
      else if (spec < 0.13 && h - low > step) color = C.darkTan;

      bb.brick(x, yb, z, cell, cell, { h: h - yb, color, free: true, studs: false });
    }
  }

  const sample = (x, z) => {
    const i = Math.round((x - x0 + half) / cell - 0.5);
    const j = Math.round((z - z0 + half) / cell - 0.5);
    return at(clamp(i, 0, n - 1), clamp(j, 0, n - 1));
  };
  sample.max = maxH;
  return sample;
}

// ------------------------------------------------------------------ rock

/**
 * Stepped sandstone mesa: stacked slabs with slope skirts.
 *
 * One tone per outcrop, and the radius only creeps in between courses. Picking
 * a fresh colour per layer turns the stack into a liquorice allsort, and a
 * fast taper turns it into a wedding cake -- these want to read as weathered
 * mesas, wider at the base than they are tall.
 */
export function rockOutcrop(bb, x, z, y0, r, tall, rng) {
  const tone = rng.next();
  const body = tone < 0.62 ? C.darkTan : C.mediumNougat;
  const band = tone < 0.62 ? C.mediumNougat : C.darkTan;
  // Six courses at most. Any more and the radius has crept in far enough that
  // the stack is a hoodoo rather than the squat mesa this landscape wants.
  const layers = Math.min(6, Math.max(3, Math.round(tall / (BRICK * 2.1))));
  let rad = r;
  let y = y0 - PLATE;
  for (let k = 0; k < layers; k++) {
    const w = Math.max(2, Math.round(rad * 2));
    const d = Math.max(2, Math.round(rad * 2 * rng.range(0.78, 1.2)));
    const h = BRICK * rng.range(1.6, 2.6);
    // A darker stratum now and then reads as bedding in the sandstone. Any
    // more often and medium nougat, which goes almost red under a desert key,
    // stripes the whole formation like liquorice.
    const col = rng.next() < 0.15 ? band : body;
    const ox = rng.range(-1, 1) * rad * 0.3;
    const oz = rng.range(-1, 1) * rad * 0.3;
    bb.brick(x + ox, y, z + oz, w, d, { h, color: col, free: true, studs: false });
    // Talus slopes round the bottom courses, where the scree would pile up.
    if (k < 2) {
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2;
        bb.slope(
          x + ox + Math.cos(a) * (w / 2 + 0.9), y,
          z + oz + Math.sin(a) * (d / 2 + 0.9),
          2, Math.max(2, Math.round((s % 2 ? w : d) * 0.8)),
          { h: h * 0.9, color: col, rot: -a + Math.PI, free: true },
        );
      }
    }
    y += h;
    rad *= rng.range(0.86, 0.97);
    if (rad < 1.6) break;
  }
  // A capstone that reads from a distance.
  bb.slope(x, y, z, Math.max(2, Math.round(rad * 2)), Math.max(2, Math.round(rad * 2)), {
    h: BRICK, color: body, rot: rng.range(0, 6.2), free: true,
  });
  return y;
}

/**
 * Bleached bones half-buried in the sand -- the classic Tatooine dressing.
 *
 * Built in a local frame with the spine along +Z and the ribs arching out
 * along +/-X, then yawed by `rot`. Bars come out of barGeo pointing along +Y
 * and Euler order XYZ composes as Rx*Ry*Rz, so a Z-roll leans the rib out and
 * the Y-yaw afterwards swings the whole animal round.
 */
function ribcage(bb, x, z, y0, rot, scale, rng) {
  const cy = Math.cos(rot), sy = Math.sin(rot);
  const world = (lx, lz) => [x + lx * cy + lz * sy, z - lx * sy + lz * cy];
  const bone = C.veryLightGray;
  const N = 7;
  const L = 5.5 * scale;

  for (let k = 0; k < N; k++) {
    const t = (k / (N - 1) - 0.5) * 2;
    const girth = Math.sqrt(Math.max(0, 1 - t * t * 0.82));
    const top = 3.6 * scale * girth;
    const spread = 2.7 * scale * girth;
    const lz = t * L;
    const len = Math.hypot(spread, top);
    const tilt = Math.atan2(spread, top);
    for (const side of [-1, 1]) {
      const [px, pz] = world(side * spread * 0.5, lz);
      bb.bar(px, y0 + top * 0.5, pz, 0.17 * scale, len * 1.02, {
        color: bone, ry: rot, rz: -side * tilt, finish: FINISH.SOLID,
      });
    }
  }

  // Spine along the top of the arch, then skull and jaw off the front end.
  const [sx, sz] = world(0, 0);
  bb.brick(sx, y0 + 3.5 * scale, sz, 0.7 * scale, L * 2.3, {
    h: 0.4 * scale, color: C.white, rot, free: true, studs: false,
  });
  const [hx, hz] = world(0, -L * 1.5);
  bb.sphere(hx, y0 + 1.2 * scale, hz, 1.5 * scale, { color: C.white, dome: true, seg: 10, rings: 5 });
  const [jx, jz] = world(0, -L * 1.5 - 1.7 * scale);
  bb.brick(jx, y0 + 0.2 * scale, jz, 1.7 * scale, 2.6 * scale, {
    h: 0.9 * scale, color: C.white, rot, free: true, studs: false,
  });
  // A rib or two knocked loose beside the carcass.
  for (let i = 0; i < 2; i++) {
    const [bx, bz] = world(rng.range(-6, 6) * scale, rng.range(-6, 6) * scale);
    bb.bar(bx, y0 + 0.2 * scale, bz, 0.16 * scale, rng.range(2, 4) * scale, {
      color: bone, ry: rng.range(0, 6.28), rz: Math.PI / 2,
    });
  }
}

// -------------------------------------------------------------- factories

export function buildDunes(opts = {}) {
  const size = num(opts, 'size', 200);
  const cell = num(opts, 'cell', 4);
  const seed = Math.round(num(opts, 'seed', 1207));
  const amp = num(opts, 'amp', 17);

  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });
  const sample = duneField(bb, { size, cell, seed, amp, taper: num(opts, 'taper', 0.42) });
  const rng = new RNG(seed + 500);
  const half = size / 2;

  // ----------------------------------------------------------- outcrops
  const rocks = Math.round(num(opts, 'rocks', 5));
  const placed = [];
  for (let i = 0; i < rocks; i++) {
    let x = 0, z = 0, ok = false;
    for (let tries = 0; tries < 24 && !ok; tries++) {
      x = rng.range(-half * 0.72, half * 0.72);
      z = rng.range(-half * 0.72, half * 0.72);
      ok = placed.every((p) => Math.hypot(p[0] - x, p[1] - z) > 44);
    }
    placed.push([x, z]);
    const big = i < 2;
    rockOutcrop(bb, x, z, sample(x, z),
      big ? rng.range(8, 13) : rng.range(4.5, 7.5),
      big ? rng.range(18, 27) : rng.range(9, 16), rng);
  }

  // ------------------------------------------------------- loose debris
  // Scree clusters around the outcrops plus a light dusting elsewhere: a
  // uniform sprinkle of dark stones over pale sand just reads as confetti.
  const stones = Math.round(num(opts, 'stones', 70));
  for (let i = 0; i < stones; i++) {
    let x, z;
    if (placed.length && i % 3 !== 2) {
      const p = placed[rng.int(0, placed.length - 1)];
      const a = rng.range(0, 6.28), r = 6 + rng.next() * rng.next() * 26;
      x = clamp(p[0] + Math.cos(a) * r, -half + 3, half - 3);
      z = clamp(p[1] + Math.sin(a) * r, -half + 3, half - 3);
    } else {
      x = rng.range(-half + 3, half - 3);
      z = rng.range(-half + 3, half - 3);
    }
    const y = sample(x, z);
    const s = rng.next();
    const col = s < 0.5 ? C.darkTan : (s < 0.8 ? C.mediumNougat : C.reddishBrown);
    if (s < 0.3) {
      bb.slope(x, y - PLATE, z, rng.int(1, 2), rng.int(1, 2), {
        h: BRICK * rng.range(0.5, 1.1), color: col, rot: rng.range(0, 6.28), free: true,
      });
    } else {
      bb.brick(x, y - PLATE, z, rng.int(1, 2), rng.int(1, 2), {
        h: PLATE * rng.int(1, 3), color: col, rot: rng.range(0, 6.28), free: true, studs: false,
      });
    }
  }

  // ------------------------------------------------------------- bones
  const bones = Math.round(num(opts, 'bones', 2));
  for (let i = 0; i < bones; i++) {
    const x = rng.range(-half * 0.7, half * 0.7);
    const z = rng.range(-half * 0.7, half * 0.7);
    ribcage(bb, x, z, sample(x, z) - PLATE, rng.range(0, 6.28), rng.range(0.85, 1.25), rng);
  }
  // A few loose bones lying about.
  for (let i = 0; i < 14; i++) {
    const x = rng.range(-half * 0.8, half * 0.8);
    const z = rng.range(-half * 0.8, half * 0.8);
    bb.bar(x, sample(x, z) + 0.14, z, 0.15, rng.range(1.4, 3.4), {
      color: rng.next() < 0.5 ? C.white : C.veryLightGray,
      ry: rng.range(0, 6.28), rz: Math.PI / 2,
    });
  }

  const g = setGloss(bb.build());
  g.name = 'dunes';
  g.userData.nodes = bb.nodes;
  g.userData.heightAt = sample;
  g.userData.size = size;
  return g;
}
