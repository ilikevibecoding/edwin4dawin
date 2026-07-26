import * as THREE from 'three';
import { BufferGeometryUtils, bend, bolt, rbox, rivet, transform, tube } from '../lib/geo.js';
import { CABIN_ATLAS, CABIN_CELLS } from '../textures/vehicle.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Cabin.
//
// Art-directed for the `interior` beauty view, which sits at the driver's eye —
// local [0.38, 1.63, 0.02], looking level down +Z at 58 degrees. That framing
// has two consequences that drive the whole layout:
//
//  - The bottom edge of frame traces y = 1.63 - 0.578 * z. Anything below that
//    line is off screen, so the *only* part of a conventional dash you can see is
//    the top pad and whatever rises above it. A fascia-mounted radio is
//    invisible from here, which is why the centre stack is a raised pod with an
//    angled face and the aux switches live on top of the pad.
//  - The dash is 0.45-0.9 m away, so a metre of surface spans roughly a thousand
//    pixels. A 30 mm stitch pitch lands on 29 px and a 3 mm vent slat on 3 px:
//    everything here has to be real geometry or real texture, and nothing gets
//    to be a smooth slab.
//
// It also has to hold up through the side glass, because `hero` and `wheel` look
// into it, hence the seats, cage and door cards being built out properly rather
// than just the driver's half.
// ---------------------------------------------------------------------------

const HW = S.bodyHalfWidth;
const FLOOR = S.floorY;
const BELT = S.beltlineY;

/**
 * Dash envelope, set by two sight lines out of the driver's eye at
 * [0.38, 1.63, 0.02] with a 58 degree vertical fov pitched 2 degrees down:
 *
 *   frame bottom    y = 1.63 - 0.600 (z - 0.02)
 *   pad occlusion   y = 1.63 - (1.63 - lipTop) / (PAD_FZ - 0.02) * (z - 0.02)
 *
 * At PAD_TOP = 1.425 the second line ran through y = 1.41 at the cluster's
 * depth, so the dash pad itself hid the bottom half of every dial and the whole
 * binnacle read as a 25-pixel slot. The pad belongs at the height of the screen
 * base anyway — 1.33 m at z = 0.92 — and from there the occlusion line drops to
 * y = 1.28 and the cluster clears it.
 *
 * One correction on top of that geometry, which cost two iterations to find: the
 * cabin hangs off the sprung mass and the beauty camera is bolted to the
 * chassis, so at the pose `setView('interior')` settles into, the whole interior
 * sits 66 mm lower than these local coordinates suggest. Everything from here
 * down is placed for how it lands in *that* frame, which is why the dash reads
 * about 30 mm high if you look at the numbers on their own.
 */
const PAD_TOP = 1.375; // top surface of the dash pad
const PAD_FZ = 0.49; // front lip, nearest the driver
const PAD_RZ = 0.86; // rear edge, tucked under the screen
const FASCIA_FZ = 0.55; // the vertical face below the pad
const DRIVER_X = 0.38; // eye / wheel / cluster centreline

/**
 * The windscreen rakes back as it rises — 1.33 m at z = 0.92, 2.02 m at
 * z = 0.44 — so the cabin's usable envelope is a wedge, and it is the ceiling on
 * every tall part of the dash. Anything above this line pokes out through the
 * glass and shows from the hero view, which is what the old cage bar and header
 * handles were doing at z = 0.66.
 */
const screenY = (z) => BELT + (S.windshieldBottomZ - z) * ((S.roofY - BELT) / (S.windshieldBottomZ - S.windshieldTopZ));

// Texel density per material, in UV units per metre. One object-space projection
// per material means a 40 mm switch bezel and a 1.6 m dash pad get the same size
// of grain, instead of each primitive being handed the whole texture.
const UV_SCALE = {
  interiorPlastic: 1,
  interiorFaded: 1,
  fabric: 1,
  headliner: 1,
  floorMat: 1,
  wheelRim: 'keep',
  wheelWorn: 'keep',
  stitch: 'keep',
  cabinPanel: 'keep',
  cabinGlass: 'keep',
  louvre: 'keep',
  trim: 1.2,
  trimGloss: 1.4,
  steelDark: 1.3,
  chrome: 1.3,
  gap: 'keep',
};

/**
 * Kit variant for the cabin. Two differences from the shared one, both about
 * shading: it keeps each primitive's own normals rather than recomputing them on
 * the merged de-indexed buffer (otherwise every chamfer and every turned tube
 * facets, and the steering wheel comes out octagonal), and it box-projects UVs
 * from object space per material so tiling grain has a consistent scale.
 */
class CabinKit {
  constructor(name) {
    this.name = name;
    this.buckets = new Map();
  }

  add(key, geo, xform) {
    const g = xform ? transform(geo.clone(), xform) : geo.clone();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(g);
    return g;
  }

  build(materials, { castShadow = false, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[cabin] missing material "${key}"`);
        continue;
      }
      const scale = UV_SCALE[key] ?? 1;
      const geos = list.map((g) => {
        const c = g.index ? g.toNonIndexed() : g;
        for (const name of Object.keys(c.attributes)) {
          if (name !== 'position' && name !== 'normal' && name !== 'uv') c.deleteAttribute(name);
        }
        if (scale !== 'keep') boxProjectUV(c, scale);
        return c;
      });
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      if (!merged) {
        console.warn(`[cabin] merge failed for "${key}"`);
        continue;
      }
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `cabin_${key}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    return group;
  }
}

function boxProjectUV(geo, scale) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let u;
    let v;
    if (nx >= ny && nx >= nz) {
      u = z;
      v = y;
    } else if (ny >= nx && ny >= nz) {
      u = x;
      v = z;
    } else {
      u = x;
      v = y;
    }
    uv.setXY(i, u * scale, v * scale);
  }
  uv.needsUpdate = true;
}

/** Rewrite a plane's UVs onto one cell of the cabin atlas. */
function atlasUV(geo, cell) {
  const [cx, cy, cw, chh] = CABIN_CELLS[cell];
  const N = CABIN_ATLAS;
  // canvas y runs down, the texture is uploaded flipped, so v0 is the bottom
  const u0 = cx / N;
  const u1 = (cx + cw) / N;
  const v0 = 1 - (cy + chh) / N;
  const v1 = 1 - cy / N;
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  }
  uv.needsUpdate = true;
  return geo;
}

/** Stretch a plane's U so a tiling strip texture repeats `n` times across it. */
function repeatUV(geo, ru, rv = 1) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  uv.needsUpdate = true;
  return geo;
}

/**
 * Normal of a panel tilted back by `tilt` and yawed by `yaw`, which is also the
 * direction anything sitting proud of that panel has to move along.
 */
function faceN(tilt, yaw) {
  return [-Math.sin(yaw), Math.sin(tilt) * Math.cos(yaw), -Math.cos(tilt) * Math.cos(yaw)];
}

