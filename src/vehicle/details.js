import * as THREE from 'three';
import { Kit, bend, bolt, profile, rbox, rivet, tube } from '../lib/geo.js';
import { emitPieces } from './body.js';
import { SPEC as S } from './spec.js';

// ---------------------------------------------------------------------------
// Bolt-on overland gear. This is where the "somebody owns this truck and
// drives it hard" reading comes from: rack, light bar, winch, recovery kit.
// ---------------------------------------------------------------------------

const KEEP_ATTRS = ['position', 'normal', 'uv'];

/**
 * Same accumulation as the shared `Kit`, but it keeps each primitive's own
 * normals instead of recomputing them on the merged, de-indexed buffer — which
 * is a face-normal pass. Every tube, cylinder and chamfer in the rack was
 * coming back facetted, and facetted dark tube is a good part of why the rack
 * read as one mass rather than as a frame with gear on it.
 *
 * Nothing here is mirrored through a negative scale, so unlike `BodyKit` there
 * is no winding to put back.
 */
class GearKit extends Kit {
  build(materials, { castShadow = true, receiveShadow = true, group = new THREE.Group() } = {}) {
    group.name = this.name;
    for (const [key, list] of this.buckets) {
      const mat = materials[key];
      if (!mat) {
        console.warn(`[GearKit] missing material "${key}"`);
        continue;
      }
      const geos = list.map((g) => {
        const c = g.clone();
        if (!c.attributes.normal) c.computeVertexNormals();
        if (!c.attributes.uv) {
          const count = c.attributes.position.count;
          c.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
        }
        for (const name of Object.keys(c.attributes)) if (!KEEP_ATTRS.includes(name)) c.deleteAttribute(name);
        return c.index ? c.toNonIndexed() : c;
      });
      emitPieces(this, group, key, mat, geos, { castShadow, receiveShadow });
    }
    return group;
  }
}

/**
 * Chamfered box for greebles. `rbox` defaults to two segments a side, i.e. 300
 * triangles, which is right for a panel and wasteful on a 30 mm bracket — and
 * the rack, the gear and the flaps between them are a couple of hundred
 * brackets. One segment keeps a facetted chamfer at a third of the cost.
 */
function gbox(w, h, d, r = 0.006) {
  return rbox(w, h, d, r, 1);
}

/** Deterministic 0..1 from an integer, for jitter that survives a reload. */
const jit = (i, s = 1) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * A long bar in several shorter ones, each a hair off the line and a hair off
 * true, with an open joint between them. A 3 m rack rail as one box has a dead
 * straight specular line down its whole length and no joints at all, which is
 * the single loudest "extruded in software" cue on the truck. `sag` droops the
 * middle sections, which is what an unsupported welded rail actually does.
 */
function segBar(k, key, { len, w, h, pos, axis = 'z', segs = 3, cut = 0.014, seed = 1, sag = 0, wob = 0.0016 }) {
  const [px, py, pz] = pos;
  let at = -len / 2;
  for (let i = 0; i < segs; i++) {
    const f = (0.78 + jit(i * 3 + 1, seed) * 0.44) / segs;
    const l = Math.max(0.04, len * f - cut);
    const c = at + l / 2 + cut / 2;
    at += l + cut;
    const droop = sag * Math.sin((Math.min(1, Math.max(0, (c + len / 2) / len)) * Math.PI));
    const j1 = (jit(i * 3 + 2, seed) - 0.5) * wob * 2;
    const j2 = (jit(i * 3 + 3, seed) - 0.5) * wob * 2;
    const geo = axis === 'z' ? gbox(w, h, l, Math.min(w, h) * 0.24) : gbox(l, h, w, Math.min(w, h) * 0.24);
    const p = axis === 'z' ? [px + j1, py - droop + j2, pz + c] : [px + c, py - droop + j2, pz + j1];
    k.add(key, geo, { pos: p, rot: axis === 'z' ? [j2 * 0.6, 0, 0] : [0, 0, j1 * 0.6] });
  }
}

/**
 * Weld bead round a joint: a torus with the segment radii pushed about, so it
 * reads as a hand-laid fillet rather than a moulded ring. Every joint on a
 * fabricated steel rack has one and CG racks never do.
 */
function weldBead(k, key, { pos, r, tube: tr = 0.007, rot = [0, 0, 0], seed = 1, seg = 12 }) {
  const g = new THREE.TorusGeometry(r, tr, 4, seg);
  const p = g.attributes.position;
  const c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    c.set(p.getX(i), p.getY(i), p.getZ(i));
    const ring = Math.atan2(c.y, c.x);
    const s = 0.72 + jit(Math.round(ring * 6) + i * 0.0001, seed) * 0.7;
    const n = c.clone().setZ(0).normalize();
    const d = c.clone().sub(n.multiplyScalar(r));
    p.setXYZ(i, c.x + d.x * (s - 1), c.y + d.y * (s - 1), d.z * s);
  }
  g.computeVertexNormals();
  k.add(key, g, { pos, rot });
}

export function buildDetails() {
  const k = new GearKit('gear');
  roofRack(k);
  lightBar(k);
  winch(k);
  snorkel(k);
  bedGear(k);
  sideGear(k);
  mudFlaps(k);
  pillarSpot(k);
  swingOut(k);
  fridgeSlide(k);
  return k;
}

// Rack datums. Everything bolted to the rack reads off these so the gear sits
// on the deck rather than near it.
const RACK = {
  railX: 0.795,
  baseY: 2.1, // lower rail centre
  topY: 2.215, // upper rail centre, level with the light bar
  deckY: 2.14, // top of the floor slats
  zF: 0.91,
  zR: -2.06,
  zSplit: -0.9, // cab section ends, bed section begins
};

/**
 * Welded box-section rack. The previous one was round tube in a single dark
 * material with a flat mesh plane inside it, which from every camera resolved
 * into one silhouette. Three things fix that and all of them are real
 * hardware: a two-tier rail with uprights so the frame has an inside and an
 * outside, a slatted floor that catches light between the slats, and a satin
 * wear strip along the top rail so the rack has a bright top edge.
 */
function roofRack(k) {
  const { railX, baseY, topY, deckY, zF, zR } = RACK;
  const midZ = (zF + zR) * 0.5;
  const L = zF - zR;

  // Rails in welded lengths rather than 3 m extrusions, with the top rail
  // drooping between its legs and the satin wear strip only where boots and gear
  // actually land on it. As single boxes these were four dead-straight 3 m
  // highlights across the top of the frame.
  for (const side of [-1, 1]) {
    const x = side * railX;
    segBar(k, 'steelDark', { len: L, w: 0.05, h: 0.055, pos: [x, baseY, midZ], segs: 3, seed: 11 + side, cut: 0.012 });
    segBar(k, 'steelDark', {
      len: L,
      w: 0.055,
      h: 0.06,
      pos: [x, topY, midZ],
      segs: 4,
      seed: 21 + side,
      cut: 0.013,
      sag: 0.006,
    });
    for (const [i, [zc, wl]] of [[zF - 0.5, 0.62], [midZ + 0.1, 0.74], [zR + 0.55, 0.5]].entries()) {
      k.add('alu', gbox(0.032, 0.013, wl, 0.004), {
        pos: [x, topY + 0.036 - (i === 1 ? 0.004 : 0), zc],
        rot: [(jit(i, 5) - 0.5) * 0.02, 0, 0],
      });
    }
    // uprights closing the fence between the two rails, with a fillet at each foot
    for (let i = 0; i <= 7; i++) {
      const uz = zF - 0.06 - (i / 7) * (L - 0.12);
      k.add('steelDark', gbox(0.036, 0.115, 0.036, 0.008), { pos: [x, (baseY + topY) * 0.5, uz] });
      if (i % 2 === 0) {
        weldBead(k, 'steel', {
          pos: [x, baseY + 0.03, uz],
          r: 0.024,
          tube: 0.005,
          rot: [Math.PI / 2, 0, 0],
          seed: 30 + i,
          seg: 10,
        });
      }
    }
  }
  // front and rear crossmembers at both levels, plus corner gussets
  for (const z of [zF, zR]) {
    segBar(k, 'steelDark', { len: railX * 2, w: 0.05, h: 0.055, pos: [0, baseY, z], axis: 'x', segs: 2, seed: 41 + z, cut: 0.011 });
    segBar(k, 'steelDark', { len: railX * 2, w: 0.055, h: 0.06, pos: [0, topY, z], axis: 'x', segs: 3, seed: 51 + z, cut: 0.012, sag: 0.004 });
    k.add('alu', gbox(railX * 1.1, 0.013, 0.032, 0.004), { pos: [0.06, topY + 0.036, z] });
    for (const side of [-1, 1]) {
      k.add('steelDark', gbox(0.04, 0.1, 0.1, 0.01), {
        pos: [side * (railX - 0.06), topY - 0.02, z - Math.sign(z) * 0.07],
        rot: [Math.sign(z) * 0.7, 0, 0],
      });
      // corner welds, where the rails meet the crossmember
      for (const y of [baseY, topY]) {
        weldBead(k, 'steel', {
          pos: [side * railX, y, z - Math.sign(z) * 0.028],
          r: 0.031,
          tube: 0.0065,
          rot: [0, 0, 0],
          seed: side * 7 + y * 3 + z,
          seg: 12,
        });
      }
    }
  }
  // floor: slats with real gaps between them, and mesh under the cab section
  const slats = 11;
  for (let i = 0; i < slats; i++) {
    const z = zF - 0.09 - (i / (slats - 1)) * (L - 0.18);
    k.add('steelDark', gbox(railX * 2 - 0.05, 0.02, 0.062, 0.005), { pos: [0, deckY - 0.01, z] });
  }
  k.add('mesh', new THREE.PlaneGeometry(railX * 2 - 0.06, 1.72), {
    pos: [0, deckY - 0.028, (zF + RACK.zSplit) * 0.5],
    rot: [-Math.PI / 2, 0, 0],
  });

  rackFeet(k);
  rackGear(k);
}

