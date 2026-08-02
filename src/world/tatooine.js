import * as THREE from 'three';
import { Kit, PLATE, BRICK } from '../lego/kit.js';
import { C, SW } from '../lego/palette.js';
import { FINISH } from '../core/materials.js';
import { makeRng } from '../core/rng.js';
import { polyPts, slopeRot } from '../lego/props.js';

/*
 * Tatooine.
 *
 * The desert is the signature look of the film, so it is genuinely brick built:
 * a quantised height field turned into stacked plates with slope bricks on the
 * leading edges, exactly the way a LEGO landscape is laid up in a real set.
 * Nothing here is a smoothed mesh.
 *
 * The dune field is emitted through a single Kit so the whole 160x160 stud
 * expanse batches down to a couple of hundred instanced draws. Flat regions are
 * greedily merged into big plates before they are placed, which is both how a
 * real builder would do it and what keeps the part count near 1500.
 */

const CELL = 4;            // studs per terrain cell
const STEP = PLATE * 2;    // one contour level: two plates
const MAX_MERGE = 3;       // cells, per axis, that may fuse into one plate

// Tan family, darkest first. Crests get the light sun-bleached tones.
const SAND = [C.darkTan, SW.duneShadow, SW.sandDark, SW.sand, C.tan];
const ROCK = [SW.sandRock, C.darkTan, C.brown, C.reddishBrown];

// --------------------------------------------------------------- noise ----

function lattice(rng, n) {
  const a = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) a[i] = rng.next();
  return a;
}

function sampleLattice(a, n, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const x0 = ((xi % n) + n) % n;
  const x1 = (x0 + 1) % n;
  const y0 = ((yi % n) + n) % n;
  const y1 = (y0 + 1) % n;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const t = a[y0 * n + x0] * (1 - sx) + a[y0 * n + x1] * sx;
  const b = a[y1 * n + x0] * (1 - sx) + a[y1 * n + x1] * sx;
  return t * (1 - sy) + b * sy;
}

// --------------------------------------------------------------- desert ----

/**
 * Brick-built dune field.
 *
 * userData.heightAt(x, z)   top surface in the desert's local space, so a
 *                           minifig's feet or a pod's skids can sit on it
 * userData.levelAt(x, z)    the contour index at that point
 * userData.size, .cell, .step
 * userData.padCenter        centre of the flattened landing pad
 */