/** A drawn atlas panel: plane, cell UVs, facing -Z, tilted back and yawed. */
function panel(k, cell, { w, h, pos, tilt = 0, yaw = 0, key = 'cabinPanel', glass = 0 }) {
  const g = atlasUV(new THREE.PlaneGeometry(w, h), cell);
  const rot = [tilt, Math.PI + yaw, 0];
  k.add(key, g, { pos, rot });
  if (glass > 0) {
    // cover glass, pushed out along the panel normal
    const n = faceN(tilt, yaw);
    k.add('cabinGlass', new THREE.PlaneGeometry(w * 0.99, h * 0.99), {
      pos: [pos[0] + n[0] * glass, pos[1] + n[1] * glass, pos[2] + n[2] * glass],
      rot,
    });
  }
}

/**
 * Slatted vent: a dark trough with an alpha-cut louvre plate across its mouth.
 * `slats` sets the UV stretch, so the pitch is controlled in metres rather than
 * by however the plane happened to be sized.
 */
function vent(k, { w, h, pos, tilt = 0, yaw = 0, slats, vertical = false }) {
  const rot = [tilt, Math.PI + yaw, 0];
  const nz = [Math.sin(tilt) * Math.cos(yaw), -Math.cos(tilt) * Math.cos(yaw)];
  const uy = [Math.cos(tilt), Math.sin(tilt)];
  k.add('gap', rbox(w, h, 0.05, 0.006), {
    pos: [pos[0], pos[1] - nz[0] * 0.026, pos[2] - nz[1] * 0.026],
    rot,
  });
  const g = new THREE.PlaneGeometry(w - 0.006, h - 0.006);
  repeatUV(g, vertical ? 1 : slats, vertical ? slats : 1);
  if (vertical) {
    // swap the UV axes so the slat run turns through 90 degrees
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    uv.needsUpdate = true;
  }
  k.add('louvre', g, { pos, rot });
  // bezel round the mouth
  for (const [dx, dy, bw, bh] of [
    [0, h * 0.5 + 0.008, w + 0.016, 0.016],
    [0, -h * 0.5 - 0.008, w + 0.016, 0.016],
    [w * 0.5 + 0.008, 0, 0.016, h + 0.016],
    [-w * 0.5 - 0.008, 0, 0.016, h + 0.016],
  ]) {
    k.add('trimGloss', rbox(bw, bh, 0.03, 0.005), {
      pos: [pos[0] + dx, pos[1] + dy * uy[0] + nz[0] * 0.004, pos[2] + dy * uy[1] + nz[1] * 0.004],
      rot,
    });
  }
}

/** A stitched welt running along X. */
function weltX(k, { len, pos, rot = [0, 0, 0], pitch = 0.032 }) {
  const g = rbox(len, 0.015, 0.026, 0.004);
  repeatUV(g, Math.max(2, Math.round(len / pitch)), 1);
  k.add('stitch', g, { pos, rot });
}

/** A stitched welt running along Z. */
function weltZ(k, { len, pos, rot = [0, 0, 0], pitch = 0.032 }) {
  const g = rbox(0.026, 0.015, len, 0.004);
  const uv = g.attributes.uv;
  const n = Math.max(2, Math.round(len / pitch));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i) * n, uv.getX(i));
  uv.needsUpdate = true;
  k.add('stitch', g, { pos, rot });
}

// ---------------------------------------------------------------------------