/**
 * Mounts. Over the cab the rack lands on the drip rails; over the bed there is
 * no roof under it, so it is carried on uprights off the bed rail. The old rack
 * simply floated back there, which is visible from the rear camera.
 */
function rackFeet(k) {
  const { railX, baseY } = RACK;
  for (const side of [-1, 1]) {
    const x = side * railX;
    // The stack used to be 120 mm tall hung off the rail, but there are only 77
    // between the rail and the roof skin at this x — so the plate and its gasket
    // both sat inside the roof panel and the rack appeared to grow out of the
    // steel. Seated on the crown instead: the roof section runs from +0.056 at
    // the centreline to 0 at x = 0.82, which puts the skin at 2.023 under a foot
    // at railX, and the whole stack is short enough to fit above it.
    const roofTop = S.roofY + 0.0034;
    for (const z of [0.8, -0.05, -0.8]) {
      k.add('trim', gbox(0.145, 0.012, 0.15, 0.005), { pos: [x, roofTop + 0.004, z] });
      k.add('alu', gbox(0.13, 0.014, 0.135, 0.005), { pos: [x, roofTop + 0.017, z] });
      k.add('steelDark', gbox(0.058, 0.058, 0.085, 0.014), { pos: [x, roofTop + 0.053, z] });
      for (const dx of [-0.044, 0.044]) {
        for (const dz of [-0.046, 0.046]) {
          k.add('steel', bolt(0.011, 0.008), { pos: [x + dx, roofTop + 0.023, z + dz] });
        }
      }
    }
    // bed-section legs: base plate on the bed rail, upright, diagonal brace
    const footY = S.bedTopY + 0.062;
    for (const z of [-1.18, -1.94]) {
      const h = baseY - 0.028 - footY;
      k.add('steelDark', gbox(0.055, h, 0.055, 0.012), { pos: [x, footY + h * 0.5, z] });
      k.add('alu', gbox(0.1, 0.016, 0.14, 0.005), { pos: [x, footY - 0.006, z] });
      for (const dz of [-0.05, 0.05]) {
        k.add('steel', bolt(0.012, 0.009), { pos: [x, footY + 0.008, z + dz] });
      }
      k.add('steelDark', gbox(0.04, 0.055, 0.09, 0.01), { pos: [x, baseY - 0.045, z] });
    }
    k.add('steelDark', tube(
      [
        [x, footY + 0.1, -1.18],
        [x - side * 0.01, (footY + baseY) * 0.5, -1.56],
        [x, baseY - 0.09, -1.94],
      ],
      0.019,
      8,
    ));
  }
}

/**
 * A 20 litre can: stamped X on both faces, triple handle, vented cap. `key`
 * picks the shell material — four accent-orange cans in one frame stopped being
 * an accent and became a slab, so the fuel pair is orange and the water pair is
 * moulded black.
 */
function jerryCan(k, x, z, y, rot = 0, key = 'paintAccent') {
  const w = 0.335;
  const h = 0.45;
  const d = 0.17;
  k.add(key, rbox(w, h, d, 0.028), { pos: [x, y + h * 0.5, z], rot: [0, rot, 0] });
  const diag = Math.atan2(h * 0.72, w * 0.72);
  for (const dz of [-1, 1]) {
    k.add(key, gbox(w - 0.05, h - 0.06, 0.016, 0.006), {
      pos: [x + Math.sin(rot) * dz * (d * 0.5 + 0.006), y + h * 0.5, z + Math.cos(rot) * dz * (d * 0.5 + 0.006)],
      rot: [0, rot, 0],
    });
    for (const s of [-1, 1]) {
      k.add(key, gbox(Math.hypot(w * 0.78, h * 0.78), 0.03, 0.014, 0.005), {
        pos: [x + Math.sin(rot) * dz * (d * 0.5 + 0.016), y + h * 0.5, z + Math.cos(rot) * dz * (d * 0.5 + 0.016)],
        rot: [0, rot, s * diag],
      });
    }
  }
  // top plate and the three handles that make a jerry can a jerry can
  k.add('steelDark', gbox(w + 0.008, 0.028, d + 0.008, 0.008), { pos: [x, y + h + 0.008, z], rot: [0, rot, 0] });
  for (let i = -1; i <= 1; i++) {
    k.add('steelDark', gbox(0.028, 0.05, d - 0.03, 0.008), {
      pos: [x + Math.cos(rot) * i * 0.1, y + h + 0.038, z - Math.sin(rot) * i * 0.1],
      rot: [0, rot, 0],
    });
  }
  k.add('steelDark', gbox(w - 0.03, 0.024, 0.03, 0.008), { pos: [x, y + h + 0.058, z], rot: [0, rot, 0] });
  k.add('trimGloss', new THREE.CylinderGeometry(0.036, 0.038, 0.03, 14), {
    pos: [x + Math.sin(rot) * 0.055, y + h + 0.03, z + Math.cos(rot) * 0.055],
  });
  k.add('steel', gbox(0.012, 0.012, 0.06, 0.003), {
    pos: [x + Math.sin(rot) * 0.055, y + h + 0.05, z + Math.cos(rot) * 0.055],
    rot: [0.4, rot, 0],
  });
}

/**
 * A strap over a box: band across the top, a run down each side, a cam buckle
 * and a loose tail. Strapping is what turns "objects resting on a frame" into
 * "somebody tied this down", and the buckle is the part that reads at distance.
 */