export function buildDesert({
  size = 160, seed = 'dune-sea', levels = 9, flatRadius = 24, flatLevel = 3,
  padCenter = [0, 0], detail = true,
} = {}) {
  const kit = new Kit('desert');
  const rng = makeRng(`desert-${seed}`);
  const n = Math.max(4, Math.round(size / CELL));
  const half = (n * CELL) / 2;

  const nA = lattice(rng, 8);
  const nB = lattice(rng, 16);
  const nC = lattice(rng, 32);

  // Height field: fBm plus a directional ridge so the dunes run with the wind.
  const L = new Int16Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const v = j / n;
      let h = sampleLattice(nA, 8, u * 8, v * 8) * 0.52
        + sampleLattice(nB, 16, u * 16, v * 16) * 0.31
        + sampleLattice(nC, 32, u * 32, v * 32) * 0.17;
      h += 0.13 * Math.sin((u * 2.3 + v * 1.15) * Math.PI * 2 + 1.1);
      h = Math.min(1, Math.max(0, h * 1.06));
      let lv = Math.round(Math.pow(h, 1.25) * levels);

      // Flatten a landing pad so the film has somewhere to put a ship.
      if (flatRadius > 0) {
        const x = -half + (i + 0.5) * CELL - padCenter[0];
        const z = -half + (j + 0.5) * CELL - padCenter[1];
        const d = Math.sqrt(x * x + z * z) / flatRadius;
        if (d < 1.6) {
          const w = 1 - Math.min(1, Math.max(0, (d - 0.55) / 1.05));
          lv = Math.round(lv * (1 - w) + flatLevel * w);
        }
      }
      L[j * n + i] = Math.max(1, lv);
    }
  }

  const lvl = (i, j) => (i < 0 || j < 0 || i >= n || j >= n ? 0 : L[j * n + i]);
  const cx = (i) => -half + (i + 0.5) * CELL;

  // --- greedy plate merge: fuse equal-level neighbours into big plates ----
  const used = new Uint8Array(n * n);
  const rects = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (used[j * n + i]) continue;
      const l0 = L[j * n + i];
      let w = 1;
      while (w < MAX_MERGE && i + w < n && !used[j * n + i + w] && L[j * n + i + w] === l0) w++;
      let d = 1;
      grow: while (d < MAX_MERGE && j + d < n) {
        for (let k = 0; k < w; k++) {
          if (used[(j + d) * n + i + k] || L[(j + d) * n + i + k] !== l0) break grow;
        }
        d++;
      }
      for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) used[(j + b) * n + i + a] = 1;
      rects.push({ i, j, w, d, l: l0 });
    }
  }

  // --- plates: a tile cap on a stretched fill block ------------------------
  for (const r of rects) {
    const top = r.l * STEP;
    let minNb = r.l;
    for (let a = 0; a < r.w; a++) {
      minNb = Math.min(minNb, lvl(r.i + a, r.j - 1), lvl(r.i + a, r.j + r.d));
    }
    for (let b = 0; b < r.d; b++) {
      minNb = Math.min(minNb, lvl(r.i - 1, r.j + b), lvl(r.i + r.w, r.j + b));
    }
    const w = r.w * CELL;
    const d = r.d * CELL;
    const x = cx(r.i) + ((r.w - 1) * CELL) / 2;
    const z = cx(r.j) + ((r.d - 1) * CELL) / 2;

    // Colour by altitude, with a little jitter so it does not stripe.
    const t = (r.l - 1) / Math.max(1, levels - 1);
    let ci = Math.round(t * (SAND.length - 1) + rng.range(-0.7, 0.7));
    ci = Math.min(SAND.length - 1, Math.max(0, ci));
    const cap = SAND[ci];
    const fill = SAND[Math.max(0, ci - 1)];

    // Small plates occasionally come out studs-up: the texture of a LEGO field.
    if (r.w === 1 && r.d === 1 && rng.bool(0.16)) {
      kit.plate(x, top - PLATE, z, w, d, cap, { studSeg: 8 });
    } else {
      kit.tile(x, top - PLATE, z, w, d, cap);
    }

    const baseY = Math.max(0, minNb * STEP - PLATE);
    const fh = top - PLATE - baseY;
    if (fh > 0.001) {
      // Unit-height box scaled in y: one geometry per footprint, any depth.
      kit.box(x, baseY, z, w, 1, d, fill, { bevel: false, scl: [1, fh, 1] });
    }
  }

  // --- slope bricks on the leading edges -----------------------------------
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const l0 = L[j * n + i];
      for (const [di, dj] of DIRS) {
        const ln = lvl(i + di, j + dj);
        const drop = l0 - ln;
        if (drop < 1 || drop > 2 || ln < 1) continue;
        // Leave some edges as crisp plate steps; a real landscape mixes both.
        if (!rng.bool(drop === 1 ? 0.62 : 0.86)) continue;
        const nx = cx(i + di) - di * (CELL / 2 - 1);
        const nz = cx(j + dj) - dj * (CELL / 2 - 1);
        const t = (l0 - 1) / Math.max(1, levels - 1);
        const ci = Math.min(SAND.length - 1, Math.max(0, Math.round(t * (SAND.length - 1))));
        kit.slope(nx, ln * STEP, nz, CELL, 2, SAND[ci], {
          h: drop * STEP, rot: slopeRot(di, dj),
        });
      }
    }
  }

  const heightAt = (x, z) => {
    const i = Math.floor((x + half) / CELL);
    const j = Math.floor((z + half) / CELL);
    const ii = Math.min(n - 1, Math.max(0, i));
    const jj = Math.min(n - 1, Math.max(0, j));
    return L[jj * n + ii] * STEP;
  };

  // --- surface dressing ----------------------------------------------------
  if (detail) {
    const drng = makeRng(`desert-detail-${seed}`);
    for (let k = 0; k < 54; k++) {
      const x = drng.range(-half + 4, half - 4);
      const z = drng.range(-half + 4, half - 4);
      const y = heightAt(x, z);
      const roll = drng.next();
      if (roll < 0.42) {
        // Weathered boulder.
        const r = drng.range(1.1, 2.6);
        const sides = drng.int(5, 7);
        const pts = [];
        for (let s = 0; s < sides; s++) {
          const a = (s / sides) * Math.PI * 2;
          const rr = r * drng.range(0.7, 1.15);
          pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
        }
        kit.poly(x, y, z, polyPts(pts), drng.range(0.6, 2.0), drng.pick(ROCK), { bevel: true });
      } else if (roll < 0.68) {
        // Half-buried plate: a shard of rock lying flat.
        kit.tile(x, y, z, drng.int(2, 4), drng.int(1, 3), drng.pick(ROCK), {
          rot: drng.range(0, Math.PI),
        });
      } else if (roll < 0.86) {
        // Stud cluster.
        const c = drng.pick(SAND);
        for (let s = 0; s < drng.int(2, 5); s++) {
          kit.stud(x + drng.range(-1.6, 1.6), y, z + drng.range(-1.6, 1.6), c, { seg: 8 });
        }
      } else {
        // Dry scrub: a stub of dark brown with a couple of arms.
        kit.cyl(x, y, z, 0.22, drng.range(0.5, 1.1), C.darkBrown, { seg: 6 });
        kit.cyl(x + 0.4, y + 0.3, z, 0.14, 0.6, C.darkBrown, { seg: 6, rot: [0, 0, -0.6] });
      }
    }
  }

  const g = kit.build({ name: 'desert' });
  g.userData.heightAt = heightAt;
  g.userData.levelAt = (x, z) => Math.round(heightAt(x, z) / STEP);
  g.userData.size = n * CELL;
  g.userData.cell = CELL;
  g.userData.step = STEP;
  g.userData.padCenter = new THREE.Vector3(padCenter[0], flatLevel * STEP, padCenter[1]);
  return g;
}