function buildDash(k) {
  // --- pad -----------------------------------------------------------------
  // One crowned slab plus a rolled front lip. The lip is a half-round because it
  // is the closest thing to the camera and a square edge there reads as cardboard.
  k.add('interiorFaded', rbox(HW * 2 - 0.14, 0.115, PAD_RZ - PAD_FZ, 0.03), {
    pos: [0, PAD_TOP - 0.055, (PAD_FZ + PAD_RZ) * 0.5],
  });
  k.add('interiorFaded', new THREE.CylinderGeometry(0.036, 0.036, HW * 2 - 0.14, 16, 1, false, 0, Math.PI), {
    pos: [0, PAD_TOP - 0.048, PAD_FZ],
    rot: [Math.PI / 2, 0, -Math.PI / 2],
  });
  weltX(k, { len: HW * 2 - 0.2, pos: [0, PAD_TOP - 0.014, PAD_FZ - 0.019], rot: [-0.75, 0, 0] });
  weltX(k, { len: HW * 2 - 0.22, pos: [0, PAD_TOP + 0.004, PAD_RZ - 0.11] });

  // defroster: the biggest single piece of detail in frame, right where the pad
  // meets the screen and seen almost face-on from the driver's eye
  vent(k, { w: 1.34, h: 0.052, pos: [0, PAD_TOP + 0.003, PAD_RZ - 0.045], tilt: Math.PI * 0.5 - 0.34, slats: 44 });
  for (const sx of [-1, 1]) {
    k.add('interiorFaded', rbox(0.14, 0.03, 0.09, 0.012), { pos: [sx * 0.735, PAD_TOP - 0.008, PAD_RZ - 0.05] });
  }

  // cowl: a short sloped closure from the pad's rear edge onto the base of the
  // screen, plus a dark block filling the void behind it. Without both you see
  // straight out under the glass.
  k.add('interiorFaded', rbox(HW * 2 - 0.16, 0.026, 0.075, 0.008), { pos: [0, PAD_TOP - 0.018, PAD_RZ + 0.02], rot: [0.28, 0, 0] });
  k.add('gap', rbox(HW * 2 - 0.14, 0.1, 0.08, 0.01), { pos: [0, PAD_TOP - 0.075, PAD_RZ + 0.03] });

  // --- fascia --------------------------------------------------------------
  k.add('interiorPlastic', rbox(HW * 2 - 0.14, 0.3, PAD_RZ - FASCIA_FZ, 0.028), {
    pos: [0, PAD_TOP - 0.2, (FASCIA_FZ + PAD_RZ) * 0.5],
  });
  // knee bolster below, set back so the fascia keeps a shadow line under it
  k.add('interiorPlastic', rbox(HW * 2 - 0.2, 0.2, 0.2, 0.03), { pos: [0, PAD_TOP - 0.46, FASCIA_FZ + 0.09] });
  k.add('gap', rbox(HW * 2 - 0.16, 0.03, 0.06, 0.006), { pos: [0, PAD_TOP - 0.37, FASCIA_FZ + 0.005] });
  weltX(k, { len: HW * 2 - 0.2, pos: [0, PAD_TOP - 0.072, FASCIA_FZ - 0.006], rot: [0.2, 0, 0] });

  // outboard eyeball vents, angled in toward the occupants
  for (const sx of [-1, 1]) {
    vent(k, {
      w: 0.16,
      h: 0.075,
      pos: [sx * 0.66, PAD_TOP - 0.105, FASCIA_FZ - 0.012],
      tilt: 0.18,
      slats: 6,
      vertical: true,
    });
  }

  // Bubble compass stuck to the pad in the slot between the binnacle cheek and
  // the centre pod. That slot is only 56 mm wide — a torch laid there was hidden
  // behind the cheek — and a 40 mm glass dome is the one accessory that fits it,
  // which is presumably why every truck has one.
  const cpx = 0.115;
  const cpz = 0.665;
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.023, 0.026, 0.026, 14), { pos: [cpx, PAD_TOP + 0.012, cpz] });
  k.add('chrome', new THREE.TorusGeometry(0.0225, 0.0035, 5, 14), { pos: [cpx, PAD_TOP + 0.024, cpz], rot: [Math.PI * 0.5, 0, 0] });
  k.add('gap', new THREE.CylinderGeometry(0.019, 0.019, 0.004, 12), { pos: [cpx, PAD_TOP + 0.026, cpz] });
  k.add('cabinPanel', atlasUV(new THREE.PlaneGeometry(0.03, 0.03), 'dome'), {
    pos: [cpx, PAD_TOP + 0.0285, cpz],
    rot: [-Math.PI * 0.5, 0, 0],
  });
  k.add('lensClear', new THREE.SphereGeometry(0.019, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), {
    pos: [cpx, PAD_TOP + 0.024, cpz],
  });

  // Tray let into the pad top with a ribbed rubber liner. Held inboard of
  // x = -0.2: at the dash's depth the frame only reaches x = -0.25, so the
  // outboard half of the passenger side of the pad is not on screen at all.
  k.add('gap', rbox(0.26, 0.026, 0.16, 0.006), { pos: [-0.16, PAD_TOP - 0.012, 0.705] });
  k.add('floorMat', rbox(0.23, 0.01, 0.13, 0.004), { pos: [-0.16, PAD_TOP - 0.019, 0.705] });
  for (const dx of [-0.14, 0.14]) {
    for (const dz of [-0.09, 0.09]) {
      k.add('steelDark', rivet(0.0065, 0.0035), { pos: [-0.16 + dx, PAD_TOP + 0.002, 0.705 + dz] });
    }
  }
  weltZ(k, { len: 0.2, pos: [-0.32, PAD_TOP + 0.003, 0.7], pitch: 0.028 });

  // --- instrument binnacle -------------------------------------------------
  // A hooded pod standing 140 mm proud of the pad. The dials face up and back at
  // 19 degrees, which from the driver's eye is within 2 degrees of face-on, and
  // the face is sized so its bottom edge clears the frame edge by ~13 mm.
  const gz = 0.615;
  const gy = 1.425;
  const tilt = 0.34;
  const up = [0, Math.cos(tilt), Math.sin(tilt)];
  const outN = [0, Math.sin(tilt), -Math.cos(tilt)];
  const onDial = (dy, out) => [
    DRIVER_X,
    gy + dy * up[1] + out * outN[1],
    gz + dy * up[2] + out * outN[2],
  ];
  // carrier behind the dials, and the shelf that ties the pod to the fascia
  k.add('interiorPlastic', rbox(0.48, 0.22, 0.09, 0.02), { pos: [DRIVER_X, gy - 0.01, gz + 0.08] });
  k.add('interiorPlastic', rbox(0.5, 0.08, 0.16, 0.02), { pos: [DRIVER_X, 1.33, gz + 0.01] });
  // Cheeks either side of the binnacle. Faded vinyl on a face this upright reads
  // as a pale post rather than a sun-bleached top, so they take the dark grain
  // and a fastener each.
  for (const sx of [-1, 1]) {
    k.add('interiorPlastic', rbox(0.035, 0.2, 0.12, 0.014), { pos: [DRIVER_X + sx * 0.235, gy + 0.02, gz + 0.03] });
    k.add('steelDark', rivet(0.0065, 0.0035), {
      pos: [DRIVER_X + sx * 0.252, gy - 0.03, gz - 0.01],
      rot: [0, 0, sx * Math.PI * 0.5],
    });
  }
  panel(k, 'gauges', { w: 0.44, h: 0.19, pos: onDial(0, 0), tilt, glass: 0.011 });
  // bezel members proud of the face, so the dials sit in a real recess
  for (const [dx, dy, bw, bh] of [
    [0, 0.104, 0.48, 0.026],
    [0, -0.104, 0.48, 0.026],
    [0.227, 0, 0.026, 0.234],
    [-0.227, 0, 0.026, 0.234],
  ]) {
    const p = onDial(dy, 0.013);
    k.add('interiorFaded', rbox(bw, bh, 0.045, 0.007), { pos: [p[0] + dx, p[1], p[2]], rot: [tilt, 0, 0] });
  }
  // Hood over the top bezel. Seen from 250 mm above it, an 85 mm deep hood
  // presents its whole top surface across the frame and covered the upper third
  // of both dials with what read as a plank; at 50 mm it is the shadowing lip it
  // is supposed to be. The welt goes on the leading edge, which is the part
  // actually pointed at the driver.
  k.add('interiorFaded', rbox(0.52, 0.024, 0.05, 0.009), { pos: [DRIVER_X, 1.544, 0.6], rot: [-0.24, 0, 0] });
  weltX(k, { len: 0.48, pos: [DRIVER_X, 1.537, 0.578], rot: [0.5, 0, 0], pitch: 0.028 });
  for (const dx of [-0.235, 0.235]) {
    k.add('steelDark', rivet(0.007, 0.004), { pos: [DRIVER_X + dx, 1.552, 0.6], rot: [-0.24, 0, 0] });
  }

  // column stalks either side of the cluster
  for (const [sx, len] of [
    [1, 0.15],
    [-1, 0.12],
  ]) {
    k.add('trimGloss', new THREE.CylinderGeometry(0.0085, 0.011, len, 8), {
      pos: [DRIVER_X + sx * 0.13, 1.285, 0.555],
      rot: [0.25, 0, sx * 1.15],
    });
    k.add('trimGloss', new THREE.SphereGeometry(0.012, 8, 6), {
      pos: [DRIVER_X + sx * (0.13 + len * 0.46), 1.262, 0.535],
    });
  }

  // --- centre stack --------------------------------------------------------
  // From this eye the vehicle centreline is 39 degrees off axis, so a stack built
  // square to the body presents its faces edge-on at the extreme right of frame
  // and the radio is never read. This one is yawed 17 degrees back at the driver
  // and reclined 29, which is how a rally console is built anyway. It carries no
  // visor over the crown: the first version had one, and from an eye 250 mm above
  // the pad the visor's near edge covered the radio completely.
  const px = -0.04;
  const podTilt = 0.5;
  const podYaw = -0.3;
  const podN = faceN(podTilt, podYaw);
  const onPod = (dy, out) => [
    px + out * podN[0],
    1.45 + dy * Math.cos(podTilt) + out * podN[1],
    0.645 + dy * Math.sin(podTilt) + out * podN[2],
  ];
  const podSide = (v) => [v * Math.cos(podYaw), 0, -v * Math.sin(podYaw)];
  const podAcross = (dx, dy, out) => {
    const o = podSide(dx);
    return onPod(dy, out).map((v, i) => v + o[i]);
  };
  // Carrier kept below the pad line. An upright box tall enough to back a face
  // reclined this far pokes its top edge out in front of the face's lower half,
  // which is what was cutting the heater panel in two; the visible body of the
  // pod is the tilted plate and its two cheeks instead.
  k.add('interiorPlastic', rbox(0.3, 0.34, 0.22, 0.025), { pos: [px, 1.21, 0.68], rot: [0, podYaw, 0] });
  k.add('interiorPlastic', rbox(0.28, 0.26, 0.02, 0.008), { pos: onPod(-0.015, -0.014), rot: [podTilt - Math.PI * 0.5, podYaw, 0] });
  for (const sv of [-0.135, 0.135]) {
    k.add('interiorFaded', rbox(0.026, 0.26, 0.05, 0.008), {
      pos: podAcross(sv, -0.015, -0.022),
      rot: [podTilt, podYaw, 0],
    });
  }
  // Rolled crown. The pod is the one part of the dash that breaks the bottom
  // edge of the screen aperture, so its silhouette is read against daylight: a
  // turned-over lip reads as a moulding, and the slab-topped version before it
  // read as a hole punched in the forest.
  k.add('interiorFaded', new THREE.CylinderGeometry(0.026, 0.026, 0.28, 12, 1, false, 0, Math.PI), {
    pos: onPod(0.1, -0.012),
    rot: [Math.PI * 0.5 + podTilt, 0, -Math.PI * 0.5 - podYaw],
  });
  // A 1-DIN head unit is 180 x 50 mm; the 280 x 100 slabs that were here span a
  // third of the frame each once the face is reclined, and between them they left
  // no room on the pod for anything else.
  panel(k, 'radio', { w: 0.24, h: 0.075, pos: onPod(0.045, 0.006), tilt: podTilt, yaw: podYaw, glass: 0.005 });
  panel(k, 'hvac', { w: 0.24, h: 0.09, pos: onPod(-0.055, 0.006), tilt: podTilt, yaw: podYaw });
  // Divider between the two panels. A stitched welt was here and it read as a
  // 12-pixel black bar laid across the bottom of the radio: a welt only reads
  // where its lit face is pointed somewhere, and on a face reclined 29 degrees
  // and yawed 17 it is not. A 6 mm bright metal strip does the same job of
  // separating the two panels and gains a highlight instead of losing one.
  k.add('chrome', rbox(0.25, 0.006, 0.014, 0.002), { pos: onPod(0.0, 0.009), rot: [podTilt, podYaw, 0] });
  for (const dx of [-0.128, 0.128]) {
    k.add('steelDark', rivet(0.0065, 0.004), { pos: podAcross(dx, 0.045, 0.008), rot: [podTilt, podYaw, 0] });
  }
  // chunky rotary below the panels, where a hand lands off the shifter
  k.add('trimGloss', new THREE.CylinderGeometry(0.024, 0.028, 0.03, 14), {
    pos: onPod(-0.118, 0.013),
    rot: [podTilt - Math.PI * 0.5, podYaw, 0],
  });
  k.add('chrome', new THREE.TorusGeometry(0.026, 0.004, 6, 14), {
    pos: onPod(-0.118, 0.028),
    rot: [podTilt, podYaw, 0],
  });
  // CB handset in its clip on the outboard cheek, where it is clear of both
  // panels — hung on the driver's side it was a dark blob over the radio.
  const cbP = podAcross(-0.16, -0.03, 0.012);
  k.add('interiorPlastic', rbox(0.03, 0.095, 0.024, 0.008), { pos: cbP, rot: [0.2, podYaw, -0.16] });
  k.add('gap', rbox(0.018, 0.026, 0.006, 0.002), { pos: [cbP[0] + 0.004, cbP[1] + 0.028, cbP[2] - 0.014], rot: [0.2, podYaw, -0.16] });
  k.add('steelDark', rbox(0.036, 0.014, 0.02, 0.004), { pos: [cbP[0] + 0.002, cbP[1] + 0.048, cbP[2] + 0.004], rot: [0.2, podYaw, -0.16] });
  for (const [dy, dz] of [
    [-0.058, -0.004],
    [-0.076, 0.0],
  ]) {
    k.add('trimGloss', new THREE.TorusGeometry(0.015, 0.0042, 5, 9, Math.PI * 1.5), {
      pos: [cbP[0] + 0.01, cbP[1] + dy, cbP[2] + dz],
      rot: [1.3, 0.3, 0],
    });
  }

  // aux switch bank on the pad outboard of the cluster. Offroad builds put these
  // where a hand finds them without looking, and it is one of the few flat areas
  // on a dash actually pointed back at the driver's eye.
  const swTilt = 0.86;
  k.add('interiorPlastic', rbox(0.27, 0.08, 0.11, 0.012), { pos: [0.7, PAD_TOP + 0.012, 0.665], rot: [-0.7, 0, 0] });
  panel(k, 'switches', { w: 0.24, h: 0.058, pos: [0.7, PAD_TOP + 0.042, 0.636], tilt: swTilt });
  weltX(k, { len: 0.25, pos: [0.7, PAD_TOP - 0.004, 0.615], rot: [-0.7, 0, 0], pitch: 0.028 });

  // --- steering wheel ------------------------------------------------------
  // Raked 24 degrees off vertical. A torus is built in XY with its axis on +Z,
  // which is already a wheel facing the driver, so the rake is one rotation
  // about X — the earlier PI/2 - rake laid it flat like a bus wheel and squashed
  // its silhouette to 200 mm tall. `wp` maps in-plane offsets into the cabin:
  // `dy` up the face, `dn` down the column.
  // At [1.21, 0.47] the rim's top arc landed on v = 0.95 of the frame, behind the
  // cluster and 13 pixels off the bottom edge, so the wheel — the single most
  // recognisable thing in a cabin — was effectively not in the shot. Pulled 55 mm
  // in and lifted 35 mm it crosses in front of the dials' lower third at v 0.87,
  // which is what the driver's own eye sees, and the worn leather at ten and two
  // sits in clear air.
  const wy = 1.28;
  const wz = 0.415;
  const rake = 0.42;
  const R = 0.195;
  const wu = [0, Math.cos(rake), Math.sin(rake)];
  const wn = [0, -Math.sin(rake), Math.cos(rake)];
  const wp = (dx, dy, dn = 0) => [
    DRIVER_X + dx,
    wy + dy * wu[1] + dn * wn[1],
    wz + dy * wu[2] + dn * wn[2],
  ];
  // Rim in four arcs. Only the arc between about 40 and 140 degrees is in frame,
  // so the worn sections sit at ten and two where the hands actually go and stop
  // short of the crown: the point of splitting the rim is the hard boundary
  // between polished and moulded, which needs both sides of it on screen.
  for (const [start, arc, key] of [
    [0.733, 0.628, 'wheelWorn'],
    [1.78, 0.628, 'wheelWorn'],
    [1.361, 0.419, 'wheelRim'],
    [2.409, 4.607, 'wheelRim'],
  ]) {
    const g = new THREE.TorusGeometry(R, key === 'wheelWorn' ? 0.0225 : 0.021, 12, Math.max(8, Math.round(arc * 20)), arc);
    g.rotateZ(start);
    k.add(key, g, { pos: [DRIVER_X, wy, wz], rot: [rake, 0, 0] });
  }
  // spokes: two swept lower ones and a flat top bar, the usual truck pattern.
  // A box built along Y sweeps into the wheel plane under Rz then Rx.
  for (const [sx, spin] of [
    [1, -2.53],
    [-1, 2.53],
  ]) {
    const dir = [-Math.sin(spin), Math.cos(spin)];
    k.add('interiorPlastic', rbox(0.038, 0.15, 0.026, 0.01), {
      pos: wp(dir[0] * 0.128, dir[1] * 0.128, -0.004),
      rot: [rake, 0, spin],
    });
  }
  k.add('interiorPlastic', rbox(R * 1.45, 0.032, 0.028, 0.012), { pos: wp(0, 0.055, -0.006), rot: [rake, 0, 0] });
  // hub and horn pad, both on the column axis
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.056, 0.062, 0.05, 18), {
    pos: wp(0, 0, 0.008),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
  k.add('trimGloss', new THREE.CylinderGeometry(0.05, 0.05, 0.014, 18), {
    pos: wp(0, 0, -0.026),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
  k.add('chrome', new THREE.TorusGeometry(0.05, 0.005, 6, 18), { pos: wp(0, 0, -0.03), rot: [rake, 0, 0] });
  // column shroud, forward and down into the fascia
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.05, 0.062, 0.2, 14), {
    pos: wp(0, 0, 0.12),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
  k.add('gap', new THREE.CylinderGeometry(0.066, 0.066, 0.03, 14), {
    pos: wp(0, 0, 0.225),
    rot: [Math.PI * 0.5 + rake, 0, 0],
  });
}

function buildConsole(k) {
  // Pushed well forward of the eye: at the old z the shift knobs sat 100 mm off
  // the lens and filled a third of the frame with two featureless spheres.
  const cz = 0.28;
  k.add('interiorPlastic', rbox(0.34, 0.26, 0.66, 0.035), { pos: [0.0, FLOOR + 0.15, cz - 0.14] });
  k.add('interiorFaded', rbox(0.35, 0.035, 0.62, 0.014), { pos: [0.0, FLOOR + 0.29, cz - 0.16] });
  weltZ(k, { len: 0.58, pos: [0.16, FLOOR + 0.285, cz - 0.16], rot: [0, 0, 0.5] });
  weltZ(k, { len: 0.58, pos: [-0.16, FLOOR + 0.285, cz - 0.16], rot: [0, 0, -0.5] });

  // shifter and transfer lever in a moulded boot
  for (const [dx, h, r] of [
    [0.06, 0.24, 0.016],
    [-0.07, 0.18, 0.013],
  ]) {
    k.add('gap', new THREE.CylinderGeometry(0.05, 0.062, 0.05, 12), { pos: [dx, FLOOR + 0.3, cz - 0.02] });
    k.add('interiorPlastic', new THREE.CylinderGeometry(0.036, 0.055, 0.09, 12), { pos: [dx, FLOOR + 0.34, cz - 0.02], rot: [-0.14, 0, 0] });
    k.add('steelDark', new THREE.CylinderGeometry(r * 0.8, r, h, 8), {
      pos: [dx, FLOOR + 0.4 + h * 0.42, cz - 0.04],
      rot: [-0.18, 0, 0],
    });
    k.add('wheelWorn', new THREE.SphereGeometry(0.032, 14, 10), { pos: [dx, FLOOR + 0.42 + h, cz - 0.07] });
  }
  // handbrake
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.017, 0.022, 0.24, 10), {
    pos: [-0.02, FLOOR + 0.34, cz - 0.4],
    rot: [-0.85, 0, 0],
  });
  k.add('wheelWorn', new THREE.CylinderGeometry(0.019, 0.019, 0.11, 10), { pos: [-0.02, FLOOR + 0.42, cz - 0.53], rot: [-0.85, 0, 0] });
  k.add('chrome', new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), { pos: [-0.02, FLOOR + 0.455, cz - 0.585], rot: [-0.85, 0, 0] });

  // cup holders and a bin, because a flat console lid is a 400 mm slab
  for (const dx of [-0.075, 0.075]) {
    k.add('gap', new THREE.CylinderGeometry(0.042, 0.038, 0.06, 14), { pos: [dx, FLOOR + 0.28, cz - 0.34] });
    k.add('trimGloss', new THREE.TorusGeometry(0.043, 0.005, 6, 14), { pos: [dx, FLOOR + 0.302, cz - 0.34], rot: [Math.PI / 2, 0, 0] });
  }
  k.add('gap', rbox(0.24, 0.03, 0.16, 0.008), { pos: [0, FLOOR + 0.295, cz - 0.56] });
  k.add('interiorPlastic', rbox(0.23, 0.035, 0.15, 0.01), { pos: [0, FLOOR + 0.3, cz - 0.57], rot: [-0.1, 0, 0] });
}