function lashing(k, { x, z, y0, y1, halfW, buckle = 1 }) {
  const h = y1 - y0;
  k.add('canvasTop', gbox(halfW * 2 + 0.03, 0.012, 0.05, 0.004), { pos: [x, y1 + 0.008, z] });
  for (const s of [-1, 1]) {
    k.add('canvasTop', gbox(0.014, h, 0.05, 0.004), { pos: [x + s * (halfW + 0.012), y0 + h * 0.5, z] });
  }
  const bx = x + buckle * (halfW + 0.014);
  k.add('alu', gbox(0.03, 0.055, 0.062, 0.007), { pos: [bx, y0 + h * 0.34, z] });
  k.add('steel', new THREE.CylinderGeometry(0.007, 0.007, 0.058, 8), {
    pos: [bx + buckle * 0.014, y0 + h * 0.34 + 0.018, z],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('canvasTop', gbox(0.01, 0.11, 0.046, 0.003), {
    pos: [bx + buckle * 0.012, y0 + h * 0.34 - 0.078, z],
    rot: [0, 0, buckle * 0.22],
  });
}

/** What is actually strapped up there. Each item has to be nameable at a glance. */
function rackGear(k) {
  const { deckY, railX } = RACK;

  // two cans across the front of the deck, one fuel one water
  jerryCan(k, -0.5, 0.62, deckY);
  jerryCan(k, -0.155, 0.62, deckY, 0, 'trim');
  lashing(k, { x: -0.33, z: 0.62, y0: deckY, y1: deckY + 0.52, halfW: 0.36, buckle: -1 });

  // hard case beside them, with a lid lip, ribs and two latches
  const cx = 0.4;
  const cz = 0.5;
  k.add('trim', rbox(0.66, 0.24, 0.52, 0.03), { pos: [cx, deckY + 0.12, cz] });
  k.add('trimGloss', gbox(0.68, 0.03, 0.54, 0.01), { pos: [cx, deckY + 0.248, cz] });
  for (const dx of [-0.19, 0.19]) {
    k.add('trim', gbox(0.05, 0.2, 0.53, 0.012), { pos: [cx + dx, deckY + 0.115, cz] });
  }
  for (const dz of [-0.13, 0.13]) {
    k.add('alu', gbox(0.07, 0.045, 0.03, 0.008), { pos: [cx, deckY + 0.216, cz + 0.264 + dz * 0.02] });
  }
  k.add('steelDark', gbox(0.24, 0.024, 0.05, 0.008), { pos: [cx, deckY + 0.276, cz] });
  lashing(k, { x: cx, z: cz, y0: deckY, y1: deckY + 0.29, halfW: 0.35 });

  // Awning rolled along the outboard rail, on its own brackets. A rolled sheet
  // is not a turned cylinder: the second, offset body takes the section off
  // round, and the creases are where the fabric has folded on itself. As one
  // smooth 1.6 m tube it read as a length of pipe, which is the same failure the
  // snorkel had and it sits along the roofline in every hero framing.
  const ax = railX - 0.1;
  const ay = deckY + 0.1;
  k.add('canvasTop', new THREE.CylinderGeometry(0.082, 0.079, 1.62, 14), {
    pos: [ax, ay, -0.72],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('canvasTop', new THREE.CylinderGeometry(0.073, 0.075, 1.58, 12), {
    pos: [ax + 0.012, ay + 0.014, -0.72],
    rot: [Math.PI / 2, 0, 0.05],
  });
  for (const [i, a] of [0.1, 0.72, 1.35, 2.1, 2.9, -0.6].entries()) {
    const r = 0.078 + jit(i, 9) * 0.006;
    k.add('canvasTop', gbox(0.026, 0.026, 1.5 - jit(i, 3) * 0.3, 0.006), {
      pos: [ax + Math.cos(a) * r, ay + Math.sin(a) * r, -0.72 + (jit(i, 5) - 0.5) * 0.16],
      rot: [0, 0, a],
    });
  }
  // Lap edge: the loose end of the outer wrap, running most of the length with
  // its own shadow under it. Creases alone are symmetric about the roll and read
  // as flutes turned into a pipe; the thing that says rolled sheet is one edge
  // that stops, and one dark line under it that follows the section round.
  k.add('canvasTop', gbox(0.05, 0.012, 1.44, 0.004), { pos: [ax + 0.052, ay - 0.058, -0.75], rot: [0, 0, -0.55] });
  k.add('gap', gbox(0.042, 0.004, 1.42, 0.001), { pos: [ax + 0.046, ay - 0.07, -0.75], rot: [0, 0, -0.55] });
  for (const dz of [-0.81, 0.81]) {
    k.add('trim', new THREE.CylinderGeometry(0.09, 0.09, 0.045, 14), {
      pos: [ax, ay, -0.72 + dz],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('alu', new THREE.CylinderGeometry(0.052, 0.052, 0.014, 12), {
      pos: [ax, ay, -0.72 + dz * 1.055],
      rot: [Math.PI / 2, 0, 0],
    });
  }
  // the free end of the sheet hanging out of the roll
  k.add('canvasTop', gbox(0.11, 0.014, 0.22, 0.004), { pos: [ax + 0.05, ay - 0.06, 0.24], rot: [0.2, 0, 0.7] });
  for (const dz of [-0.55, 0.5]) {
    k.add('alu', gbox(0.03, 0.075, 0.05, 0.008), { pos: [ax + 0.09, deckY + 0.06, -0.72 + dz] });
    k.add('steelDark', bend(0.09, 0.011, Math.PI * 0.9), {
      pos: [ax, deckY + 0.1, -0.72 + dz],
      rot: [0, Math.PI / 2, -Math.PI * 0.45],
    });
  }
  for (const dz of [-0.3, 0.35]) {
    k.add('canvasTop', gbox(0.19, 0.014, 0.04, 0.004), { pos: [ax, deckY + 0.185, -0.72 + dz] });
  }

  // sand ladder flat along the near rail, in the bay the jack used to have
  const lx = -railX + 0.15;
  k.add('alu', gbox(0.19, 0.026, 1.32, 0.006), { pos: [lx, deckY + 0.026, -0.62] });
  for (let i = 0; i < 11; i++) {
    k.add('steelDark', gbox(0.14, 0.03, 0.03, 0.006), { pos: [lx, deckY + 0.03, -1.2 + i * 0.116] });
  }
  for (const dz of [-1.18, 0.02] ) {
    k.add('alu', gbox(0.2, 0.04, 0.05, 0.008), { pos: [lx, deckY + 0.034, -0.62 + dz] });
  }
  for (const dz of [-0.9, 0.3]) {
    k.add('canvasTop', gbox(0.24, 0.014, 0.042, 0.004), { pos: [lx, deckY + 0.052, -0.62 + dz] });
  }

  roofTent(k);
}

/**
 * Roof tent, folded, across the rear bay of the rack — where the rolled swag
 * was. This is the one object that says *safari* from any distance: a flat
 * khaki slab a third of a metre high over the bed, in a PVC travel cover with
 * the zip line round it, cinched down with two straps, its ladder stowed flat
 * along one edge. The cover is not one box: the mattress inside it humps the
 * lid, the sides bag out under the straps and the corners are dragged down by
 * the buckles, which is what tells a stuffed cover from a plastic case.
 */
function roofTent(k) {
  const { deckY } = RACK;
  const cz = -1.5;
  const L = 1.08; // along z
  const W = 1.16; // across
  const H = 0.27;
  const y0 = deckY;
  // aluminium base plate and the two hinge extrusions it folds about
  k.add('alu', gbox(W + 0.02, 0.024, L + 0.02, 0.006), { pos: [0, y0 + 0.012, cz] });
  for (const dx of [-W * 0.5 - 0.004, W * 0.5 + 0.004]) {
    k.add('trimGloss', gbox(0.03, 0.05, L - 0.06, 0.008), { pos: [dx, y0 + 0.04, cz] });
  }
  // the cover: lower body, then a slightly narrower, humped lid section so the
  // slab has a waist where the zip runs
  // A black PVC skirt round the base, then the khaki cover over it: a tan slab
  // on a tan-lit roof was reading as a crate, and the two-tone split at the
  // waist is what every folded roof tent actually shows from the ground.
  k.add('trimGloss', rbox(W + 0.01, H * 0.3, L + 0.01, 0.03), { pos: [0, y0 + 0.024 + H * 0.15, cz] });
  k.add('canvasKhaki', rbox(W, H * 0.4, L, 0.05), { pos: [0, y0 + 0.024 + H * 0.45, cz] });
  k.add('canvasKhaki', rbox(W - 0.03, H * 0.5, L - 0.03, 0.075), { pos: [0, y0 + 0.024 + H * 0.75, cz] });
  // corner protectors on the cover
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      k.add('trimGloss', rbox(0.09, H * 0.5, 0.09, 0.02), {
        pos: [dx * (W * 0.5 - 0.035), y0 + 0.024 + H * 0.6, cz + dz * (L * 0.5 - 0.035)],
      });
    }
  }
  // mattress hump under the lid, and sag between the straps
  k.add('canvasKhaki', new THREE.SphereGeometry(0.5, 12, 8), {
    pos: [0, y0 + 0.024 + H * 0.62, cz],
    scale: [W * 0.92, H * 0.55, L * 0.92],
  });
  // zip line round the waist, in two lengths with the slider at the corner
  k.add('gap', gbox(W + 0.004, 0.012, L + 0.004, 0.002), { pos: [0, y0 + 0.024 + H * 0.52, cz] });
  k.add('alu', gbox(0.02, 0.03, 0.05, 0.004), { pos: [W * 0.5 - 0.04, y0 + 0.024 + H * 0.52, cz + L * 0.5 - 0.02] });
  k.add('canvasKhaki', gbox(0.02, 0.05, 0.02, 0.004), { pos: [W * 0.5 - 0.02, y0 + 0.024 + H * 0.5 - 0.03, cz + L * 0.5 - 0.02] });
  // straps over the cover down to the rack rails, buckles outboard
  for (const dz of [-0.3, 0.32]) {
    lashing(k, { x: 0, z: cz + dz, y0: y0 + 0.02, y1: y0 + 0.024 + H, halfW: W * 0.5, buckle: dz < 0 ? -1 : 1 });
  }
  // the fabric bags out between the straps: a soft ridge along each long edge
  for (const dx of [-1, 1]) {
    k.add('canvasKhaki', new THREE.CylinderGeometry(0.035, 0.035, L - 0.2, 8), {
      pos: [dx * (W * 0.5 - 0.02), y0 + 0.024 + H * 0.78, cz],
      rot: [Math.PI / 2, 0, 0],
    });
  }
  // Telescopic ladder folded flat and strapped on top along the near edge,
  // rungs and all: a ladder is the second thing that says roof tent.
  const lx = -W * 0.5 + 0.16;
  const ly = y0 + 0.024 + H + 0.03;
  for (const dx of [-0.1, 0.1]) {
    k.add('alu', gbox(0.03, 0.03, L - 0.16, 0.006), { pos: [lx + dx, ly, cz] });
  }
  for (let i = 0; i < 7; i++) {
    k.add('alu', new THREE.CylinderGeometry(0.011, 0.011, 0.2, 8), {
      pos: [lx, ly, cz - (L - 0.28) * 0.5 + i * ((L - 0.28) / 6)],
      rot: [0, 0, Math.PI / 2],
    });
  }
  for (const dz of [-0.28, 0.3]) {
    k.add('canvasTop', gbox(0.26, 0.012, 0.04, 0.004), { pos: [lx, ly + 0.02, cz + dz] });
    k.add('alu', gbox(0.03, 0.04, 0.05, 0.006), { pos: [lx - 0.14, ly - 0.005, cz + dz] });
  }
  // label patch on the rear face, the one panel the rear camera sees square
  k.add('decalBadge', new THREE.PlaneGeometry(0.28, 0.084), {
    pos: [0.2, y0 + 0.024 + H * 0.3, cz - L * 0.5 - 0.003],
    rot: [0, Math.PI, 0],
  });
}

/**
 * Pillar spotlight on the driver's side. A safari truck's night work is done
 * with a hand lamp off the A pillar, not the light bar, and it is a strongly
 * named silhouette that sits exactly where the hero camera looks: a drum on a
 * ball joint on a clamp, with a handle off the back of it.
 */
function pillarSpot(k) {
  const x = S.bodyHalfWidth - 0.02;
  const y = S.beltlineY + 0.44;
  // where the pillar is at this height
  const t = (y - (S.beltlineY - 0.02)) / (S.roofY - S.beltlineY + 0.02);
  const z = S.windshieldBottomZ + 0.03 - t * (S.windshieldBottomZ - S.windshieldTopZ);
  const px = x - 0.035 - t * 0.07;
  // clamp round the pillar: two halves and their bolts
  k.add('steelDark', gbox(0.07, 0.05, 0.08, 0.01), { pos: [px + 0.02, y, z], rot: [-0.9, 0, 0] });
  k.add('steelDark', gbox(0.05, 0.05, 0.08, 0.01), { pos: [px - 0.03, y, z], rot: [-0.9, 0, 0] });
  for (const dz of [-0.025, 0.025]) {
    k.add('steel', bolt(0.009, 0.007), { pos: [px + 0.055, y + dz * 0.6, z + dz], rot: [0, 0, -Math.PI / 2] });
  }
  // stalk out from the clamp, ball joint, then the drum
  k.add('steelDark', new THREE.CylinderGeometry(0.011, 0.011, 0.09, 10), {
    pos: [px + 0.09, y + 0.01, z],
    rot: [0, 0, Math.PI / 2],
  });
  const bx = px + 0.14;
  k.add('trimGloss', new THREE.SphereGeometry(0.024, 12, 8), { pos: [bx, y + 0.012, z] });
  k.add('steelDark', gbox(0.03, 0.06, 0.03, 0.006), { pos: [bx, y + 0.045, z] });
  // Drum, aimed forward and a touch down: a lamp left where it was last used.
  const dy = y + 0.085;
  const rot = [0.1, 0.12, 0];
  const dz = z + 0.02;
  k.add('trimGloss', new THREE.CylinderGeometry(0.068, 0.062, 0.1, 18), { pos: [bx, dy, dz], rot: [Math.PI / 2 + rot[0], rot[1], 0] });
  k.add('trimGloss', new THREE.CylinderGeometry(0.03, 0.05, 0.03, 12), { pos: [bx, dy + 0.006, dz - 0.062], rot: [Math.PI / 2 + rot[0], rot[1], 0] });
  k.add('reflector', new THREE.CylinderGeometry(0.06, 0.028, 0.05, 18, 1, true), {
    pos: [bx + 0.003, dy - 0.003, dz + 0.03],
    rot: [Math.PI / 2 + rot[0], rot[1], 0],
  });
  k.add('headlight', new THREE.SphereGeometry(0.012, 10, 8), { pos: [bx + 0.003, dy - 0.003, dz + 0.02] });
  k.add('lensClear', new THREE.CircleGeometry(0.06, 20), { pos: [bx + 0.006, dy - 0.006, dz + 0.056], rot: [rot[0], rot[1], 0] });
  k.add('chrome', new THREE.TorusGeometry(0.063, 0.005, 6, 20), { pos: [bx + 0.006, dy - 0.006, dz + 0.054], rot: [rot[0], rot[1], 0] });
  // handle off the back, and the coiled lead down into the door
  k.add('trimGloss', gbox(0.024, 0.024, 0.08, 0.006), { pos: [bx, dy - 0.06, dz - 0.07], rot: [-0.6, 0, 0] });
  k.add('rubber', tube(
    [
      [bx, dy - 0.04, dz - 0.08],
      [bx + 0.02, y - 0.09, z - 0.02],
      [px + 0.06, y - 0.2, z + 0.02],
    ],
    0.006,
    6,
  ));
}

/**
 * Spare on a swing-out carrier off the rear bumper. The spare used to lie flat
 * in the bed, where no camera saw it; a wheel standing up behind the tailgate
 * is the largest single object on the back of the truck and the clearest read
 * of what kind of truck it is. Hinge post on the near corner of the bumper,
 * a box-section arm across to a latch on the far side, the wheel bolted to a
 * plate on the arm with a brace up to the top of the post.
 */
function swingOut(k) {
  const rz = -2.55; // bumper bar centre
  const hx = 0.86;
  const hz = rz - 0.19;
  const hy0 = 0.9;
  const hy1 = 1.62;
  // hinge post with its brackets back to the bumper and the pin caps
  k.add('steelDark', new THREE.CylinderGeometry(0.03, 0.03, hy1 - hy0, 14), { pos: [hx, (hy0 + hy1) * 0.5, hz] });
  for (const y of [hy0 + 0.05, hy1 - 0.08]) {
    k.add('steelDark', gbox(0.09, 0.06, 0.14, 0.01), { pos: [hx - 0.01, y, hz + 0.09] });
    k.add('steel', new THREE.CylinderGeometry(0.036, 0.036, 0.02, 14), { pos: [hx, y + (y > 1.2 ? 0.045 : -0.045), hz] });
    weldBead(k, 'steel', { pos: [hx, y + (y > 1.2 ? 0.032 : -0.032), hz], r: 0.031, tube: 0.006, rot: [Math.PI / 2, 0, 0], seed: 5 + y });
  }
  k.add('steel', bolt(0.014, 0.01), { pos: [hx, hy1 + 0.01, hz], rot: [0, 0, 0] });
  // arm: box section from the post across the gate, in two lengths with a
  // gusset at the post
  const ay = 1.12;
  const az = hz - 0.03;
  const ax1 = -0.36;
  segBar(k, 'steelDark', { len: hx - ax1, w: 0.07, h: 0.09, pos: [(hx + ax1) * 0.5, ay, az], axis: 'x', segs: 2, seed: 91, cut: 0.008 });
  k.add('steelDark', gbox(0.14, 0.2, 0.06, 0.012), { pos: [hx - 0.09, ay + 0.07, az], rot: [0, 0, 0.6] });
  // brace from the post top down to the arm
  k.add('steelDark', tube(
    [
      [hx, hy1 - 0.06, az],
      [hx - 0.36, ay + 0.28, az],
      [hx - 0.62, ay + 0.06, az],
    ],
    0.016,
    8,
  ));
  // latch at the far end: a hook over a striker on a post off the bumper
  k.add('steelDark', gbox(0.06, 0.16, 0.06, 0.01), { pos: [ax1 + 0.03, ay - 0.1, az + 0.06] });
  k.add('steel', gbox(0.05, 0.05, 0.04, 0.008), { pos: [ax1 + 0.02, ay, az + 0.04] });
  k.add('paintAccent', gbox(0.05, 0.11, 0.02, 0.006), { pos: [ax1 + 0.02, ay + 0.06, az - 0.05], rot: [0, 0, 0.3] });
  k.add('steel', new THREE.CylinderGeometry(0.009, 0.009, 0.09, 8), { pos: [ax1 + 0.02, ay + 0.02, az - 0.02], rot: [Math.PI / 2, 0, 0] });
  // wheel mount: plate on the arm, then the wheel itself
  const wx = 0.16;
  const wy = 1.34;
  const R = S.wheelRadius - 0.02;
  const half = S.wheelWidth * 0.5 - 0.02;
  const wz = az - 0.03 - half;
  k.add('steelDark', gbox(0.09, wy - ay + 0.04, 0.07, 0.012), { pos: [wx, (wy + ay) * 0.5, az] });
  k.add('steel', new THREE.CylinderGeometry(0.15, 0.15, 0.018, 20), { pos: [wx, wy, az - 0.045], rot: [Math.PI / 2, 0, 0] });
  // tyre: carcass torus, then a ring of lug blocks so it reads as the same
  // rubber as the four on the axles rather than a doughnut
  const tubeR = half;
  k.add('rubber', new THREE.TorusGeometry(R - tubeR + 0.01, tubeR, 14, 36), { pos: [wx, wy, wz] });
  const lugs = 20;
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    const rr = R - 0.012;
    const w = 0.09 + jit(i, 3) * 0.02;
    for (const s of [-1, 1]) {
      k.add('tread', gbox(w, 0.05, half * 0.82, 0.01), {
        pos: [wx + Math.cos(a) * rr, wy + Math.sin(a) * rr, wz + s * half * 0.42],
        rot: [0, 0, a + Math.PI / 2 + s * 0.14],
      });
    }
  }
  // rim: dish, hub, lugs; the inner face is what the rear camera sees
  const dish = wz - 0.02;
  k.add('alu', new THREE.CylinderGeometry(R - tubeR + 0.01, R - tubeR - 0.02, 0.1, 24), { pos: [wx, wy, dish], rot: [Math.PI / 2, 0, 0] });
  k.add('gap', new THREE.CylinderGeometry(R - tubeR - 0.03, R - tubeR - 0.03, 0.02, 24), { pos: [wx, wy, dish - 0.045], rot: [Math.PI / 2, 0, 0] });
  k.add('alu', new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), { pos: [wx, wy, dish - 0.05], rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.add('steel', bolt(0.014, 0.012), { pos: [wx + Math.cos(a) * 0.065, wy + Math.sin(a) * 0.065, dish - 0.078], rot: [Math.PI / 2, 0, 0] });
    // spoke windows between the hub and the barrel
    k.add('gap', gbox(0.07, 0.11, 0.02, 0.01), {
      pos: [wx + Math.cos(a + 0.52) * 0.15, wy + Math.sin(a + 0.52) * 0.15, dish - 0.06],
      rot: [0, 0, a + 0.52],
    });
  }
  // the wheel's own three mounting nuts and a padlock chain
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    k.add('steel', new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), {
      pos: [wx + Math.cos(a) * 0.065, wy + Math.sin(a) * 0.065, dish - 0.095],
      rot: [Math.PI / 2, 0, 0],
    });
  }
  // recovery board straps and a shovel clipped to the arm? Keep it to a shovel
  // — the traction boards already live on the rack legs.
  k.add('steelDark', gbox(0.02, 0.02, 0.62, 0.004), { pos: [wx - 0.52, ay + 0.18, az + 0.02], rot: [0, 0, -0.35] });
  k.add('alu', gbox(0.16, 0.22, 0.012, 0.004), { pos: [wx - 0.62, ay - 0.15, az + 0.02], rot: [0, 0, -0.35] });
  for (const dy of [0.06, 0.3]) {
    k.add('steelDark', gbox(0.05, 0.03, 0.06, 0.006), { pos: [wx - 0.55 + dy * 0.36, ay + dy, az + 0.005] });
  }
}

/**
 * Fridge on a drawer slide in the bed, where the spare was. A 40 litre
 * compressor fridge is the third object every overland truck has and the one
 * that puts a hard, clean, coloured box against the bed's dark liner: grey
 * case, black lid with the latch line, the handle recess, a control panel on
 * the end, and the slide frame's rails and rollers showing under it. The lid
 * stands well above the bed rail so it reads from the hero camera.
 */
function fridgeSlide(k) {
  const floorY = S.bedFloorY + 0.042;
  const fx = 0.36;
  const fz = -1.72;
  const W = 0.44;
  const L = 0.76;
  const H = 0.48;
  // slide frame: two rails on the floor, the drawer plate above them, rollers
  for (const dx of [-0.17, 0.17]) {
    k.add('steelDark', gbox(0.04, 0.05, L + 0.1, 0.006), { pos: [fx + dx, floorY + 0.025, fz] });
    for (const dz of [-0.3, 0.3]) {
      k.add('trimGloss', new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), {
        pos: [fx + dx * 1.15, floorY + 0.04, fz + dz],
        rot: [0, 0, Math.PI / 2],
      });
    }
  }
  k.add('alu', gbox(W + 0.04, 0.02, L + 0.04, 0.005), { pos: [fx, floorY + 0.06, fz] });
  k.add('steelDark', gbox(W + 0.02, 0.03, 0.03, 0.005), { pos: [fx, floorY + 0.085, fz - L * 0.5 - 0.02] });
  // case: grey moulded body with a black lid; the lid overhangs and has a
  // rounded edge, which is what separates it from the toolbox
  const cy = floorY + 0.07;
  k.add('fridgeCase', rbox(W, H - 0.07, L, 0.02), { pos: [fx, cy + (H - 0.07) * 0.5, fz] });
  k.add('trimGloss', rbox(W + 0.01, 0.07, L + 0.01, 0.03), { pos: [fx, cy + H - 0.035, fz] });
  k.add('gap', gbox(W + 0.014, 0.006, L + 0.014, 0.001), { pos: [fx, cy + H - 0.07, fz] });
  // lid latches and the hinge line
  for (const dz of [-0.22, 0.22]) {
    k.add('trim', gbox(0.05, 0.06, 0.03, 0.006), { pos: [fx + W * 0.5 + 0.008, cy + H - 0.08, fz + dz] });
    k.add('alu', gbox(0.04, 0.03, 0.02, 0.004), { pos: [fx + W * 0.5 + 0.012, cy + H - 0.062, fz + dz] });
  }
  k.add('trim', gbox(0.03, 0.03, L - 0.1, 0.008), { pos: [fx - W * 0.5 - 0.004, cy + H - 0.05, fz] });
  // handle recesses in the end faces and a control panel on the rear end
  for (const s of [-1, 1]) {
    k.add('gap', gbox(0.16, 0.05, 0.02, 0.006), { pos: [fx, cy + H * 0.55, fz + s * (L * 0.5 + 0.004)] });
    k.add('fridgeCase', gbox(0.18, 0.02, 0.03, 0.004), { pos: [fx, cy + H * 0.55 + 0.03, fz + s * (L * 0.5 + 0.012)] });
  }
  k.add('trimGloss', gbox(0.14, 0.08, 0.012, 0.004), { pos: [fx, cy + H * 0.3, fz - L * 0.5 - 0.006] });
  k.add('cabinPanel', new THREE.PlaneGeometry(0.11, 0.05), { pos: [fx, cy + H * 0.3, fz - L * 0.5 - 0.013], rot: [0, Math.PI, 0] });
  // moulded ribs down the case sides
  for (let i = 0; i < 5; i++) {
    const z = fz - L * 0.5 + 0.1 + i * ((L - 0.2) / 4);
    k.add('fridgeCase', gbox(W + 0.012, H - 0.16, 0.02, 0.004), { pos: [fx, cy + (H - 0.16) * 0.5 + 0.03, z] });
  }
  // strapped down through the tie rails
  lashing(k, { x: fx, z: fz + 0.1, y0: floorY + 0.06, y1: cy + H, halfW: W * 0.5 + 0.006, buckle: 1 });
}