// ---------------------------------------------------------------- rocks ----

/** One stepped sandstone stack: the building block of a mesa. */
function mesaStack(kit, rng, { w, d, height, lean = 0.35, palette = ROCK }) {
  const layers = Math.max(3, Math.round(height / BRICK));
  let cw = w;
  let cd = d;
  let ox = 0;
  let oz = 0;
  for (let i = 0; i < layers; i++) {
    const y = i * BRICK;
    const t = i / (layers - 1);
    // Strata: the colour steps every few courses, like bedded sandstone.
    const col = palette[Math.min(palette.length - 1, Math.floor(t * 3 + rng.range(0, 1.1)))];
    kit.block(ox, y, oz, Math.max(2, Math.round(cw)), Math.max(2, Math.round(cd)), col);

    // Broken shoulder bricks so the silhouette is not a clean pyramid.
    if (rng.bool(0.55) && cw > 3) {
      const sx = rng.sign();
      const sz = rng.sign();
      kit.block(ox + (sx * cw) / 2, y, oz + (sz * cd) / 2, rng.int(1, 3), rng.int(1, 3),
        palette[rng.int(0, palette.length - 1)]);
    }
    // Slope on a downhill edge, the way a landscape builder finishes a course.
    if (rng.bool(0.5) && i < layers - 1) {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const [di, dj] = dirs[rng.int(0, 3)];
      kit.slope(ox + (di * (cw + 2)) / 2, y, oz + (dj * (cd + 2)) / 2,
        Math.max(2, Math.round(di ? cd * 0.7 : cw * 0.7)), 2,
        palette[rng.int(0, palette.length - 1)], { h: BRICK, rot: slopeRot(di, dj) });
    }
    const shrink = rng.range(0.06, 0.2);
    cw = Math.max(2, cw * (1 - shrink));
    cd = Math.max(2, cd * (1 - shrink));
    ox += rng.range(-lean, lean);
    oz += rng.range(-lean, lean);
  }
  // Cap: a flat mesa top with a lip.
  const y = layers * BRICK;
  kit.tile(ox, y, oz, Math.max(2, Math.round(cw + 1)), Math.max(2, Math.round(cd + 1)), palette[0]);
  return { x: ox, z: oz, y: y + PLATE, w: cw, d: cd };
}

/**
 * Brick-built sandstone: a mesa, a lower spur and (by default) an arch bridging
 * the two. `size` is the footprint of the main stack in studs.
 */