function buildFloor(k) {
  const midZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  k.add('interiorPlastic', rbox(HW * 2 - 0.16, 0.03, S.cabFrontZ - S.cabRearZ - 0.08, 0.01), {
    pos: [0, FLOOR + 0.02, midZ],
  });
  // transmission tunnel
  k.add('interiorPlastic', rbox(0.4, 0.16, S.cabFrontZ - S.cabRearZ - 0.1, 0.05), { pos: [0, FLOOR + 0.05, midZ] });
  // mats, one a side, with a raised heel pad
  for (const sx of [-1, 1]) {
    k.add('floorMat', rbox(0.52, 0.022, 0.62, 0.012), { pos: [sx * 0.52, FLOOR + 0.045, 0.32] });
    k.add('floorMat', rbox(0.24, 0.016, 0.18, 0.008), { pos: [sx * 0.5, FLOOR + 0.062, 0.1] });
    k.add('trimGloss', rbox(0.05, 0.01, 0.05, 0.004), { pos: [sx * 0.66, FLOOR + 0.058, 0.5] });
  }
  k.add('floorMat', rbox(1.42, 0.02, 0.4, 0.01), { pos: [0, FLOOR + 0.045, S.cabRearZ + 0.3] });

  // pedals, hanging off the bulkhead
  for (const [dx, w] of [
    [0.42, 0.07],
    [0.28, 0.06],
  ]) {
    k.add('steelDark', rbox(0.014, 0.16, 0.03, 0.005), { pos: [dx, FLOOR + 0.24, 0.62], rot: [0.3, 0, 0] });
    k.add('floorMat', rbox(w, 0.11, 0.02, 0.006), { pos: [dx, FLOOR + 0.16, 0.585], rot: [0.3, 0, 0] });
  }
  k.add('steelDark', rbox(0.02, 0.2, 0.04, 0.006), { pos: [0.56, FLOOR + 0.22, 0.6], rot: [0.24, 0, 0] });
  k.add('floorMat', rbox(0.055, 0.13, 0.02, 0.006), { pos: [0.56, FLOOR + 0.13, 0.56], rot: [0.24, 0, 0] });
}