function lightBar(k) {
  const y = S.roofY + 0.2;
  const z = S.cabFrontZ + 0.02;
  const len = 1.32;
  // housing
  k.add('trim', gbox(len, 0.1, 0.1, 0.022), { pos: [0, y, z] });
  k.add('alu', gbox(len + 0.02, 0.03, 0.11, 0.01), { pos: [0, y - 0.06, z] });
  // individual optics
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (len / n);
    k.add('reflector', new THREE.CylinderGeometry(0.032, 0.026, 0.05, 14), {
      pos: [x, y, z + 0.045],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('headlight', new THREE.CylinderGeometry(0.024, 0.024, 0.01, 12), {
      pos: [x, y, z + 0.072],
      rot: [Math.PI / 2, 0, 0],
    });
  }
  k.add('lensClear', gbox(len - 0.02, 0.075, 0.012, 0.006), { pos: [0, y, z + 0.078] });
  // mounts
  for (const side of [-1, 1]) {
    k.add('steelDark', gbox(0.04, 0.14, 0.05, 0.01), { pos: [side * (len * 0.42), y - 0.1, z + 0.01] });
    k.add('steel', bolt(0.013, 0.01), { pos: [side * (len * 0.42), y - 0.02, z + 0.04], rot: [Math.PI / 2, 0, 0] });
  }
  // Wiring loom down the A pillar, with P-clips holding it to the pillar and a
  // rubber grommet where it goes through into the cab. A cable that runs from A
  // to B touching nothing is the classic CG cable; what makes it read is the
  // hardware that stops it flapping.
  const loom = [
    [0.5, y - 0.05, z],
    [0.66, S.roofY - 0.02, z - 0.05],
    [0.78, S.beltlineY + 0.4, S.windshieldBottomZ - 0.1],
  ];
  k.add('trim', tube(loom, 0.011));
  for (const t of [0.34, 0.66, 0.9]) {
    const i = t < 0.5 ? 0 : 1;
    const u = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    const p = [0, 1, 2].map((c) => loom[i][c] + (loom[i + 1][c] - loom[i][c]) * u);
    k.add('steel', new THREE.TorusGeometry(0.015, 0.0035, 4, 10), { pos: p, rot: [0.4, 0.5, 0] });
    k.add('steel', bolt(0.008, 0.006), { pos: [p[0] + 0.012, p[1], p[2] - 0.012], rot: [0, 0, Math.PI / 2] });
  }
  k.add('rubber', new THREE.TorusGeometry(0.019, 0.008, 6, 12), {
    pos: [0.775, S.beltlineY + 0.41, S.windshieldBottomZ - 0.09],
    rot: [0.3, 1.2, 0],
  });
}

/**
 * Winch.
 *
 * The old one was three plain cylinders on one axis with a flat plate in front
 * of them called a fairlead: no rope on the drum, no drum flanges, no tie rods,
 * and an "aperture" that was a dark bar rather than a hole. What names a winch
 * at ten metres is the drum flange / rope / flange stack and the roller frame,
 * so both of those are modelled and the housings are what got simplified.
 */
function winch(k) {
  const z = S.noseZ - 0.02;
  const y = 0.94;
  const alongX = [0, 0, Math.PI / 2];

  // rope on the drum, between two flanges: the one part of a winch that reads
  // from any distance, and the old one had a bare tube where it goes
  k.add('canvasTop', new THREE.CylinderGeometry(0.079, 0.079, 0.3, 18), { pos: [0, y, z], rot: alongX });
  for (let i = 0; i < 9; i++) {
    k.add('canvasTop', new THREE.TorusGeometry(0.0805, 0.0075, 4, 16), {
      pos: [-0.128 + i * 0.032, y, z],
      rot: [0, Math.PI / 2, 0],
    });
  }
  for (const sx of [-1, 1]) {
    k.add('steelDark', new THREE.CylinderGeometry(0.101, 0.101, 0.018, 20), { pos: [sx * 0.163, y, z], rot: alongX });
    k.add('steelDark', new THREE.CylinderGeometry(0.072, 0.072, 0.03, 14), { pos: [sx * 0.185, y, z], rot: alongX });
  }
  // motor one end, gearbox the other, so the two ends are not the same object
  k.add('steelDark', new THREE.CylinderGeometry(0.074, 0.074, 0.14, 16), { pos: [-0.27, y, z], rot: alongX });
  for (let i = 0; i < 5; i++) {
    k.add('steelDark', new THREE.TorusGeometry(0.077, 0.006, 4, 14), {
      pos: [-0.325 + i * 0.028, y, z],
      rot: [0, Math.PI / 2, 0],
    });
  }
  k.add('trim', new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), { pos: [-0.352, y, z], rot: alongX });
  k.add('steel', new THREE.CylinderGeometry(0.07, 0.062, 0.1, 16), { pos: [0.255, y, z], rot: alongX });
  k.add('alu', new THREE.CylinderGeometry(0.052, 0.052, 0.05, 14), { pos: [0.328, y, z], rot: alongX });
  k.add('steelDark', new THREE.CylinderGeometry(0.066, 0.066, 0.012, 16), { pos: [0.305, y, z], rot: alongX });
  for (let i = 0; i < 5; i++) {
    const a = -1.2 + i * 0.6;
    k.add('steel', bolt(0.008, 0.006), {
      pos: [0.309, y + Math.cos(a) * 0.05, z + Math.sin(a) * 0.05],
      rot: [0, 0, -Math.PI / 2],
    });
  }
  k.add('trimGloss', gbox(0.03, 0.05, 0.086, 0.01), { pos: [0.352, y + 0.006, z + 0.032], rot: [0.5, 0, 0] });
  // tie rods clamping the two housings to the drum flanges
  for (const [dy, dz] of [[0.062, 0.05], [-0.062, 0.05], [0.062, -0.05]]) {
    k.add('steel', new THREE.CylinderGeometry(0.009, 0.009, 0.63, 8), { pos: [0, y + dy, z + dz], rot: alongX });
  }
  // solenoid pack on the cradle, with two glands and a lead off each
  k.add('trim', gbox(0.2, 0.09, 0.12, 0.014), { pos: [0.0, y + 0.132, z - 0.01] });
  k.add('trimGloss', gbox(0.19, 0.016, 0.11, 0.005), { pos: [0.0, y + 0.182, z - 0.01] });
  for (const sx of [-1, 1]) {
    k.add('alu', new THREE.CylinderGeometry(0.014, 0.016, 0.026, 10), { pos: [sx * 0.055, y + 0.088, z + 0.02] });
    k.add('trim', tube(
      [
        [sx * 0.055, y + 0.082, z + 0.02],
        [sx * 0.085, y + 0.03, z + 0.055],
        [sx * 0.13, y - 0.03, z + 0.03],
      ],
      0.009,
      6,
    ));
  }
  k.add('paintAccent', gbox(0.07, 0.03, 0.006, 0.002), { pos: [0.045, y + 0.132, z + 0.062] });

  // --- roller fairlead ----------------------------------------------------
  // A hawse plate at this distance is a grey rectangle. Four rollers round an
  // opening is the silhouette people actually recognise. It sits low on the
  // bumper face rather than on the drum's own centreline — the first version was
  // the right object at the wrong size and place, and stood square in front of
  // the drum it is meant to feed.
  const fy = 0.82;
  const fz = z + 0.16;
  k.add('gap', gbox(0.2, 0.15, 0.03, 0.004), { pos: [0, fy, fz - 0.03] });
  // The frame was 56 mm deep with 38 mm rollers inside it, so all four sat in
  // their own well and the whole thing read as a picture frame bolted to the
  // bar. The frame is thinner than the rollers now and the rollers stand proud
  // of it, which is the way round a real one is and the only way the four
  // cylinders are part of the silhouette rather than shading inside it.
  for (const sx of [-1, 1]) {
    k.add('steelDark', gbox(0.032, 0.192, 0.034, 0.008), { pos: [sx * 0.12, fy, fz] });
    k.add('steel', new THREE.CylinderGeometry(0.024, 0.024, 0.096, 14), { pos: [sx * 0.09, fy, fz - 0.012] });
    for (const dy of [-0.078, 0.078]) {
      k.add('steel', bolt(0.011, 0.008), { pos: [sx * 0.12, fy + dy, fz + 0.018], rot: [Math.PI / 2, 0, 0] });
    }
  }
  for (const dy of [-0.088, 0.088]) {
    k.add('steelDark', gbox(0.272, 0.032, 0.034, 0.008), { pos: [0, fy + dy, fz] });
    k.add('steel', new THREE.CylinderGeometry(0.024, 0.024, 0.196, 14), {
      pos: [0, fy + dy * 0.66, fz + 0.014],
      rot: [0, 0, Math.PI / 2],
    });
  }
  // Rope out through the opening and stowed on the recovery eye at +0.34, with
  // the rubber stopper that keeps the thimble off the rollers. It used to run
  // straight from the fairlead to a hook hanging in mid air over the skid
  // plate: a taut line to nowhere, which is the one thing a stowed rope is not.
  k.add('canvasTop', tube(
    [
      [0.0, fy, fz - 0.02],
      [0.13, fy - 0.03, fz + 0.016],
      [0.252, fy - 0.085, fz - 0.012],
      [0.328, fy - 0.062, fz - 0.03],
    ],
    0.009,
    7,
  ));
  k.add('rubber', new THREE.SphereGeometry(0.026, 10, 7), { pos: [0.062, fy - 0.014, fz + 0.02], scale: [1, 0.85, 0.85] });
  k.add('alu', new THREE.TorusGeometry(0.016, 0.006, 5, 12), { pos: [0.323, fy - 0.064, fz - 0.028], rot: [0, 0.5, 0.7] });
  k.add('steel', new THREE.CylinderGeometry(0.008, 0.008, 0.034, 8), {
    pos: [0.334, fy - 0.043, fz - 0.032],
    rot: [0, 0, 0.35],
  });
  k.add('paintAccent', bend(0.028, 0.009, Math.PI * 1.35), { pos: [0.339, fy - 0.019, fz - 0.034], rot: [0, 0.5, -0.2] });
  // Battery leads back through the bumper: two heavy cables, a P-clip on each,
  // and a grommet where they pass through the crossmember. A 12 V winch with no
  // cable on it is the sort of thing only a render has.
  for (const [i, sx] of [-1, 1].entries()) {
    const lead = [
      [sx * 0.3, y - 0.03, z - 0.02],
      [sx * 0.34, y - 0.12, z - 0.16],
      [sx * 0.26, y - 0.1, z - 0.34],
      [sx * 0.2, y + 0.02, z - 0.46],
    ];
    k.add(i === 0 ? 'trim' : 'trimGloss', tube(lead, 0.0135, 6));
    k.add('steel', new THREE.TorusGeometry(0.019, 0.004, 4, 10), {
      pos: [sx * 0.3, y - 0.11, z - 0.25],
      rot: [1.3, 0, 0.3],
    });
    k.add('rubber', new THREE.TorusGeometry(0.021, 0.008, 6, 12), {
      pos: [sx * 0.204, y + 0.014, z - 0.45],
      rot: [0.2, 0, 0],
    });
    // terminal boot on the drum end
    k.add('paintAccent', new THREE.CylinderGeometry(0.016, 0.02, 0.028, 10), {
      pos: [sx * 0.298, y - 0.028, z - 0.012],
      rot: [1.4, 0, 0],
    });
  }
}

