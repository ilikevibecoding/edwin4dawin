import * as THREE from 'three';
import { PLATE, BRICK, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';

/*
 * Shared rigging for the starship library.
 *
 * House rules every ship in this folder obeys:
 *   - the nose points at +Z and the model is centred on X,
 *   - flyers are centred on Y too; ground vehicles rest their contact patch on
 *     y = 0 so a scene can drop them straight onto a dune,
 *   - `group.userData.nodes` carries every hardpoint (engines, muzzles, seats).
 */

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _mid = new THREE.Vector3();

/**
 * Wrap a built model so its origin sits at the natural centre.
 * @param {THREE.Object3D} inner result of BrickBuilder.build()
 * @param {{x?:boolean, z?:boolean, y?:'centre'|'bottom'|'none'}} how
 */
export function recentre(inner, how = {}) {
  const { x = true, z = true, y = 'centre' } = how;
  const outer = new THREE.Group();
  outer.add(inner);
  _box.setFromObject(inner);
  _box.getSize(_size);
  _box.getCenter(_mid);
  inner.position.set(
    x ? -_mid.x : 0,
    y === 'centre' ? -_mid.y : y === 'bottom' ? -_box.min.y : 0,
    z ? -_mid.z : 0,
  );
  outer.userData.nodes = inner.userData.nodes || {};
  outer.userData.size = _size.clone();
  return outer;
}

/** Merge several built sub-assemblies plus their node tables into one group. */
export function assemble(...parts) {
  const g = new THREE.Group();
  const nodes = {};
  for (const p of parts) {
    if (!p) continue;
    g.add(p);
    Object.assign(nodes, p.userData?.nodes || {});
  }
  g.userData.nodes = nodes;
  return g;
}

/**
 * Horizontal polygon plate -- the free-form cousin of a wedge plate.
 * Points are (x, z) in stud space; the slab spans y .. y + h.
 */
export function hplate(bb, pts, o = {}) {
  const h = o.h ?? PLATE;
  bb.prism(pts, h, {
    rx: Math.PI / 2,
    x: o.x ?? 0,
    y: (o.y ?? 0) + h / 2,
    z: o.z ?? 0,
    color: o.color ?? C.lightBluishGray,
    finish: o.finish,
    bevel: o.bevel,
  });
  return bb;
}

/**
 * Tapered slab built the way a LEGO designer would: a rectangular spine of
 * plates at the narrow width of each band, with a wedge plate on each side
 * filling out to the wider end. The rounding to whole studs is what gives the
 * hull its stair-stepped edge.
 *
 * @param {object} o
 *   z0/z1  band range (z0 = nose end)
 *   y      bottom of the slab, h = thickness
 *   step   band depth in studs
 *   halfW  (z) => half width in studs
 */
export function taperSlab(bb, o) {
  const { z0, z1, y = 0, h = PLATE, step = 4, halfW } = o;
  const color = o.color ?? C.lightBluishGray;
  const bands = Math.max(1, Math.round(Math.abs(z1 - z0) / step));
  const dz = (z1 - z0) / bands;
  const grid = o.grid ?? 1;
  const hwOf = (z) => Math.max(o.minHalfW ?? 0.5, Math.round(halfW(z) / grid) * grid);
  for (let i = 0; i < bands; i++) {
    const za = z0 + i * dz, zb = za + dz;
    const ha = hwOf(za), hb = hwOf(zb);
    const lo = Math.min(ha, hb), hi = Math.max(ha, hb);
    bb.brick(o.x ?? 0, y, (za + zb) / 2, lo * 2, Math.abs(dz), {
      h, color, studs: o.studs ?? false, tile: o.tile, free: o.free,
    });
    if (hi - lo > 0.35) {
      const zWide = ha > hb ? za : zb;
      const zThin = ha > hb ? zb : za;
      for (const s of [-1, 1]) {
        bb.prism([
          [s * lo, zThin], [s * lo, zWide], [s * hi, zWide],
        ], h, {
          rx: Math.PI / 2, x: o.x ?? 0, y: y + h / 2,
          color: o.edgeColor ?? color, finish: o.finish,
        });
      }
    }
  }
  return bb;
}

/**
 * Engine nozzle: dark housing ring, a band of trans plastic, a hot core.
 * Exhaust fires toward -Z. Returns the node so scenes can pulse it.
 */
export function engineNozzle(bb, name, x, y, z, r, o = {}) {
  const depth = o.depth ?? 1.2;
  const seg = o.seg ?? 14;
  bb.cyl(x, y, z, r, depth, { axis: 'z', color: o.housing ?? C.darkBluishGray, seg, stud: false });
  bb.cyl(x, y, z - depth * 0.36, r * 0.86, depth * 0.3, {
    axis: 'z', color: o.rim ?? C.darkGray, seg, stud: false,
  });
  bb.cyl(x, y, z - depth * 0.52, r * 0.8, depth * 0.14, {
    axis: 'z', color: o.glow ?? C.transLightBlue, finish: FINISH.GLOW, seg, stud: false,
  });
  bb.cyl(x, y, z - depth * 0.56, r * 0.46, depth * 0.1, {
    axis: 'z', color: o.core ?? C.white, finish: FINISH.GLOW, seg: Math.min(seg, 12), stud: false,
  });
  return bb.node(name, x, y, z - depth * 0.62);
}

/** Scatter small tiles, slopes and pipes over a panel so it reads as machinery. */
export function greebleField(bb, rand, o) {
  const { x0, x1, z0, z1, y, count } = o;
  const colors = o.colors ?? [C.darkBluishGray, C.darkGray, C.black, C.flatSilver];
  const down = !!o.down;
  for (let i = 0; i < count; i++) {
    const w = 1 + Math.floor(rand() * (o.maxW ?? 4));
    const d = 1 + Math.floor(rand() * (o.maxD ?? 4));
    const px = Math.round(x0 + rand() * (x1 - x0));
    const pz = Math.round(z0 + rand() * (z1 - z0));
    if (o.keep && !o.keep(px, pz)) continue;
    const c = colors[Math.floor(rand() * colors.length)];
    const t = rand() < 0.35 ? P(2) : PLATE;
    const yb = down ? y - t : y;
    const kind = rand();
    if (kind < 0.13) {
      bb.cyl(px, down ? y - t * 2 : y, pz, 0.3 + rand() * 0.35, t * 2,
        { color: c, seg: 8, stud: false });
    } else if (kind < 0.24) {
      bb.slope(px, yb, pz, w, d,
        { h: t * 2, color: c, rot: Math.floor(rand() * 4) * (Math.PI / 2), free: true });
    } else {
      bb.brick(px, yb, pz, w, d,
        { h: t, color: c, studs: false, tile: true, free: true });
    }
  }
  return bb;
}

/** Glowing window / running light. */
export function litTile(bb, x, y, z, w, d, o = {}) {
  bb.brick(x, y, z, w, d, {
    h: o.h ?? PLATE, color: o.color ?? C.transYellow, finish: FINISH.GLOW,
    studs: false, tile: true, rot: o.rot ?? 0, free: true,
  });
  return bb;
}

/**
 * Take private copies of the glow materials in a built model so a scene can
 * throttle the engines without dimming every other ship in the shot (the
 * material cache is shared across the whole film).
 */
export function glowRig(...roots) {
  const list = [];
  for (const root of roots) {
    root?.traverse?.((o) => {
      if (o.isMesh && o.material && /_glow$/.test(o.material.name || '')) {
        o.material = o.material.clone();
        list.push({ m: o.material, base: o.material.color.clone() });
      }
    });
  }
  return {
    count: list.length,
    /** k = 1 is nominal thrust; 0 is cold. */
    set(k) { for (const e of list) e.m.color.copy(e.base).multiplyScalar(k); },
  };
}

/** Row of tiles hugging the stepped edge of a taperSlab, for hull striping. */
export function edgeStripe(bb, o) {
  const { z0, z1, step = 2, halfW, y, w = 1 } = o;
  const bands = Math.max(1, Math.round(Math.abs(z1 - z0) / step));
  const dz = (z1 - z0) / bands;
  const grid = o.grid ?? 1;
  const q = (z) => Math.round(halfW(z) / grid) * grid;
  for (let i = 0; i < bands; i++) {
    const za = z0 + i * dz, zb = za + dz;
    const hw = Math.min(q(za), q(zb));
    if (hw - w < 0.4) continue;
    for (const s of [-1, 1]) {
      bb.brick(s * (hw - w / 2), y, (za + zb) / 2, w, Math.abs(dz), {
        h: o.h ?? PLATE, color: o.color ?? C.red, tile: true, studs: false, free: true,
      });
    }
  }
  return bb;
}

export { PLATE, BRICK, P, B, C, FINISH };