function buildSeats(k) {
  for (const sx of [-1, 1]) {
    const x = sx * 0.42;
    const z = 0.14;
    // cushion: a fluted centre panel between two bolsters, not one slab
    k.add('fabric', rbox(0.34, 0.15, 0.52, 0.05), { pos: [x, FLOOR + 0.34, z] });
    for (let i = -1; i <= 1; i++) {
      k.add('fabric', rbox(0.085, 0.03, 0.5, 0.014), { pos: [x + i * 0.1, FLOOR + 0.418, z] });
    }
    k.add('interiorPlastic', rbox(0.1, 0.13, 0.48, 0.04), { pos: [x + 0.2, FLOOR + 0.375, z] });
    k.add('interiorPlastic', rbox(0.1, 0.13, 0.48, 0.04), { pos: [x - 0.2, FLOOR + 0.375, z] });
    weltZ(k, { len: 0.5, pos: [x + 0.15, FLOOR + 0.41, z], rot: [0, 0, -0.7] });
    weltZ(k, { len: 0.5, pos: [x - 0.15, FLOOR + 0.41, z], rot: [0, 0, 0.7] });

    // backrest
    k.add('fabric', rbox(0.34, 0.6, 0.16, 0.05), { pos: [x, FLOOR + 0.68, z - 0.28], rot: [-0.16, 0, 0] });
    for (let i = -1; i <= 1; i++) {
      k.add('fabric', rbox(0.085, 0.58, 0.03, 0.012), { pos: [x + i * 0.1, FLOOR + 0.68, z - 0.36], rot: [-0.16, 0, 0] });
    }
    k.add('interiorPlastic', rbox(0.1, 0.56, 0.15, 0.04), { pos: [x + 0.2, FLOOR + 0.69, z - 0.29], rot: [-0.16, 0, 0] });
    k.add('interiorPlastic', rbox(0.1, 0.56, 0.15, 0.04), { pos: [x - 0.2, FLOOR + 0.69, z - 0.29], rot: [-0.16, 0, 0] });
    weltX(k, { len: 0.3, pos: [x, FLOOR + 0.97, z - 0.325], rot: [-0.16, 0, 0], pitch: 0.028 });
    // headrest on two posts
    for (const dx of [-0.07, 0.07]) {
      k.add('steelDark', new THREE.CylinderGeometry(0.009, 0.009, 0.07, 8), { pos: [x + dx, FLOOR + 1.0, z - 0.33] });
    }
    k.add('fabric', rbox(0.24, 0.15, 0.13, 0.045), { pos: [x, FLOOR + 1.07, z - 0.345], rot: [-0.1, 0, 0] });
    // back shell and a map pocket
    k.add('interiorPlastic', rbox(0.36, 0.62, 0.035, 0.02), { pos: [x, FLOOR + 0.69, z - 0.365], rot: [-0.16, 0, 0] });
    k.add('fabric', rbox(0.28, 0.2, 0.02, 0.01), { pos: [x, FLOOR + 0.56, z - 0.395], rot: [-0.16, 0, 0] });
    // frame, rails, recliner handle
    k.add('steelDark', rbox(0.46, 0.045, 0.06, 0.012), { pos: [x, FLOOR + 0.24, z + 0.02] });
    k.add('steelDark', rbox(0.045, 0.11, 0.46, 0.012), { pos: [x + 0.16, FLOOR + 0.17, z] });
    k.add('steelDark', rbox(0.045, 0.11, 0.46, 0.012), { pos: [x - 0.16, FLOOR + 0.17, z] });
    k.add('trimGloss', new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), {
      pos: [x + sx * 0.24, FLOOR + 0.42, z - 0.14],
      rot: [0, 0, Math.PI * 0.5],
    });
    // belt: webbing over the shoulder into a plastic guide
    k.add('trim', rbox(0.048, 0.56, 0.012, 0.004), { pos: [x + sx * 0.21, FLOOR + 0.7, z - 0.2], rot: [0.1, 0, sx * 0.2] });
    k.add('trimGloss', rbox(0.05, 0.07, 0.03, 0.01), { pos: [x + sx * 0.24, FLOOR + 1.0, z - 0.18] });
  }

  // rear bench: one piece, with a fold-down centre section
  k.add('fabric', rbox(1.46, 0.14, 0.4, 0.05), { pos: [0, FLOOR + 0.3, S.cabRearZ + 0.34] });
  k.add('fabric', rbox(1.46, 0.44, 0.14, 0.05), { pos: [0, FLOOR + 0.55, S.cabRearZ + 0.16], rot: [-0.1, 0, 0] });
  for (let i = 0; i < 6; i++) {
    k.add('fabric', rbox(0.2, 0.42, 0.025, 0.01), { pos: [(i - 2.5) * 0.235, FLOOR + 0.55, S.cabRearZ + 0.088], rot: [-0.1, 0, 0] });
  }
  weltX(k, { len: 1.4, pos: [0, FLOOR + 0.375, S.cabRearZ + 0.24], rot: [0.5, 0, 0], pitch: 0.03 });
  for (const dx of [-0.45, 0.45]) {
    k.add('fabric', rbox(0.2, 0.13, 0.11, 0.04), { pos: [dx, FLOOR + 0.82, S.cabRearZ + 0.11], rot: [-0.1, 0, 0] });
  }
}