export function buildRockFormation({ seed = 'mesa', size = 16, height = 20, arch = true } = {}) {
  const kit = new Kit('rock-formation');
  const rng = makeRng(`rock-${seed}`);

  kit.push().translate(-size * 0.25, 0, 0);
  const main = mesaStack(kit, rng, { w: size, d: size * 0.8, height });
  kit.pop();

  const spurX = size * 0.95;
  kit.push().translate(spurX, 0, rng.range(-2, 2));
  const spur = mesaStack(kit, rng, {
    w: size * 0.5, d: size * 0.55, height: height * rng.range(0.45, 0.62),
  });
  kit.pop();

  if (arch) {
    // Span the gap with a shallow brick arch between the two stacks.
    const x0 = -size * 0.25 + main.x + main.w / 2;
    const x1 = spurX + spur.x - spur.w / 2;
    const span = x1 - x0;
    const yBase = Math.min(main.y, spur.y) * 0.62;
    const steps = Math.max(5, Math.round(span / 2.2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + span * t;
      const rise = Math.sin(t * Math.PI) * span * 0.16;
      const col = ROCK[Math.min(ROCK.length - 1, 1 + (i % 2))];
      kit.block(x, yBase + rise, 0, 3, Math.max(3, Math.round(size * 0.4)), col);
      if (i > 0 && i < steps) {
        kit.tile(x, yBase + rise + BRICK, 0, 3, Math.max(3, Math.round(size * 0.4 - 1)), ROCK[0]);
      }
    }
    // Thicken the abutments so the arch does not look glued on.
    for (const [x, s] of [[x0, 1], [x1, -1]]) {
      kit.block(x + s * 1.2, yBase - BRICK, 0, 4, Math.max(4, Math.round(size * 0.45)), ROCK[2]);
      kit.slope(x + s * 3.0, yBase - BRICK, 0, Math.max(4, Math.round(size * 0.45)), 3, ROCK[1],
        { h: BRICK * 1.6, rot: slopeRot(s, 0) });
    }
  }

  // Scree at the feet.
  for (let i = 0; i < 22; i++) {
    const a = rng.range(0, Math.PI * 2);
    const r = rng.range(size * 0.4, size * 1.3);
    kit.block(Math.cos(a) * r, 0, Math.sin(a) * r * 0.8, rng.int(1, 3), rng.int(1, 2),
      ROCK[rng.int(0, ROCK.length - 1)], { h: PLATE * rng.int(1, 3), rot: rng.range(0, 3.1) });
  }

  const g = kit.build({ name: 'rock-formation' });
  g.userData.top = new THREE.Vector3(-size * 0.25 + main.x, main.y, main.z);
  return g;
}

// ------------------------------------------------------------------ sky ----

const skyCache = new Map();
function skyTexture(key, draw) {
  let t = skyCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = 8;
  cv.height = 256;
  draw(cv.getContext('2d'), 8, 256);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.needsUpdate = true;
  skyCache.set(key, t);
  return t;
}

/**
 * Hot hazy sky dome. Bleached cream at the horizon climbing to a dusty blue,
 * with sand-coloured ground haze below so nothing shows through the desert's
 * far edge.
 */
export function buildDesertSky({ radius = 700, seed = 'sky' } = {}) {
  const tex = skyTexture(`desert-sky-${seed}`, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.00, '#5f89b4');
    grad.addColorStop(0.22, '#87a9c4');
    grad.addColorStop(0.40, '#bfcbcb');
    grad.addColorStop(0.50, '#e8ddc0');
    grad.addColorStop(0.56, '#f7ecc9');
    grad.addColorStop(0.62, '#e6cfa2');
    grad.addColorStop(0.80, '#c8ac7c');
    grad.addColorStop(1.00, '#a98f66');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const mat = new THREE.MeshBasicMaterial({
    map: tex, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: true,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), mat);
  dome.name = 'desert-sky';
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  const g = new THREE.Group();
  g.name = 'desert-sky';
  g.add(dome);
  g.userData.dome = dome;
  return g;
}

// ------------------------------------------------------------ vaporator ----

/** GX-8 moisture vaporator: mast, condenser drum and radiator fins. */
export function buildVaporator({ seed = 'vaporator', height = 8 } = {}) {
  const kit = new Kit('vaporator');
  const rng = makeRng(`vap-${seed}`);
  const grey = C.darkBluishGray;
  const light = C.lightBluishGray;

  kit.plate(0, 0, 0, 4, 4, grey);
  kit.cyl(0, PLATE, 0, 1.55, 0.5, C.flatSilver, { seg: 16 });
  kit.torus(0, PLATE + 0.5, 0, 1.5, 0.16, grey, { seg: 18, rot: [Math.PI / 2, 0, 0] });

  const mastH = height * 0.52;
  kit.cyl(0, PLATE + 0.4, 0, 0.62, mastH, light, { seg: 12 });
  // Banding up the mast.
  for (let i = 1; i < 4; i++) {
    kit.cyl(0, PLATE + 0.4 + (mastH * i) / 4, 0, 0.72, 0.16, grey, { seg: 12 });
  }

  const drumY = PLATE + 0.4 + mastH;
  kit.cyl(0, drumY, 0, 1.25, 1.7, light, { seg: 16 });
  kit.cyl(0, drumY - 0.1, 0, 1.42, 0.22, grey, { seg: 16 });
  kit.cyl(0, drumY + 1.55, 0, 1.42, 0.22, grey, { seg: 16 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    kit.box(Math.cos(a) * 1.3, drumY + 0.45, Math.sin(a) * 1.3, 0.5, 0.8, 0.5, grey,
      { rot: -a });
  }

  // Radiator fins fanned around the head.
  const fins = 7;
  const finY = drumY + 1.8;
  for (let i = 0; i < fins; i++) {
    const a = (i / fins) * Math.PI * 2;
    kit.push().translate(0, finY, 0).rotY(a).translate(0, 0, -1.5).rotX(-0.34);
    kit.box(0, 0, 0, 0.9, 0.16, 2.6, C.flatSilver);
    kit.box(0, 0.16, -1.1, 0.7, 0.4, 0.4, grey);
    kit.pop();
  }
  kit.cyl(0, finY - 0.2, 0, 0.9, 0.6, grey, { seg: 14 });
  kit.cone(0, finY + 0.4, 0, 0.72, 0.18, 1.0, C.flatSilver, { seg: 14 });
  kit.cyl(0, finY + 1.4, 0, 0.08, 1.4, grey, { seg: 6 });
  kit.sphere(0, finY + 2.85, 0, 0.16, C.red, { seg: 8 });

  // Pipework down to the collection tank.
  kit.push().translate(1.9, 0, 0);
  kit.cyl(0, 0, 0, 0.75, 1.6, grey, { seg: 12 });
  kit.cyl(0, 1.6, 0, 0.8, 0.2, C.flatSilver, { seg: 12 });
  kit.pop();
  kit.cyl(0.7, drumY - 0.3, 0, 0.16, 1.3, C.flatSilver, { seg: 8, rot: [0, 0, -1.05] });
  kit.cyl(1.9, 1.7, 0, 0.16, drumY - 2.1, C.flatSilver, { seg: 8 });

  // Sand piled against the base.
  for (let i = 0; i < 6; i++) {
    const a = rng.range(0, Math.PI * 2);
    kit.tile(Math.cos(a) * rng.range(1.8, 3.0), 0, Math.sin(a) * rng.range(1.8, 3.0),
      rng.int(2, 3), 2, rng.pick([SW.sand, SW.sandDark]), { rot: rng.range(0, 3.1) });
  }

  kit.point('head', 0, finY + 0.4, 0);
  const g = kit.build({ name: 'vaporator' });
  g.userData.height = finY + 3;
  return g;
}

// -------------------------------------------------------------- horizon ----

/**
 * Distant silhouette band: a ring of hazed-out mesas that closes the gap
 * between the dune field and the sky dome. Deliberately flat and cheap.
 */
export function buildDuneSeaHorizon({
  radius = 230, seed = 'horizon', count = 34, hazy = 0.55,
} = {}) {
  const kit = new Kit('dune-horizon');
  const rng = makeRng(`horizon-${seed}`);
  const near = new THREE.Color(SW.sandRock);
  const sky = new THREE.Color(0xd9cfae);
  const tint = (t) => new THREE.Color().copy(near).lerp(sky, t).getHex();

  // Continuous low band so no daylight leaks under the mesas.
  const band = tint(hazy * 0.9);
  const segs = 40;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const w = (Math.PI * 2 * radius) / segs + 1.5;
    kit.push().translate(Math.cos(a) * radius, 0, Math.sin(a) * radius).rotY(-a);
    kit.box(0, 0, 0, 2.5, 4.5, w, band, { bevel: false, castShadow: false });
    kit.pop();
  }

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.range(-0.05, 0.05);
    const r = radius * rng.range(0.94, 1.16);
    const h = rng.range(5, 20);
    const w = rng.range(14, 46);
    const t = hazy * rng.range(0.65, 1.05);
    const col = tint(Math.min(1, t));
    kit.push().translate(Math.cos(a) * r, 0, Math.sin(a) * r).rotY(-a);
    // Stepped mesa profile, flat-topped like the Jundland Wastes.
    const tiers = rng.int(2, 4);
    for (let k = 0; k < tiers; k++) {
      const f = k / tiers;
      kit.box(rng.range(-2, 2), h * f * 0.85, 0, 2.2, h * (1 - f * 0.7), w * (1 - f * 0.32),
        col, { bevel: false, castShadow: false });
    }
    kit.pop();
  }

  const g = kit.build({ name: 'dune-horizon', castShadow: false });
  return g;
}