const _Y = new THREE.Vector3(0, 1, 0);
const _Z = new THREE.Vector3(0, 0, 1);

/** Quaternion taking a prototype's own axis onto `dir`. */
function align(axis, dir) {
  return new THREE.Quaternion().setFromUnitVectors(axis, dir.clone().normalize());
}

/**
 * Air ram.
 *
 * The old one was a single 110 mm tube swept from the wing to the roof in one
 * material, with two clamp rings that had been rotated onto the wrong axis and
 * so were buried inside it. That leaves a 1.4 m cylinder with no joint, no
 * fastener and no seam anywhere on it — one smooth grey silhouette, and one of
 * the biggest shapes in the hero framing.
 *
 * What a real one is: a lower section and a smaller upper section with a
 * convoluted joiner and a clamp at each end of it, a moulding parting line down
 * the whole length, two stays braced back to the A pillar, and a flanged elbow
 * bolted to the wing at the bottom. The old tube's lower end simply sank 30 mm
 * into the wing skin with nothing to say it went anywhere.
 */
function snorkel(k) {
  const curve = new THREE.CatmullRomCurve3(
    [
      [0.95, 1.4, 1.03],
      [0.96, 1.6, 0.93],
      [0.952, 1.79, 0.76],
      [0.936, 1.95, 0.605],
    ].map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'catmullrom',
    0.5,
  );
  const R_LOW = 0.053;
  const R_UP = 0.046;
  const JOIN = 0.46;
  const rAt = (t) => (t < JOIN ? R_LOW : R_UP);
  const at = (t) => ({ p: curve.getPointAt(t), T: curve.getTangentAt(t).normalize() });
  // outboard, projected off the tangent: the direction a clamp screw and the
  // moulding seam face. The fallback matters — projecting out a tangent that is
  // already +X leaves a zero vector, and normalising that is a NaN straight into
  // a vertex position.
  const outAt = (T) => {
    const v = new THREE.Vector3(1, 0, 0).addScaledVector(T, -T.x);
    return v.lengthSq() < 1e-8 ? new THREE.Vector3(0, 0, 1) : v.normalize();
  };
  const sub = (t0, t1, n) => {
    const p = [];
    for (let i = 0; i <= n; i++) p.push(curve.getPointAt(t0 + (t1 - t0) * (i / n)));
    return new THREE.CatmullRomCurve3(p, false, 'catmullrom', 0.5);
  };

  k.add('trim', new THREE.TubeGeometry(sub(0, JOIN + 0.012, 8), 12, R_LOW, 14, false));
  k.add('trim', new THREE.TubeGeometry(sub(JOIN - 0.012, 1, 8), 14, R_UP, 14, false));

  // Moulding parting line, offset off the tube's outboard face. A rotomoulded
  // tube always has one, and it is the only thing that breaks the single
  // unbroken specular stripe a smooth cylinder runs down its whole length.
  for (const [t0, t1, r] of [[0.015, JOIN - 0.03, R_LOW], [JOIN + 0.04, 0.975, R_UP]]) {
    const seam = [];
    for (let i = 0; i <= 6; i++) {
      const t = t0 + (t1 - t0) * (i / 6);
      const { p, T } = at(t);
      seam.push(p.clone().addScaledVector(outAt(T), r * 0.93));
    }
    k.add('trim', tube(seam, 0.0055, 6, 0.5));
  }

  // convoluted joiner between the two sections, with a clamp at each end of it
  for (let i = 0; i < 6; i++) {
    const t = JOIN - 0.05 + i * 0.02;
    const { p, T } = at(t);
    k.add('trim', new THREE.TorusGeometry(R_LOW + 0.002, 0.0095, 4, 14), { pos: p.toArray(), quat: align(_Z, T) });
  }

  // Clamps. The band is `steel`, not `alu`: at 26 mm of the brightest metal on
  // the truck, wrapped round a tube in full sun, each one came back as a solid
  // white ring and the snorkel read as a hose with gaffer tape on it. Narrower,
  // a stop darker, and the only bright part left is the screw housing, which is
  // 20 mm and is the thing the eye should be finding anyway.
  for (const t of [0.055, 0.375, 0.545, 0.94]) {
    const { p, T } = at(t);
    const r = rAt(t);
    const q = align(_Y, T);
    const out = outAt(T);
    k.add('steel', new THREE.CylinderGeometry(r + 0.007, r + 0.007, 0.018, 18, 1, true), { pos: p.toArray(), quat: q });
    for (const dy of [-0.0105, 0.0105]) {
      k.add('steel', new THREE.TorusGeometry(r + 0.0075, 0.0025, 4, 16), {
        pos: p.clone().addScaledVector(T, dy).toArray(),
        quat: align(_Z, T),
      });
    }
    const bp = p.clone().addScaledVector(out, r + 0.012);
    k.add('alu', gbox(0.02, 0.03, 0.018, 0.004), { pos: bp.toArray(), quat: q });
    k.add('steel', new THREE.CylinderGeometry(0.0055, 0.0055, 0.013, 8), {
      pos: bp.clone().addScaledVector(out, 0.013).toArray(),
      quat: align(_Y, out),
    });
  }

  // Stays back to the A pillar. Two flat straps, because a bolt-on that touches
  // the body nowhere between its two ends floats however good the tube is.
  for (const [t, pad] of [[0.16, [0.884, 1.5, 0.822]], [0.72, [0.845, 1.8, 0.6]]]) {
    const { p, T } = at(t);
    const r = rAt(t);
    const q = align(_Y, T);
    k.add('steelDark', new THREE.CylinderGeometry(r + 0.009, r + 0.009, 0.038, 16, 1, true), { pos: p.toArray(), quat: q });
    const a = p.clone().addScaledVector(outAt(T), -(r + 0.004));
    const b = new THREE.Vector3(pad[0], pad[1], pad[2]);
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.012, 0));
    for (const [c0, c1] of [[a, mid], [mid, b]]) {
      const d = c1.clone().sub(c0);
      k.add('steelDark', gbox(0.03, 0.01, d.length() + 0.012, 0.003), {
        pos: c0.clone().lerp(c1, 0.5).toArray(),
        quat: align(_Z, d),
      });
    }
    k.add('steelDark', gbox(0.016, 0.07, 0.05, 0.006), { pos: b.toArray() });
    for (const dy of [-0.02, 0.02]) {
      k.add('steel', bolt(0.008, 0.007), {
        pos: [b.x + 0.012, b.y + dy, b.z],
        rot: [0, 0, -Math.PI / 2],
      });
    }
    k.add('steel', bolt(0.008, 0.007), {
      pos: a.clone().addScaledVector(outAt(T), -0.008).toArray(),
      quat: align(_Y, outAt(T).negate()),
    });
  }

  // --- wing elbow ---------------------------------------------------------
  // A quarter bend into the panel, not a loop hanging off the bottom of the
  // tube: the first version came out of the curve still heading downwards and
  // read as a length of vacuum hose drooping onto the wing.
  const p0 = curve.getPointAt(0);
  k.add('trim', tube(
    [
      [p0.x + 0.001, p0.y + 0.012, p0.z + 0.002],
      [0.953, 1.312, 1.039],
      [0.947, 1.256, 1.044],
      [0.914, 1.234, 1.047],
    ],
    R_LOW,
    12,
    0.5,
  ));
  k.add('gap', rbox(0.008, 0.168, 0.216, 0.003), { pos: [0.883, 1.232, 1.047] });
  k.add('rubber', rbox(0.022, 0.156, 0.202, 0.014), { pos: [0.889, 1.232, 1.047] });
  k.add('trim', rbox(0.03, 0.138, 0.184, 0.018), { pos: [0.9, 1.232, 1.047] });
  k.add('trim', new THREE.CylinderGeometry(0.068, 0.074, 0.03, 16), {
    pos: [0.912, 1.234, 1.047],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('rubber', new THREE.TorusGeometry(0.06, 0.012, 6, 16), {
    pos: [0.922, 1.234, 1.047],
    rot: [0, Math.PI / 2, 0],
  });
  for (const dy of [-0.052, 0.052]) {
    for (const dz of [-0.076, 0.076]) {
      k.add('alu', rivet(0.013, 0.004), { pos: [0.907, 1.232 + dy, 1.047 + dz], rot: [0, 0, -Math.PI / 2] });
      k.add('steel', bolt(0.009, 0.007), { pos: [0.91, 1.232 + dy, 1.047 + dz], rot: [0, 0, -Math.PI / 2] });
    }
  }

  ramHead(k, curve);
}

/** A plane with tiling uvs, so an alpha-cutout screen actually repeats on it. */
function screen(w, h, ru, rv) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  return g;
}