function buildDoors(k) {
  const dz0 = -0.05;
  const dz1 = 0.86;
  const dzc = (dz0 + dz1) * 0.5;
  const x = HW - 0.075;
  for (const sx of [-1, 1]) {
    const px = sx * x;
    // card: three stacked sections with a shadow gap between them, so it is not
    // one flat panel seen edge-on
    k.add('interiorPlastic', rbox(0.05, 0.2, dz1 - dz0, 0.02), { pos: [px, BELT - 0.09, dzc] });
    k.add('gap', rbox(0.035, 0.02, dz1 - dz0 - 0.02, 0.005), { pos: [px - sx * 0.012, BELT - 0.2, dzc] });
    k.add('fabric', rbox(0.035, 0.24, dz1 - dz0 - 0.06, 0.012), { pos: [px - sx * 0.012, BELT - 0.33, dzc] });
    k.add('interiorPlastic', rbox(0.05, 0.26, dz1 - dz0, 0.02), { pos: [px, BELT - 0.6, dzc] });
    weltZ(k, { len: dz1 - dz0 - 0.05, pos: [px - sx * 0.03, BELT - 0.2, dzc], rot: [0, 0, sx * Math.PI * 0.5] });

    // top roll and the window sill / weather strip
    k.add('interiorFaded', new THREE.CylinderGeometry(0.032, 0.032, dz1 - dz0, 12), {
      pos: [px - sx * 0.006, BELT + 0.012, dzc],
      rot: [Math.PI * 0.5, 0, 0],
    });
    k.add('trim', rbox(0.05, 0.022, dz1 - dz0 + 0.04, 0.008), { pos: [sx * (HW - 0.038), BELT + 0.03, dzc] });

    // armrest with the pull cup let into it
    k.add('interiorFaded', rbox(0.09, 0.06, 0.34, 0.022), { pos: [px - sx * 0.03, BELT - 0.19, dz0 + 0.24] });
    k.add('gap', rbox(0.06, 0.05, 0.16, 0.008), { pos: [px - sx * 0.05, BELT - 0.2, dz0 + 0.19] });
    k.add('trimGloss', new THREE.TorusGeometry(0.055, 0.011, 6, 12, Math.PI), {
      pos: [px - sx * 0.056, BELT - 0.155, dz0 + 0.19],
      rot: [Math.PI * 0.5, 0, sx * Math.PI * 0.5],
    });
    // interior release handle and the lock pin
    k.add('chrome', rbox(0.03, 0.024, 0.12, 0.008), { pos: [px - sx * 0.045, BELT - 0.1, dz0 + 0.56] });
    k.add('trimGloss', new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), { pos: [px - sx * 0.03, BELT + 0.04, dz0 + 0.7] });

    // window switch cluster on the armrest top
    k.add('trimGloss', rbox(0.07, 0.014, 0.11, 0.006), { pos: [px - sx * 0.032, BELT - 0.155, dz0 + 0.34], rot: [0, 0, sx * 0.1] });
    for (const dzs of [-0.028, 0.028]) {
      k.add('interiorPlastic', rbox(0.035, 0.016, 0.036, 0.005), {
        pos: [px - sx * 0.036, BELT - 0.146, dz0 + 0.34 + dzs],
        rot: [0, 0, sx * 0.1],
      });
    }

    // speaker in the lower card, plus a map pocket
    const spk = atlasUV(new THREE.PlaneGeometry(0.135, 0.135), 'speaker');
    k.add('cabinPanel', spk, { pos: [px - sx * 0.026, BELT - 0.6, dz0 + 0.24], rot: [0, sx * Math.PI * 0.5, 0] });
    k.add('gap', rbox(0.05, 0.16, 0.3, 0.01), { pos: [px - sx * 0.012, BELT - 0.72, dz0 + 0.6] });
    k.add('interiorPlastic', rbox(0.035, 0.16, 0.3, 0.012), { pos: [px - sx * 0.05, BELT - 0.7, dz0 + 0.6], rot: [0, 0, sx * 0.12] });

    // scuff plate along the sill
    const sill = atlasUV(new THREE.PlaneGeometry(0.42, 0.1), 'sill');
    k.add('cabinPanel', sill, { pos: [sx * (HW - 0.12), FLOOR + 0.035, dz0 + 0.4], rot: [-Math.PI * 0.5, 0, 0] });

    // A-pillar trim, with a tweeter grille let into it
    const paZ = S.windshieldBottomZ;
    k.add('interiorPlastic', tube(
      [
        [sx * (HW - 0.09), BELT + 0.02, paZ - 0.02],
        [sx * (HW - 0.13), BELT + 0.34, paZ - 0.26],
        [sx * (HW - 0.17), S.roofY - 0.11, S.windshieldTopZ + 0.06],
      ],
      0.036,
      8,
    ));
    k.add('trimGloss', rbox(0.03, 0.075, 0.075, 0.012), { pos: [sx * (HW - 0.115), BELT + 0.16, paZ - 0.14], rot: [0.5, 0, sx * 0.1] });
  }

  // Pillar gauge pod, driver's side only, strapped to the A-pillar the way an
  // aftermarket one is. It earns its place twice over: an offroad build always
  // has volts and oil pressure somewhere, and from the driver's eye this is the
  // only object in the left third of the frame, which was 20 per cent of the shot
  // holding nothing but a dark tube against a bright window.
  // Yaw is set by the sight line: the eye is 325 mm inboard of the pod and 695 mm
  // in front of it, so the face has to swing 25 degrees off the body's Z to point
  // back at the driver.
  const gpx = HW - 0.215;
  const gpy = 1.6;
  const gpz = 0.695;
  const gpYaw = 0.44;
  const gpN = faceN(0.02, gpYaw);
  const gpBack = (o) => [gpx - gpN[0] * o, gpy - gpN[1] * o, gpz - gpN[2] * o];
  k.add('interiorPlastic', rbox(0.185, 0.1, 0.07, 0.02), { pos: gpBack(0.036), rot: [0.02, gpYaw, 0] });
  panel(k, 'aux', { w: 0.16, h: 0.08, pos: [gpx, gpy, gpz], tilt: 0.02, yaw: gpYaw, glass: 0.005 });
  for (const dy of [0.048, -0.048]) {
    const p = gpBack(-0.004);
    k.add('interiorFaded', rbox(0.175, 0.014, 0.045, 0.005), { pos: [p[0], p[1] + dy, p[2]], rot: [0.02, gpYaw, 0] });
  }
  // two hose clamps round the pillar, which is how these are actually fitted
  for (const [cy, cz] of [
    [1.535, 0.755],
    [1.672, 0.652],
  ]) {
    k.add('steelDark', new THREE.TorusGeometry(0.039, 0.005, 5, 12), {
      pos: [HW - 0.128, cy, cz],
      rot: [-2.2, 0.16, 0],
    });
  }
}