// -------------------------------------------------------------- lighting ---

/**
 * Twin-sun daylight. Lights, by name: 'sunA' (hard warm key, casts shadows),
 * 'sunB' (the smaller second sun, offset and dimmer), 'skyFill' (hemisphere,
 * blue over sand bounce), 'haze' (very dim backlight for the horizon).
 */
export function buildTatooineLighting(scene, { keyIntensity = 3.1, shadowRadius = 90 } = {}) {
  const g = new THREE.Group();
  g.name = 'tatooine-lighting';

  const sunA = new THREE.DirectionalLight(0xfff0cf, keyIntensity);
  sunA.name = 'sunA';
  sunA.position.set(52, 60, 34);
  sunA.castShadow = true;
  sunA.shadow.mapSize.set(2048, 2048);
  sunA.shadow.camera.near = 1;
  sunA.shadow.camera.far = shadowRadius * 6;
  sunA.shadow.camera.left = -shadowRadius;
  sunA.shadow.camera.right = shadowRadius;
  sunA.shadow.camera.top = shadowRadius;
  sunA.shadow.camera.bottom = -shadowRadius;
  sunA.shadow.bias = -0.0007;
  sunA.shadow.normalBias = 0.05;

  const sunB = new THREE.DirectionalLight(0xffd39a, 0.85);
  sunB.name = 'sunB';
  sunB.position.set(74, 40, 46);

  const skyFill = new THREE.HemisphereLight(0xbcd8f2, 0xc9a973, 0.85);
  skyFill.name = 'skyFill';

  const haze = new THREE.DirectionalLight(0xffe9c4, 0.4);
  haze.name = 'haze';
  haze.position.set(-40, 8, -60);

  g.add(sunA, sunB, skyFill, haze);
  g.userData.lights = { sunA, sunB, skyFill, haze };
  if (scene && scene.isObject3D) scene.add(g);
  return g;
}