/**
 * The head is the part people name on sight, so it gets the most work: a
 * rotatable collar clamped to the tube, a hooded mouth with louvres and a
 * screen down inside it, a moulding seam over the crown, and the drain slot
 * underneath that stops a ram filling with water.
 *
 * The mouth is deliberately over-built. A screen plane on the front of a box
 * resolves to a flat dark rectangle at any distance the truck is actually shot
 * from — what carries the read is the throat's own shadow and four slats
 * across it, because those are silhouette rather than texture.
 */
function ramHead(k, curve) {
  const tip = curve.getPointAt(1);
  const T = curve.getTangentAt(1).normalize();
  const hx = 0.945;
  const hy = 2.055;
  const hz = 0.565;

  // collar joint: this is where a real head rotates to face into the weather
  k.add('trim', new THREE.CylinderGeometry(0.056, 0.052, 0.05, 16), {
    pos: tip.clone().addScaledVector(T, 0.014).toArray(),
    quat: align(_Y, T),
  });
  k.add('alu', new THREE.CylinderGeometry(0.06, 0.06, 0.022, 18, 1, true), {
    pos: tip.clone().addScaledVector(T, 0.032).toArray(),
    quat: align(_Y, T),
  });
  k.add('trim', new THREE.CylinderGeometry(0.05, 0.058, 0.075, 14), {
    pos: [hx - 0.004, hy - 0.096, hz - 0.02],
    rot: [-0.32, 0, 0.06],
  });

  // body: a barrel behind, a wider mouth housing in front, a crown over both
  k.add('trim', rbox(0.096, 0.182, 0.098, 0.028), { pos: [hx, hy, hz - 0.038] });
  k.add('trim', rbox(0.116, 0.196, 0.076, 0.024), { pos: [hx, hy + 0.002, hz + 0.048] });
  // Crown, raked forward over the mouth. It was a flat lid, and with a flat lid
  // every line on this object was either horizontal or vertical: against a roof
  // rack made of the same box sections in the same material the head had no
  // outline of its own to be found by.
  k.add('trim', rbox(0.108, 0.042, 0.15, 0.026), { pos: [hx, hy + 0.108, hz + 0.012], rot: [-0.16, 0, 0] });
  k.add('trim', new THREE.SphereGeometry(0.054, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), {
    pos: [hx, hy + 0.124, hz + 0.012],
    scale: [1, 0.5, 1.34],
  });
  // crown seam and the mould ribs down the back
  k.add('gap', gbox(0.005, 0.19, 0.104, 0.001), { pos: [hx, hy, hz - 0.038] });
  for (const dx of [-0.028, 0.028]) {
    k.add('trim', gbox(0.012, 0.146, 0.011, 0.003), { pos: [hx + dx, hy - 0.004, hz - 0.086] });
  }

  // mouth: a throat with its own shadow, four slats across it, screen behind
  k.add('gap', rbox(0.094, 0.15, 0.062, 0.005), { pos: [hx, hy - 0.008, hz + 0.062] });
  k.add('mesh', screen(0.088, 0.142, 3, 5), { pos: [hx, hy - 0.008, hz + 0.05] });
  for (let i = 0; i < 4; i++) {
    k.add('trim', gbox(0.09, 0.013, 0.03, 0.003), {
      pos: [hx, hy - 0.058 + i * 0.034, hz + 0.086],
      rot: [-0.55, 0, 0],
    });
  }
  // bezel round the aperture, hood over the top of it, cheeks down the sides
  for (const dy of [-0.082, 0.082]) {
    k.add('trim', gbox(0.118, 0.024, 0.036, 0.008), { pos: [hx, hy - 0.008 + dy, hz + 0.086] });
  }
  for (const dx of [-0.055, 0.055]) {
    k.add('trim', gbox(0.014, 0.166, 0.04, 0.007), { pos: [hx + dx, hy - 0.008, hz + 0.084] });
  }
  k.add('trim', gbox(0.124, 0.022, 0.06, 0.009), { pos: [hx, hy + 0.098, hz + 0.09], rot: [-0.3, 0, 0] });
  // drain slot and the moulded lip under the mouth
  k.add('trim', gbox(0.104, 0.02, 0.054, 0.008), { pos: [hx, hy - 0.098, hz + 0.058], rot: [0.34, 0, 0] });
  k.add('gap', gbox(0.05, 0.006, 0.03, 0.001), { pos: [hx, hy - 0.104, hz + 0.042] });
  // pre-cleaner cap on the crown, so the top is not a flat lid
  k.add('trimGloss', new THREE.CylinderGeometry(0.034, 0.038, 0.022, 14), { pos: [hx, hy + 0.156, hz + 0.008] });
  k.add('steel', bolt(0.009, 0.008), { pos: [hx, hy + 0.168, hz + 0.008] });
}