function buildRoof(k) {
  // The headliner has to stop at the top of the screen, not at the front of the
  // cab: past z = 0.44 the roof is glass.
  const hlF = S.windshieldTopZ - 0.01;
  const hlR = S.cabRearZ + 0.05;
  k.add('headliner', rbox(HW * 2 - 0.16, 0.025, hlF - hlR, 0.01), {
    pos: [0, S.roofY - 0.07, (hlF + hlR) * 0.5],
  });
  // header pad along the top of the screen, and a rib across the roof
  k.add('headliner', rbox(HW * 2 - 0.2, 0.06, 0.14, 0.02), { pos: [0, S.roofY - 0.1, S.windshieldTopZ - 0.06] });
  weltX(k, { len: HW * 2 - 0.26, pos: [0, S.roofY - 0.13, S.windshieldTopZ + 0.0], rot: [0.5, 0, 0], pitch: 0.03 });
  // Rolled cover over the screen's top rail. The body's own header trim already
  // owns the top 14 per cent of the interior frame as flat black, and it is not
  // mine to change, so this is set just low enough that its turned edge and
  // stitch line show under it — about 40 mm of frame — rather than taking a
  // further slice out of the view.
  k.add('interiorPlastic', new THREE.CylinderGeometry(0.026, 0.026, HW * 2 - 0.3, 14, 1, false, 0, Math.PI), {
    pos: [0, 1.849, S.windshieldTopZ + 0.03],
    rot: [Math.PI * 0.5, 0, -Math.PI * 0.5],
  });
  weltX(k, { len: HW * 2 - 0.36, pos: [0, 1.826, S.windshieldTopZ + 0.012], rot: [-0.55, 0, 0], pitch: 0.03 });
  for (const dx of [-0.46, 0, 0.46]) {
    k.add('steelDark', rivet(0.008, 0.0045), { pos: [dx, 1.829, S.windshieldTopZ + 0.008], rot: [-0.55, 0, 0] });
  }
  k.add('interiorFaded', rbox(HW * 2 - 0.18, 0.03, 0.05, 0.012), { pos: [0, S.roofY - 0.088, S.cabRearZ + 0.55] });

  // sun visors, folded up flat against the headliner
  for (const sx of [-1, 1]) {
    k.add('interiorFaded', rbox(0.42, 0.016, 0.17, 0.008), {
      pos: [sx * 0.42, S.roofY - 0.115, S.windshieldTopZ - 0.14],
      rot: [-0.12, 0, 0],
    });
    weltX(k, { len: 0.38, pos: [sx * 0.42, S.roofY - 0.128, S.windshieldTopZ - 0.06], rot: [-0.12, 0, 0], pitch: 0.028 });
    k.add('steelDark', new THREE.CylinderGeometry(0.007, 0.007, 0.11, 8), {
      pos: [sx * 0.62, S.roofY - 0.108, S.windshieldTopZ - 0.1],
      rot: [0, 0, Math.PI * 0.5],
    });
  }

  // dome light
  const midZ = (S.cabFrontZ + S.cabRearZ) * 0.5;
  k.add('interiorFaded', rbox(0.15, 0.03, 0.1, 0.012), { pos: [0, S.roofY - 0.085, midZ - 0.1] });
  const dome = atlasUV(new THREE.PlaneGeometry(0.1, 0.075), 'dome');
  k.add('cabinPanel', dome, { pos: [0, S.roofY - 0.101, midZ - 0.1], rot: [Math.PI * 0.5, 0, 0] });

  // Rear-view mirror. Glued to the glass, so the housing has to stay under the
  // screen line — 1.66 m at z = 0.62 leaves 100 mm of clearance.
  const mz = 0.62;
  const my = 1.66;
  k.add('trimGloss', new THREE.CylinderGeometry(0.012, 0.016, 0.11, 10), { pos: [0, my + 0.055, mz - 0.048], rot: [-0.62, 0, 0] });
  k.add('trimGloss', rbox(0.235, 0.078, 0.035, 0.014), { pos: [0, my, mz] });
  const mirror = atlasUV(new THREE.PlaneGeometry(0.225, 0.066), 'mirror');
  k.add('cabinPanel', mirror, { pos: [0, my, mz - 0.019], rot: [0.04, Math.PI, 0] });
  k.add('trimGloss', rbox(0.05, 0.02, 0.02, 0.006), { pos: [0.06, my - 0.05, mz - 0.012] });
}