// -------------------------------------------------------------- exhibits ---

export const EXHIBITS = {
  desert: () => buildDesert(),
  'desert-small': () => buildDesert({ size: 64, seed: 'small', flatRadius: 12 }),
  'rock-formation': () => buildRockFormation(),
  vaporator: () => buildVaporator(),
  'dune-horizon': () => buildDuneSeaHorizon({ radius: 90, count: 26 }),
  tatooine: () => {
    const g = new THREE.Group();
    const desert = buildDesert({ size: 160, seed: 'dune-sea' });
    g.add(desert);
    const h = desert.userData.heightAt;
    const rock = buildRockFormation({ seed: 'jundland', size: 15, height: 22 });
    rock.position.set(-44, h(-44, -52) - 1, -52);
    g.add(rock);
    const rock2 = buildRockFormation({ seed: 'spur', size: 9, height: 13, arch: false });
    rock2.position.set(48, h(48, -30) - 1, -30);
    rock2.rotation.y = 1.1;
    g.add(rock2);
    for (const [x, z] of [[10, -14], [18, -6], [-8, 14]]) {
      const v = buildVaporator({ seed: `v${x}` });
      v.position.set(x, h(x, z), z);
      g.add(v);
    }
    g.add(buildDuneSeaHorizon());
    g.add(buildDesertSky());
    g.add(buildTatooineLighting());
    return g;
  },
};