function bedGear(k) {
  const hw = S.bodyHalfWidth;
  const bedZ = (S.bedFrontZ + S.bedRearZ) * 0.5;

  const floorY = S.bedFloorY + 0.042; // top of the liner ribs

  // Toolbox across the bulkhead: lid lip, end ribs, latches. Everything in here
  // used to be laid out by eye and the tyre, the box and the cans all ran
  // through each other, which is most of why the bed read as one mass.
  const tbZ = S.bedFrontZ - 0.27;
  const tbW = hw * 2 - 0.32;
  k.add('plate', rbox(tbW, 0.28, 0.4, 0.03), { pos: [0, floorY + 0.14, tbZ] });
  k.add('alu', gbox(tbW + 0.02, 0.032, 0.42, 0.012), { pos: [0, floorY + 0.292, tbZ] });
  k.add('steelDark', gbox(tbW - 0.04, 0.022, 0.05, 0.008), { pos: [0, floorY + 0.318, tbZ] });
  for (const sx of [-1, 1]) {
    k.add('plate', gbox(0.05, 0.24, 0.41, 0.012), { pos: [sx * (tbW * 0.5 - 0.05), floorY + 0.135, tbZ] });
    k.add('steelDark', gbox(0.1, 0.055, 0.045, 0.01), { pos: [sx * 0.38, floorY + 0.25, tbZ - 0.2] });
    k.add('alu', gbox(0.06, 0.04, 0.028, 0.007), { pos: [sx * 0.22, floorY + 0.275, tbZ - 0.202] });
  }

  // The spare used to lie flat here; it is on the swing-out now and the fridge
  // slide has its bay. The coil of rope it held stays, dropped by the cans.
  k.add('trim', new THREE.TorusGeometry(0.13, 0.028, 7, 20), {
    pos: [0.05, floorY + 0.028, -2.2],
    rot: [Math.PI / 2, 0.2, 0],
  });

  // jerry cans down the near side, stamped faces looking outboard, strapped to
  // the bedside. Their handles clear the rail so the pair reads from outside.
  const jz = -1.78;
  jerryCan(k, -0.44, jz, floorY, Math.PI / 2, 'trim');
  jerryCan(k, -0.655, jz, floorY, Math.PI / 2);
  lashing(k, { x: -0.548, z: jz, y0: floorY, y1: floorY + 0.49, halfW: 0.18, buckle: -1 });

  // rolled recovery strap in the back corner
  k.add('canvasTop', new THREE.TorusGeometry(0.11, 0.045, 8, 18), {
    pos: [-0.52, floorY + 0.05, -2.16],
    rot: [Math.PI / 2, 0, 0],
  });

  // tie-down cleats along the floor edges
  for (const sx of [-1, 1]) {
    for (const dz of [-0.6, 0.1, 0.62]) {
      k.add('steel', bend(0.028, 0.009, Math.PI), {
        pos: [sx * (hw - 0.16), floorY + 0.02, bedZ + dz],
        rot: [0, Math.PI / 2, 0],
      });
    }
  }
}