function buildCage(k) {
  const cageY = S.roofY - 0.13;
  const hoopZ = S.windshieldTopZ - 0.04;
  for (const sx of [-1, 1]) {
    k.add('steelDark', tube(
      [
        [sx * (HW - 0.11), FLOOR + 0.04, S.cabRearZ + 0.16],
        [sx * (HW - 0.13), cageY - 0.2, S.cabRearZ + 0.18],
        [sx * (HW - 0.19), cageY, S.cabRearZ + 0.34],
        [sx * (HW - 0.21), cageY, hoopZ],
      ],
      0.032,
      9,
    ));
    // foot plate, bolted through
    k.add('steelDark', rbox(0.11, 0.014, 0.11, 0.004), { pos: [sx * (HW - 0.11), FLOOR + 0.045, S.cabRearZ + 0.16] });
    for (const [bx, bz] of [
      [-0.035, -0.035],
      [0.035, -0.035],
      [-0.035, 0.035],
      [0.035, 0.035],
    ]) {
      k.add('steelDark', bolt(0.008, 0.006), { pos: [sx * (HW - 0.11) + bx, FLOOR + 0.052, S.cabRearZ + 0.16 + bz] });
    }
  }
  k.add('steelDark', new THREE.CylinderGeometry(0.03, 0.03, HW * 2 - 0.4, 10), {
    pos: [0, cageY, S.cabRearZ + 0.34],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('steelDark', new THREE.CylinderGeometry(0.028, 0.028, HW * 2 - 0.44, 10), {
    pos: [0, cageY, hoopZ],
    rot: [0, 0, Math.PI / 2],
  });
  for (const sx of [-1, 1]) {
    k.add('steelDark', rbox(0.09, 0.055, 0.09, 0.008), { pos: [sx * (HW - 0.22), cageY - 0.005, hoopZ + 0.05], rot: [0.7, 0, 0] });
  }

  // Grab handles. On the A-pillars rather than the header bar, which is where an
  // offroad cab puts them and, more to the point, the only place one lands inside
  // the frame — a header-mounted handle at this eye height is above the top edge.
  // Passenger side only: the driver's pillar carries the gauge pod, and with both
  // fitted the handle's bend crossed straight over the gauge faces.
  for (const sx of [-1]) {
    const gx = sx * (HW - 0.13);
    k.add('trim', bend(0.085, 0.023, Math.PI * 0.86, 12), {
      pos: [gx - sx * 0.055, 1.55, 0.66],
      rot: [0, sx * Math.PI * 0.5, sx * 0.5],
    });
    for (const [dy, dz] of [
      [0.075, 0.055],
      [-0.07, -0.05],
    ]) {
      k.add('steelDark', rbox(0.03, 0.055, 0.055, 0.008), { pos: [gx - sx * 0.012, 1.55 + dy, 0.66 + dz] });
      k.add('steelDark', bolt(0.007, 0.005), { pos: [gx - sx * 0.03, 1.55 + dy, 0.66 + dz], rot: [0, 0, sx * Math.PI * 0.5] });
    }
  }
  // passenger grab handle off the dash top, the one an offroad cab always has
  const hx = -0.62;
  k.add('trim', bend(0.075, 0.021, Math.PI * 0.9, 12), { pos: [hx, PAD_TOP + 0.08, 0.68], rot: [Math.PI * 0.5, 0, 0.35] });
  for (const dz of [-0.07, 0.07]) {
    k.add('steelDark', rbox(0.05, 0.02, 0.05, 0.006), { pos: [hx, PAD_TOP + 0.01, 0.68 + dz] });
    k.add('steelDark', bolt(0.007, 0.005), { pos: [hx, PAD_TOP + 0.02, 0.68 + dz] });
  }
}

function buildRearWall(k) {
  const rz = S.cabRearZ + 0.05;
  k.add('interiorPlastic', rbox(HW * 2 - 0.16, 0.9, 0.04, 0.02), { pos: [0, BELT - 0.28, rz] });
  k.add('interiorFaded', rbox(HW * 2 - 0.18, 0.05, 0.06, 0.016), { pos: [0, BELT + 0.2, rz + 0.005] });
  weltX(k, { len: HW * 2 - 0.24, pos: [0, BELT + 0.175, rz - 0.02], rot: [0.6, 0, 0], pitch: 0.03 });
  // a jack and a strapped kit bag on the shelf behind the bench
  k.add('steelDark', rbox(0.3, 0.07, 0.1, 0.014), { pos: [-0.44, BELT - 0.02, rz - 0.075] });
  k.add('trim', rbox(0.34, 0.14, 0.14, 0.04), { pos: [0.42, BELT + 0.02, rz - 0.09] });
  for (const dx of [-0.1, 0.1]) {
    k.add('trim', rbox(0.03, 0.16, 0.16, 0.004), { pos: [0.42 + dx, BELT + 0.02, rz - 0.09] });
  }
}

export function buildInterior() {
  const k = new CabinKit('interior');
  buildFloor(k);
  buildDash(k);
  buildConsole(k);
  buildSeats(k);
  buildDoors(k);
  buildRoof(k);
  buildCage(k);
  buildRearWall(k);
  return k;
}
