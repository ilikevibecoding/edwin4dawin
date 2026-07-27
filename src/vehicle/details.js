import * as THREE from 'three';
import { BufferGeometryUtils, Kit, bend, bolt, rbox, rivet, tube } from '../lib/geo.js';
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
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      if (!merged) {
        console.warn(`[GearKit] merge failed for "${key}"`);
        continue;
      }
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `${this.name}_${key}`;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
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

export function buildDetails() {
  const k = new GearKit('gear');
  roofRack(k);
  lightBar(k);
  winch(k);
  snorkel(k);
  bedGear(k);
  sideGear(k);
  mudFlaps(k);
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

  for (const side of [-1, 1]) {
    const x = side * railX;
    k.add('steelDark', rbox(0.05, 0.055, L, 0.012), { pos: [x, baseY, midZ] });
    k.add('steelDark', rbox(0.055, 0.06, L, 0.014), { pos: [x, topY, midZ] });
    k.add('alu', gbox(0.032, 0.014, L - 0.07, 0.004), { pos: [x, topY + 0.037, midZ] });
    // uprights closing the fence between the two rails
    for (let i = 0; i <= 7; i++) {
      k.add('steelDark', gbox(0.036, 0.115, 0.036, 0.008), { pos: [x, (baseY + topY) * 0.5, zF - 0.06 - (i / 7) * (L - 0.12)] });
    }
  }
  // front and rear crossmembers at both levels, plus corner gussets
  for (const z of [zF, zR]) {
    k.add('steelDark', rbox(railX * 2, 0.055, 0.05, 0.012), { pos: [0, baseY, z] });
    k.add('steelDark', rbox(railX * 2, 0.06, 0.055, 0.014), { pos: [0, topY, z] });
    k.add('alu', gbox(railX * 2 - 0.06, 0.014, 0.032, 0.004), { pos: [0, topY + 0.037, z] });
    for (const side of [-1, 1]) {
      k.add('steelDark', gbox(0.04, 0.1, 0.1, 0.01), {
        pos: [side * (railX - 0.06), topY - 0.02, z - Math.sign(z) * 0.07],
        rot: [Math.sign(z) * 0.7, 0, 0],
      });
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
    for (const z of [0.8, -0.05, -0.8]) {
      k.add('steelDark', gbox(0.058, 0.09, 0.085, 0.014), { pos: [x, baseY - 0.062, z] });
      k.add('alu', gbox(0.13, 0.016, 0.135, 0.005), { pos: [x, baseY - 0.113, z] });
      k.add('trim', gbox(0.145, 0.014, 0.15, 0.005), { pos: [x, baseY - 0.126, z] });
      for (const dx of [-0.044, 0.044]) {
        for (const dz of [-0.046, 0.046]) {
          k.add('steel', bolt(0.011, 0.008), { pos: [x + dx, baseY - 0.104, z + dz] });
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

  // awning rolled along the outboard rail, on its own brackets
  const ax = railX - 0.1;
  k.add('canvasTop', new THREE.CylinderGeometry(0.082, 0.082, 1.62, 14), {
    pos: [ax, deckY + 0.1, -0.72],
    rot: [Math.PI / 2, 0, 0],
  });
  for (const dz of [-0.81, 0.81]) {
    k.add('trim', new THREE.CylinderGeometry(0.09, 0.09, 0.045, 14), {
      pos: [ax, deckY + 0.1, -0.72 + dz],
      rot: [Math.PI / 2, 0, 0],
    });
  }
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

  // rolled swag across the rear bay
  k.add('canvasTop', new THREE.CylinderGeometry(0.115, 0.115, 1.1, 14), {
    pos: [0.0, deckY + 0.125, -1.72],
    rot: [0, 0, Math.PI / 2],
  });
  for (const dx of [-0.55, 0.55]) {
    k.add('trim', new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), {
      pos: [dx, deckY + 0.125, -1.72],
      rot: [0, 0, Math.PI / 2],
    });
  }
  for (const dx of [-0.34, 0.34]) {
    k.add('canvasTop', gbox(0.045, 0.014, 0.26, 0.004), { pos: [dx, deckY + 0.245, -1.72] });
    k.add('canvasTop', gbox(0.045, 0.26, 0.014, 0.004), { pos: [dx, deckY + 0.12, -1.6] });
    k.add('alu', gbox(0.05, 0.05, 0.026, 0.006), { pos: [dx, deckY + 0.02, -1.6] });
  }
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
  // wiring loom down the A pillar
  k.add('trim', tube(
    [
      [0.5, y - 0.05, z],
      [0.66, S.roofY - 0.02, z - 0.05],
      [0.78, S.beltlineY + 0.4, S.windshieldBottomZ - 0.1],
    ],
    0.011,
  ));
}

function winch(k) {
  const z = S.noseZ - 0.02;
  const y = 0.94;
  k.add('trim', new THREE.CylinderGeometry(0.085, 0.085, 0.46, 16), {
    pos: [0, y, z],
    rot: [0, 0, Math.PI / 2],
  });
  k.add('steel', new THREE.CylinderGeometry(0.055, 0.055, 0.3, 14), {
    pos: [0, y, z],
    rot: [0, 0, Math.PI / 2],
  });
  for (const sx of [-1, 1]) {
    k.add('steelDark', new THREE.CylinderGeometry(0.07, 0.07, 0.09, 14), {
      pos: [sx * 0.28, y, z],
      rot: [0, 0, Math.PI / 2],
    });
    k.add('alu', gbox(0.06, 0.14, 0.16, 0.02), { pos: [sx * 0.36, y, z] });
  }
  // fairlead + hook
  k.add('alu', gbox(0.3, 0.1, 0.04, 0.012), { pos: [0, y - 0.06, z + 0.13] });
  k.add('steelDark', gbox(0.24, 0.05, 0.03, 0.008), { pos: [0, y - 0.06, z + 0.15] });
  k.add('steel', tube(
    [
      [0.0, y - 0.06, z + 0.16],
      [0.18, y - 0.12, z + 0.14],
      [0.3, y - 0.2, z + 0.05],
    ],
    0.007,
  ));
  k.add('paintAccent', bend(0.035, 0.012, Math.PI * 1.4), { pos: [0.32, y - 0.26, z + 0.02], rot: [0, 0.3, 0.6] });
}

function snorkel(k) {
  const hw = S.bodyHalfWidth;
  const x = hw - 0.02;
  const pts = [
    [x, S.hoodY - 0.16, S.hoodRearZ + 0.06],
    [x + 0.04, S.hoodY + 0.16, S.hoodRearZ - 0.02],
    [x + 0.02, S.beltlineY + 0.42, S.windshieldBottomZ - 0.1],
    [x - 0.02, S.roofY - 0.04, S.windshieldTopZ + 0.14],
  ];
  k.add('trim', tube(pts, 0.055, 12, 0.5));
  // ram head
  k.add('trim', gbox(0.11, 0.13, 0.24, 0.035), { pos: [x - 0.02, S.roofY + 0.03, S.windshieldTopZ + 0.2] });
  k.add('mesh', new THREE.PlaneGeometry(0.1, 0.11), {
    pos: [x - 0.02, S.roofY + 0.03, S.windshieldTopZ + 0.322],
  });
  // clamps
  for (const t of [0.3, 0.62]) {
    const p = [
      x + 0.03 * (1 - t),
      S.hoodY - 0.16 + t * (S.roofY - S.hoodY + 0.1),
      S.hoodRearZ + 0.06 - t * 0.24,
    ];
    k.add('alu', new THREE.TorusGeometry(0.062, 0.008, 6, 14), { pos: p, rot: [0.2, Math.PI / 2, 0] });
  }
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

  // spare wheel flat on the floor with a coil of rope dropped into the middle
  const spZ = -1.88;
  k.add('rubber', new THREE.TorusGeometry(0.33, 0.115, 12, 28), {
    pos: [0.3, floorY + 0.115, spZ],
    rot: [Math.PI / 2, 0, 0],
  });
  k.add('alu', new THREE.CylinderGeometry(0.23, 0.23, 0.14, 24), { pos: [0.3, floorY + 0.11, spZ] });
  k.add('trimGloss', new THREE.CylinderGeometry(0.07, 0.07, 0.17, 14), { pos: [0.3, floorY + 0.12, spZ] });
  k.add('trim', new THREE.TorusGeometry(0.13, 0.028, 7, 20), {
    pos: [0.3, floorY + 0.238, spZ],
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

  // traction boards, near side. Lugs and end holes in the matt black material:
  // in the accent paint their little outward faces each caught a clearcoat
  // highlight and the row read as pale stickers instead of moulded studs.
  const len = 0.94;
  const h = 0.32;
  const by = 1.78;
  for (let i = 0; i < 2; i++) {
    const bx = 0.848 + i * 0.042;
    k.add('paintAccent', rbox(0.034, h, len, 0.014), { pos: [bx, by, cz] });
    if (i === 0) continue;
    for (let j = 0; j < 9; j++) {
      const lz = cz - len * 0.5 + 0.07 + (j / 8) * (len - 0.14);
      k.add('trim', gbox(0.016, 0.03, 0.03, 0.006), { pos: [bx + 0.023, by + 0.108, lz] });
      k.add('trim', gbox(0.016, 0.03, 0.03, 0.006), { pos: [bx + 0.023, by - 0.108, lz + 0.052] });
    }
    for (const dz of [-0.24, 0.24]) {
      k.add('gap', new THREE.CylinderGeometry(0.032, 0.032, 0.06, 10), {
        pos: [bx, by, cz + dz],
        rot: [0, 0, Math.PI / 2],
      });
      k.add('trim', new THREE.TorusGeometry(0.04, 0.009, 6, 14), {
        pos: [bx + 0.021, by, cz + dz],
        rot: [0, Math.PI / 2, 0],
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