/**
 * Recovery gear hung on the outside of the bed-rack legs. On edge in the bed the
 * boards sit 50 mm below the rail and cannot be seen from any camera; outboard
 * on the rack they are the one item up here with a silhouette people name on
 * sight, and they put the truck's accent colour where the hero camera looks.
 */
function sideGear(k) {
  const zF = -1.18;
  const zR = -1.94;
  const cz = (zF + zR) * 0.5;

  // Traction boards, near side.
  //
  // A flat 940 x 320 slab facing straight outboard returns one value over its
  // whole area, and this is the most saturated object on the truck: in the rack
  // framing it was the first thing the eye landed on and it read as a sheet of
  // orange card with dots printed on it. A real board is dished along its
  // length and covered in moulded cleats, and both of those are value — the arc
  // sweeps the normal through fifteen degrees end to end, and forty studs
  // standing 12 mm proud each put a shadow next to themselves.
  //
  // Lugs and end holes stay in the matt black material: in the accent paint
  // their little outward faces each caught a clearcoat highlight and the row
  // read as pale stickers instead of moulded studs.
  const len = 0.94;
  const h = 0.32;
  const by = 1.78;
  const arc = (u) => 0.026 * u * u; // bow, ends outboard
  // Extruded from its own plan section rather than assembled from five rotated
  // slabs: the slabs each carried their own rounded ends, so every joint showed
  // as a pair of highlights and one moulding read as five tiles bolted up.
  const plan = [];
  const N = 12;
  const th = (u) => 0.011 - 0.005 * Math.abs(u) ** 3;
  for (let s = 0; s <= N; s++) {
    const u = (s / N) * 2 - 1;
    plan.push([arc(u) + th(u), u * len * 0.5]);
  }
  for (let s = N; s >= 0; s--) {
    const u = (s / N) * 2 - 1;
    plan.push([arc(u) - th(u), u * len * 0.5]);
  }
  const board = profile(plan, h - 0.016, { bevel: 0.008, curveSegments: 1 });
  for (let i = 0; i < 2; i++) {
    const bx = 0.848 + i * 0.042;
    k.add('paintAccent', board, { pos: [bx, by, cz], rot: [-Math.PI / 2, 0, 0] });
    if (i === 0) continue;
    for (let r = 0; r < 4; r++) {
      for (let j = 0; j < 10; j++) {
        const u = ((j + (r % 2) * 0.5) / 9.5) * 2 - 1;
        k.add('trim', gbox(0.016, 0.026, 0.026, 0.005), {
          pos: [bx + arc(u) + 0.021, by - 0.114 + r * 0.076, cz + u * (len * 0.5 - 0.062)],
          rot: [0, 0.12 * u, 0],
        });
      }
    }
    for (const dz of [-0.24, 0.24]) {
      const u = dz / (len * 0.5);
      k.add('gap', new THREE.CylinderGeometry(0.032, 0.032, 0.06, 10), {
        pos: [bx + arc(u), by, cz + dz],
        rot: [0, 0, Math.PI / 2],
      });
      k.add('trim', new THREE.TorusGeometry(0.04, 0.009, 6, 14), {
        pos: [bx + arc(u) + 0.019, by, cz + dz],
        rot: [0, Math.PI / 2 + 0.12 * u, 0],
      });
    }
    // Raised rim round the whole edge. A moulded board is a tray, not a sheet,
    // and the rim is the one feature that puts a hard shadow line on a panel
    // this flat — the studs only shade themselves.
    for (const dy of [-1, 1]) {
      for (let s = 0; s < 5; s++) {
        const u = (s / 4) * 2 - 1;
        k.add('paintAccent', gbox(0.018, 0.022, len / 5 + 0.01, 0.005), {
          pos: [bx + arc(u) + 0.017, by + dy * 0.146, cz + u * (len * 0.5 - len * 0.1)],
          rot: [0, 0.12 * u, 0],
        });
      }
    }
    for (const dz of [-1, 1]) {
      k.add('paintAccent', gbox(0.018, 0.29, 0.024, 0.005), {
        pos: [bx + arc(dz) + 0.014, by, cz + dz * (len * 0.5 - 0.014)],
        rot: [0, 0.12 * dz, 0],
      });
    }
  }
  // the pair strapped over the boards, front and back
  for (const z of [zF, zR]) {
    k.add('steelDark', gbox(0.1, 0.06, 0.05, 0.01), { pos: [0.83, by, z] });
    k.add('canvasTop', gbox(0.014, h + 0.05, 0.055, 0.004), { pos: [0.916, by, z] });
    for (const dy of [-1, 1]) {
      k.add('canvasTop', gbox(0.105, 0.014, 0.055, 0.004), { pos: [0.866, by + dy * (h * 0.5 + 0.018), z] });
    }
    k.add('alu', gbox(0.03, 0.055, 0.062, 0.007), { pos: [0.932, by - 0.07, z] });
    k.add('steel', new THREE.CylinderGeometry(0.007, 0.007, 0.058, 8), {
      pos: [0.944, by - 0.052, z],
      rot: [Math.PI / 2, 0, 0],
    });
    k.add('canvasTop', gbox(0.01, 0.1, 0.05, 0.003), { pos: [0.942, by - 0.15, z], rot: [0, 0, 0.2] });
  }

  // hi-lift jack on the far side: the toothed beam is the other shape that reads
  const jy = 1.76;
  k.add('steelDark', gbox(0.05, 0.05, 1.22, 0.008), { pos: [-0.858, jy, -1.62] });
  for (let i = 0; i < 15; i++) {
    k.add('steelDark', gbox(0.03, 0.034, 0.026, 0.005), { pos: [-0.888, jy - 0.01, -2.16 + i * 0.077] });
  }
  k.add('steelDark', gbox(0.055, 0.17, 0.13, 0.01), { pos: [-0.858, jy - 0.082, -1.06] });
  k.add('steelDark', gbox(0.082, 0.15, 0.085, 0.012), { pos: [-0.858, jy + 0.042, -1.44] });
  k.add('steel', gbox(0.024, 0.024, 0.4, 0.006), { pos: [-0.878, jy + 0.09, -1.66], rot: [0, 0.06, 0] });
  for (const z of [zF, zR]) {
    k.add('steelDark', gbox(0.1, 0.055, 0.05, 0.01), { pos: [-0.83, jy, z] });
    k.add('canvasTop', gbox(0.014, 0.15, 0.05, 0.004), { pos: [-0.912, jy, z] });
    for (const dy of [-1, 1]) {
      k.add('canvasTop', gbox(0.095, 0.014, 0.05, 0.004), { pos: [-0.864, jy + dy * 0.068, z] });
    }
    k.add('alu', gbox(0.028, 0.05, 0.058, 0.007), { pos: [-0.928, jy - 0.05, z] });
  }
}

/**
 * Flaps hung off the back of each opening. The old pair were 0.34 m squares
 * floating nine centimetres below the sill with nothing holding them up; these
 * hang from a retaining strip bolted under the arch lip, sag back from
 * vertical, and carry a stiffening rib and a curled bottom edge so they read as
 * rubber rather than as card.
 */
function mudFlaps(k) {
  const hw = S.bodyHalfWidth;
  for (const z of [S.frontAxleZ - 0.72, S.rearAxleZ - 0.72]) {
    for (const sx of [-1, 1]) {
      const x = sx * (hw - 0.03);
      k.add('trim', rbox(0.33, 0.44, 0.022, 0.008), { pos: [x, 0.38, z], rot: [0.13, 0, 0] });
      k.add('trim', gbox(0.33, 0.07, 0.03, 0.012), { pos: [x, 0.168, z + 0.032], rot: [0.55, 0, 0] });
      k.add('trim', gbox(0.05, 0.4, 0.028, 0.01), { pos: [x, 0.39, z + 0.014], rot: [0.13, 0, 0] });
      k.add('paintAccent', gbox(0.2, 0.055, 0.024, 0.008), { pos: [x, 0.46, z + 0.02], rot: [0.13, 0, 0] });
      // retaining strip up under the arch lip, bolted through
      k.add('steelDark', gbox(0.35, 0.05, 0.035, 0.008), { pos: [x, 0.6, z - 0.008] });
      k.add('alu', gbox(0.3, 0.014, 0.03, 0.004), { pos: [x + sx * 0.014, 0.622, z - 0.008] });
      for (const dx of [-0.11, 0, 0.11]) {
        k.add('steel', bolt(0.011, 0.008), { pos: [x + dx, 0.6, z + 0.022], rot: [Math.PI / 2, 0, 0] });
      }
      k.add('steelDark', gbox(0.05, 0.12, 0.04, 0.01), { pos: [x, 0.565, z - 0.05], rot: [-0.5, 0, 0] });
    }
  }
}
