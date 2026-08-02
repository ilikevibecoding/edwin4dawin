/**
 * BRICK WARS — the cast.
 *
 * Every character is an async factory. The minifigure-based ones return the
 * `fig` object from `buildMinifig`, so scenes can drive them with the standard
 * posing helpers:
 *
 *   const leia = await makeLeia();
 *   scene.add(leia.root);
 *   poseWalk(leia, t, { speed: 2.2 });
 *
 * Per-character extras hang off the same object (`fig.saber`, `fig.cape`,
 * `fig.blaster`, `fig.setSaber`, `fig.waddle`, ...). Accessories are parented
 * into `fig.accessory` (head-mounted: helmets, hair, hoods) or `fig.torso`
 * (body-mounted: capes, robes, chest gear) so they follow the pivot they
 * belong to.
 *
 * The droids are not minifigures; they return `{ root, ... }` plus their own
 * animation helpers.
 *
 * PURITY: nothing here calls Math.random(). Build-time variation comes from
 * `hash11`, and every animation helper is a pure function of `t`, so the
 * offline renderer can jump to any frame in any order.
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Bricks, brickMaterial, chamferBox, taperBox } from '../engine/brick.js';
import { COLORS, KIT } from '../engine/palette.js';
import { hash11, noise1 } from '../engine/rng.js';
import { svgImage } from '../engine/svg.js';
import {
  buildMinifig,
  poseStand,
  poseWalk,
  holdInHand,
  cape,
  blaster,
  lightsaber,
  FIG,
} from './minifig.js';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Skin used for the human faces, so the whole cast matches. */
const SKIN = COLORS.lightFlesh;

/**
 * Luke's sandy blond. Deliberately a shade or two darker and warmer than
 * `lightFlesh`; at the palette's own bright-light-yellow the hair and the head
 * are close enough in value that the hairline disappears at film distance.
 */
const SANDY_BLOND = 0xc79a4e;

/**
 * Metal parts use a glossy plastic finish rather than `metal`/`chrome`/`gold`.
 * Nothing in the film sets an environment map, and a MeshStandardMaterial with
 * high metalness and nothing to reflect renders black; a bright silver or gold
 * colour with a tight specular reads far more like polished metal.
 */
const POLISH = { finish: 'glossy' };
const SILVER = COLORS.chromeSilver;
const STEEL = COLORS.flatSilver;

/**
 * The protocol droid's gold. For the same reason as above, the palette's own
 * golds cannot be used raw here: `pearlGold` is a dark brown under diffuse
 * light and `chromeGold` a pale beige, and either way he stops reading as gold
 * and starts reading as a naked minifig. A saturated brass carries it.
 */
const DROID_GOLD = 0xd9a520;
const DROID_GOLD_DARK = 0xa97a14;

/**
 * Vader's black. The palette's `black` is 0x1b2a34 and `trueBlack` 0x101418 —
 * both are cool, and under a blue sky term plus a blue rim they come back as
 * navy: from behind he reads as a man in a dark blue anorak. A neutral, very
 * slightly warm charcoal of the same luminance cancels the cast and lands on
 * screen as black while still holding its form.
 */
const VADER_BLACK = 0x282726;
const VADER_BLACK_DEEP = 0x191818;

/**
 * Rotation that makes a `blaster()` sit in a minifig hand the way a real one
 * does: barrel angled down when the arm hangs, straight ahead once the arm is
 * raised into `poseAim`. The hand frame is already rolled back 0.62 rad by the
 * elbow, so this is (PI - 1.06).
 */
const GRIP_BLASTER = [2.08, 0, 0];
/** Same idea for a hilt: blade up and tipped 20 degrees forward at rest. */
const GRIP_SABER = [0.95, 0, 0];

// ---------------------------------------------------------------------------
// Small geometry helpers
// ---------------------------------------------------------------------------

const _ca = new THREE.Color();
const _cb = new THREE.Color();
/** Blend two palette colours; used for the troopers' scuffed-armour variation. */
function mixHex(a, b, t) {
  _ca.setHex(a);
  _cb.setHex(b);
  return _ca.lerp(_cb, t).getHex();
}

/**
 * Take an outer wall profile of `[radius, y]` pairs and close it into a loop
 * with `thickness` of wall, so the lathed result is a solid shell rather than
 * a paper-thin surface.
 */
function shellProfile(outer, thickness) {
  const inner = outer.map(([r, y]) => [Math.max(r - thickness, 0.012), y]).reverse();
  return [...outer, ...inner];
}

/**
 * Surface of revolution around Y from a `[radius, y]` profile, in world units.
 * `openHalf` (radians) leaves a gap centred on +Z — the face opening of a
 * hood, or the front of Vader's helmet skirt where the mask goes. `close`
 * joins the last point back to the first (for shells); leave it off when the
 * profile already starts and ends on the axis (for solids).
 */
function latheShell(profile, { segments = 22, openHalf = 0, close = true } = {}) {
  const pts = orientProfile(profile).map(([r, y]) => new THREE.Vector2(Math.max(r, 0.008), y));
  if (close && pts[0].distanceTo(pts[pts.length - 1]) > 1e-6) pts.push(pts[0].clone());
  // No computeVertexNormals here: LatheGeometry derives its normals from the
  // profile tangent, which is smooth across the wrap seam and exact at every
  // profile vertex. Re-deriving them from the faces welds nothing across the
  // seam and leaves a crease straight down the front of every dome.
  return new THREE.LatheGeometry(pts, segments, openHalf, Math.PI * 2 - openHalf * 2);
}

/**
 * `LatheGeometry` winds each quad from the profile order, so a profile listed
 * top-to-bottom comes out inside-out: back-face culling then hides the near
 * wall and you see the shaded-from-behind far wall instead, which looks like
 * a flat dark blob rather than a dome. Treating the profile as a polygon in
 * (r, y) and forcing it counter-clockwise puts the normals outward whichever
 * way the caller wrote it.
 */
function orientProfile(profile) {
  let area = 0;
  for (let i = 0; i < profile.length; i++) {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[(i + 1) % profile.length];
    area += r0 * y1 - r1 * y0;
  }
  return area < 0 ? [...profile].reverse() : profile;
}

/**
 * Smooth normals across a lathe's wrap seam, for a lathe that has since been
 * deformed and so cannot keep its analytical normals.
 *
 * `LatheGeometry` duplicates the seam column so the two copies can carry u = 0
 * and u = 1. `computeVertexNormals` then gives each copy only the faces on its
 * own side, and a hard crease runs the full length of the part — on a white
 * robe under a single key that crease is a bright wedge with a straight edge.
 * Welding by position first (UVs are what forced the split, and these parts
 * carry no texture) puts the seam back together.
 */
function weldNormals(geo) {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const welded = mergeVertices(geo, 1e-4);
  welded.computeVertexNormals();
  return welded;
}

/** Reverse a geometry's triangles and normals, for a mirrored cap. */
function flipWinding(g) {
  const idx = g.getIndex();
  if (idx) {
    const a = idx.array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i];
      a[i] = a[i + 2];
      a[i + 2] = t;
    }
    idx.needsUpdate = true;
  }
  const n = g.getAttribute('normal');
  if (n) {
    for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    n.needsUpdate = true;
  }
  return g;
}

/**
 * `latheShell` with the two cut faces closed off.
 *
 * A gapped lathe of a closed profile is an open tube: from any angle where the
 * cut shows you look straight down the inside of the shell, which is what
 * turns a helmet skirt into a pair of bat wings. Capping the ends with the
 * profile polygon makes it read as a moulded part with a visible edge.
 */
function latheSector(outer, thickness, { segments = 22, openHalf = 1.0 } = {}) {
  // `thickness` of 0 means the caller has already supplied a closed loop, for
  // ribs and other cross-sections that are not a constant-thickness wall.
  const profile = thickness ? shellProfile(outer, thickness) : outer;
  const parts = [latheShell(profile, { segments, openHalf })];
  const shape = new THREE.Shape(profile.map(([r, y]) => new THREE.Vector2(r, y)));
  for (const sign of [-1, 1]) {
    // ShapeGeometry lies in XY; rotating by (azimuth - 90 degrees) sends its
    // local +x along the radius at that azimuth, which is where the cut is.
    // The two caps face opposite ways, so one of them has to be turned round.
    const cap = new THREE.ShapeGeometry(shape);
    cap.rotateY(sign * openHalf - Math.PI / 2);
    parts.push(sign < 0 ? flipWinding(cap) : cap);
  }
  return mergeGeometries(parts);
}

/**
 * A tapered armour plate. `half` is the right-hand half of an outline in XY
 * (top-centre down to bottom-centre); it is mirrored into a closed loop, laid
 * flat at z = 0 and joined to a copy scaled by `spread` about `centre` at
 * z = -depth.
 *
 * The taper is the point. A straight extrusion planted on a curved helmet
 * leaves a broad horizontal shelf at the brow that catches the key light as a
 * white bar; sloping the sides back into the shell turns that shelf into a
 * narrow lip. The front face stays exactly on z = 0, so a decal at z = +eps
 * sits flush instead of floating at the corners.
 */
function taperShield(half, depth, spread = [1.15, 1], centre = [0, 0], bow = 0) {
  const [sx, sy] = spread;
  const outline = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  const n = outline.length;
  const xMax = Math.max(...outline.map(([x]) => Math.abs(x))) || 1;
  const front = outline.map(([x, y]) => [x, y, -bowAt(x, xMax, bow)]);
  const back = outline.map(([x, y]) => [
    centre[0] + (x - centre[0]) * sx,
    centre[1] + (y - centre[1]) * sy,
    -depth,
  ]);
  const pos = [];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  // The outline runs clockwise seen from +z, so these windings face outward.
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(front[i], back[j], back[i]);
    tri(front[i], front[j], back[j]);
  }
  for (const ring of [front, back]) {
    const c = [
      ring.reduce((a, p) => a + p[0], 0) / n,
      ring.reduce((a, p) => a + p[1], 0) / n,
      ring[0][2],
    ];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (ring === front) tri(c, ring[j], ring[i]);
      else tri(c, ring[i], ring[j]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * A thin fin standing in the ZY plane: `outline` is a closed loop of [z, y]
 * pairs, extruded `width` across x and centred on x = 0. Used for ridges that
 * run front-to-back over a domed helmet, where a lathe slice leaves a notch at
 * the pole and a row of boxes floats off the curve.
 */
function ridgeFin(outline, width) {
  const shape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false, curveSegments: 1, steps: 1 });
  g.rotateY(-Math.PI / 2);
  g.translate(width / 2, 0, 0);
  g.computeVertexNormals();
  return g;
}

/**
 * Rake the hem of a lathed skirt: below `pivot`, drag the back of it downward
 * (and very slightly outward) so the hem is short at the front and long at the
 * back. This buys the asymmetry of a cowl without cutting the lathe into an
 * open sector, which would leave two flat radial caps in the silhouette.
 */
function rakeHem(geo, { drop, pivot, span, power = 1.25, spread = 0.03 }) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y >= pivot) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const back = Math.max(0, -z / r); // 1 dead astern, 0 from the ears forward
    const depth = Math.min(1, (pivot - y) / span);
    const k = Math.pow(back, power) * depth;
    pos.setY(i, y - drop * k);
    pos.setX(i, x * (1 + spread * k));
    pos.setZ(i, z * (1 + spread * k));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Hemisphere cap (or any slice of one), anchored so `y` is the sphere centre. */
function domeGeometry(r, phiLen = Math.PI * 0.5, segments = 18) {
  return new THREE.SphereGeometry(r, segments, Math.max(6, Math.round(segments * 0.6)), 0, Math.PI * 2, 0, phiLen);
}

/**
 * A curved rectangle lying exactly on a cone of revolution — the surface a
 * decal needs when it has to sit on a rounded helmet without floating at the
 * corners. UVs run left-to-right across the arc and bottom-to-top in y, which
 * is what a flat SVG expects.
 */
function conePatch(rBottom, rTop, yBottom, yTop, halfAngle, segments = 18) {
  const h = yTop - yBottom;
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, segments, 1, true, -halfAngle, halfAngle * 2);
  g.translate(0, yBottom + h / 2, 0);
  return g;
}

/**
 * Resample a handful of control points into a smooth lathe profile.
 *
 * `LatheGeometry` takes its normals from the profile tangent, so wherever two
 * hand-placed segments meet at an angle the shading jumps and a hard
 * horizontal crease rings the whole shell. Running the control points through
 * a spline first makes the tangent continuous and the dome shades as one
 * surface.
 */
function smoothProfile(control, steps = 20) {
  const curve = new THREE.SplineCurve(control.map(([r, y]) => new THREE.Vector2(r, y)));
  return curve.getSpacedPoints(steps).map((p) => [Math.max(p.x, 0.02), p.y]);
}

/**
 * A rib running front-to-back over the crown of a lathed shell: a tube swept
 * along the shell's own surface curve and sunk into it, so only the top `lift`
 * of the tube shows. The ends dive a further radius inside, which is what
 * makes it fade out.
 *
 * Two earlier shapes failed here. A run of straight boxes is tangent to the
 * crown at one point and floats off it everywhere else; an extruded fin hugs
 * the curve but ends in a flat cap standing proud of the dome, and that cap
 * catches the key light as a bright quadrilateral — from the front the helmet
 * grows a little flag. A tube has no cap to catch anything.
 */
function crownRib(profile, { yFront, yBack, radius = 0.1, lift = 0.03, steps = 8 }) {
  const yTop = Math.max(...profile.map(([, y]) => y));
  // Surface point and outward normal of the profile at height y, in (r, y).
  const surf = (y) => {
    const h = 0.008;
    const r0 = radiusAt(profile, Math.max(y - h, 0));
    const r1 = radiusAt(profile, Math.min(y + h, yTop));
    const len = Math.hypot(r1 - r0, 2 * h) || 1;
    return { r: radiusAt(profile, y), nz: (2 * h) / len, ny: -(r1 - r0) / len };
  };
  const half = (yEnd, sign, ascending) => {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const t = ascending ? i / steps : 1 - i / steps; // 0 at the end, 1 at the apex
      const y = yEnd + (yTop - yEnd) * t;
      const s = surf(y);
      // Full depth at the apex, more than a radius deeper at the tip.
      const d = lift - radius - (1 - Math.min(1, t / 0.3)) * radius * 1.25;
      out.push(new THREE.Vector3(0, y + s.ny * d, sign * (s.r + s.nz * d)));
    }
    return out;
  };
  // Back tip up over the apex and down to the front tip. The two halves stop
  // at different heights: the rib has to die out well above the brow or it
  // draws a line straight through the printed face.
  const path = [...half(yBack, -1, true), ...half(yFront, 1, false)];
  const curve = new THREE.CatmullRomCurve3(path);
  return new THREE.TubeGeometry(curve, steps * 2 + 4, radius, 7, false);
}

/** Outermost radius of a lathe profile at height `y`, or 0 if `y` misses it. */
function radiusAt(profile, y) {
  let r = 0;
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[i + 1];
    if (y0 === y1 || y < Math.min(y0, y1) || y > Math.max(y0, y1)) continue;
    r = Math.max(r, r0 + ((r1 - r0) * (y - y0)) / (y1 - y0));
  }
  return r;
}

/**
 * A decal surface that follows a lathe profile exactly: the shell the helmet
 * is made from, resampled to even steps in y so a flat SVG lands undistorted
 * vertically, pushed out along the surface normal and cut to an arc across the
 * front. `conePatch` is enough for a gently curved shell, but a straight cone
 * chord-cuts a barrelled one and the middle of the print sinks inside it.
 */
function shellPatch(profile, { yFrom, yTo, halfAngle, offset = 0.008, rows = 10, segments = 20 }) {
  const raw = [];
  for (let i = 0; i <= rows; i++) {
    const y = yFrom + ((yTo - yFrom) * i) / rows;
    raw.push(new THREE.Vector2(radiusAt(profile, y), y));
  }
  const pts = raw.map((p, i) => {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[Math.min(raw.length - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    return new THREE.Vector2(p.x + (ty / len) * offset, p.y - (tx / len) * offset);
  });
  return new THREE.LatheGeometry(pts, segments, -halfAngle, halfAngle * 2);
}

/**
 * A hemisphere's profile, extended a little below its base, as input to
 * `shellPatch`.
 *
 * A print cannot go on a dome with `SphereGeometry`'s own UVs: those run
 * linearly in the polar angle, and near the pole a polar angle buys almost no
 * apparent height. Mapping a front elevation that way lands the middle of the
 * artwork three quarters of the way up the dome. Resampling the same surface
 * at even steps in y puts every feature where the artist drew it.
 */
function domeProfile(r, { below = 0.06, rows = 14 } = {}) {
  const pts = [[r, -below]];
  for (let i = 0; i <= rows; i++) {
    const th = (Math.PI / 2) * (i / rows);
    pts.push([Math.max(r * Math.sin(th), 0.02), r * Math.cos(th)]);
  }
  return pts;
}

/**
 * Place a part flat against a surface of revolution: rotate `angle` around Y,
 * step out to `radius`, then lay the geometry tangentially. Used for the
 * panels on the astromech's barrel and the features on a curved helmet front.
 */
function onCurve(b, angle, y, radius, tilt, fn) {
  b.push();
  b.rotateY(angle);
  b.translateWorld(0, y, radius);
  if (tilt) b.rotateX(tilt);
  fn(b);
  b.pop();
}

// ---------------------------------------------------------------------------
// Decals
// ---------------------------------------------------------------------------

const decalCache = new Map();

/**
 * Rasterise a decal SVG. Returns null (with a warning) when the art has not
 * been authored yet, so every caller can fall back to moulded geometry.
 */
async function decalTexture(url, size = 512) {
  if (decalCache.has(url)) return decalCache.get(url);
  const p = (async () => {
    try {
      const img = await svgImage(url);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, size, size);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    } catch (e) {
      console.warn('[characters] decal missing:', url, '—', e.message);
      return null;
    }
  })();
  decalCache.set(url, p);
  return p;
}

/** Mesh carrying a decal on the supplied surface, or null if the art is missing. */
async function decalOn(url, geometry) {
  const tex = await decalTexture(url);
  if (!tex) return null;
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      // Printed decoration, not a lacquered surface: a tight specular here
      // turns every light-grey shape in the art into a white sticker.
      roughness: 0.62,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    })
  );
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** Flat decal plate, for the mask fronts that are genuinely flat. */
function flatDecal(w, h) {
  return new THREE.PlaneGeometry(w, h);
}

/** How far back a bowed face plate falls at |x|, quadratically from the centre. */
function bowAt(x, xMax, bow) {
  return bow * (x / xMax) * (x / xMax);
}

/**
 * A decal plate curved to match `taperShield`'s bow, so a print laid on a mask
 * whose cheeks fall away stays on the surface instead of burying its edges.
 */
function bowedDecal(w, h, bow, cols = 6) {
  const g = new THREE.PlaneGeometry(w, h, cols, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, -bowAt(pos.getX(i), w / 2, bow));
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// Figure-level helpers
// ---------------------------------------------------------------------------

/**
 * `cape()` shapes its hem with `pow((h/2 - y)/h, 1.5)`, reading y back out of a
 * Float32Array. When h/2 is not exactly representable the top row of vertices
 * comes out a hair above h/2, the base goes microscopically negative and the
 * whole geometry NaNs. Any eighth has an exactly representable half, so snap.
 */
function safeCapeHeight(h) {
  return Math.round(h * 8) / 8;
}

/**
 * Re-drape the kit's cape around the body.
 *
 * `cape()` returns a flat plane that only bows backwards, so side-on it is a
 * paper-thin sliver with no silhouette at all. Re-map the same vertices onto a
 * superellipse sweep (exponent 1/3, i.e. a rounded rectangle) that clears the
 * torso's back face and the shoulder caps, widening and trailing towards the
 * hem. The pristine grid is rebuilt from PlaneGeometry's own `parameters`
 * because the kit has already deformed the position buffer once by the time we
 * see the mesh.
 */
function drapeCape(mesh, o = {}) {
  const geo = mesh.geometry;
  const { width: w, height: h, widthSegments: ws, heightSegments: hs } = geo.parameters;
  const flat = new THREE.PlaneGeometry(w, h, ws, hs);
  const base = flat.attributes.position.array.slice();
  flat.dispose();
  const pos = geo.attributes.position;

  // Collar values hug the torso corner (0.90 x 0.51) and stay behind the
  // shoulder caps (which reach back to z = -0.28); the hem flares and trails.
  const hwTop = o.hwTop ?? 0.95;
  const hdTop = o.hdTop ?? 0.57;
  const hwHem = o.hwHem ?? 1.24;
  const hdHem = o.hdHem ?? 0.78;
  const spanTop = o.spanTop ?? 1.2;
  const spanHem = o.spanHem ?? 1.16;
  const trail = o.trail ?? 0.12;
  const round = 1 / 3; // superellipse exponent: 1 = ellipse, ->0 = rectangle

  const wave = (t, amt = 1) => {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const v = (h / 2 - y) / h; // 0 at the collar, 1 at the hem
      const hw = hwTop + (hwHem - hwTop) * v;
      const hd = hdTop + (hdHem - hdTop) * v;
      const a = (x / (w / 2)) * (spanTop + (spanHem - spanTop) * v);
      const sa = Math.sin(a);
      const ca = Math.cos(a);
      // Billow grows as v^2 so the collar stays pinned to the shoulders.
      const flap =
        (Math.sin(a * 2.6 + t * 2.2) * 0.06 + Math.sin(t * 1.5 + v * 2.6) * 0.08) * v * v * amt;
      pos.setX(i, Math.sign(sa) * Math.pow(Math.abs(sa), round) * (hw + flap));
      pos.setY(i, y);
      pos.setZ(i, -Math.sign(ca) * Math.pow(Math.abs(ca), round) * (hd + flap) - trail * v * v);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
  };
  mesh.userData.wave = wave;
  // The sweep is already centred on the torso axis, so drop the kit's own
  // "push the plane behind the back" offset.
  mesh.position.z = 0;
  wave(0, 1);
  return mesh;
}

/**
 * Hang a cape from the shoulder line. `cape()` places its own top edge just
 * below its parent's origin, so it needs a mount at shoulder height rather
 * than being dropped straight onto the torso.
 */
function attachCape(fig, color, opts = {}) {
  const mount = new THREE.Group();
  mount.position.set(0, FIG.torsoH - 0.06, opts.z ?? 0);
  fig.torso.add(mount);
  const mesh = cape(color, { width: opts.width ?? 2.1, height: safeCapeHeight(opts.height ?? 2.6) });
  drapeCape(mesh, opts.drape);
  mount.add(mesh);
  fig.cape = mesh;
  /** Pure function of t: `amt` scales the billow (0 indoors, 1 in a corridor draught). */
  fig.capeWave = (t, amt = 1) => mesh.userData.wave(t, amt);
  return mesh;
}

/**
 * Drop the head's 1024x512 face canvas when a helmet covers the head entirely.
 * A squad of twenty troopers would otherwise carry twenty of them. Must be
 * called before the helmet (which has a decal map of its own) is parented in.
 */
function stripHeadTexture(fig, color) {
  fig.head.traverse((n) => {
    if (n.isMesh && n.material && n.material.map) {
      n.material.map.dispose?.();
      n.material = brickMaterial(color, { finish: 'plastic' });
    }
  });
}

/** Clip a blaster into a hand and remember it on the figure. */
function giveBlaster(fig, color = COLORS.trueBlack, opts = {}) {
  const gun = blaster(color, opts);
  holdInHand(fig, gun, opts.side ?? 'R', { rot: GRIP_BLASTER, y: 0.08, z: 0.05 });
  fig.blaster = gun;
  return gun;
}

/** Clip a lightsaber into a hand and wire up `fig.setSaber(0..1)`. */
function giveSaber(fig, bladeColor, { on = false, side = 'R', length = 3.2 } = {}) {
  const saber = lightsaber(bladeColor, { length, on });
  holdInHand(fig, saber, side, { rot: GRIP_SABER, y: 0.06, z: 0.05 });
  const bladeGroup = saber.userData.blade;
  /**
   * Blade extension, 0..1. The kit's own setExtension collapses the blade into
   * the hand; shifting the group back by the hilt length keeps the blade
   * growing out of the emitter instead.
   */
  fig.setSaber = (v) => {
    const k = Math.max(0.0001, v);
    bladeGroup.scale.y = k;
    bladeGroup.position.y = 0.62 * (1 - k);
    bladeGroup.visible = v > 0.002;
  };
  fig.saber = saber;
  fig.setSaber(on ? 1 : 0);
  return saber;
}

/**
 * Swap every material on a figure for a translucent additive blue — the
 * whispered-voice-over Force ghost. Keeps each mesh's decal map so the face
 * still reads faintly through the glow.
 */
export function ghostify(root, color = KIT.hologram) {
  const byMap = new Map();
  root.traverse((n) => {
    if (!n.isMesh) return;
    const map = n.material?.map ?? null;
    let m = byMap.get(map);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: 0x1d4457,
        emissive: color,
        emissiveIntensity: 0.75,
        map,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: 0.55,
        metalness: 0,
        toneMapped: false,
      });
      byMap.set(map, m);
    }
    n.material = m;
    n.castShadow = false;
    n.receiveShadow = false;
  });
  return root;
}

// ---------------------------------------------------------------------------
// Accessories — one local builder per piece
// ---------------------------------------------------------------------------

/**
 * The face print occupies head-local y 0.22 to 0.845, with the eyes at 0.59.
 * Hair, hoods and open-face helmets have to clear the brow at the front —
 * roughly y = 0.76 — while still coming down over the ears and nape.
 */
const FACE_TOP = 0.78;

/**
 * Leia's hair: a brown bob that clears the face print at the front and comes
 * down over the ears and nape, plus the two coiled buns. Head-local
 * coordinates (head bottom = 0, top = 1.04, r = 0.645).
 */
function leiaBuns(color = COLORS.reddishBrown) {
  const b = new Bricks();
  // Moulded ABS, not lacquer. At the kit's default gloss a cap this size in a
  // dark brown grows a white highlight as big as the buns themselves, and the
  // hair reads as a shiny bowl.
  const o = { finish: 'rubber' };

  // Crown: a rounded cap over the head, its rim rolled rather than cut square.
  // A cylindrical wall ending in a flat annulus puts a hard ledge across the
  // brow and swallows the tops of the buns, which is what turns them into
  // earmuffs. The rim stops above the printed face.
  b.addGeometry(
    latheShell(
      [
        [0.03, 0.735],
        ...smoothProfile(
          [
            [0.52, 0.735],
            [0.676, 0.787],
            [0.714, 0.9],
            [0.708, 1.03],
            [0.645, 1.14],
            [0.5, 1.225],
            [0.28, 1.275],
            [0.03, 1.29],
          ],
          16
        ),
      ],
      { segments: 24, close: false }
    ),
    { color, opts: o }
  );
  // Sides and nape, hanging past the ears and round the back of the neck. Its
  // top tucks under the crown's rim so the two never show a seam, and it is
  // solid rather than a shell: a shell thin enough to look like hair has its
  // inner wall inside the head (r 0.645), which then z-fights its way back out
  // in a ragged line along the jaw.
  b.addGeometry(
    latheSector(
      // The top ring is narrower than the crown is at that height, so it tucks
      // in under it. Butted flush, its top annulus clears the crown's rim by a
      // hair and shows from the front as a notch cut out of the hairline.
      [
        [0.02, 0.84],
        [0.66, 0.84],
        [0.705, 0.7],
        [0.705, 0.5],
        [0.69, 0.34],
        [0.64, 0.24],
        [0.02, 0.24],
      ],
      0,
      { segments: 24, openHalf: 0.98 }
    ),
    { color, opts: o }
  );

  // The buns. Big enough that their tops rise past the crown's rim and their
  // outsides clear the hair shell: sized to the head they are earmuffs, and
  // the one silhouette everybody recognises is lost. The pair take the head
  // from 1.29 wide to 1.95, which is what carries across a room. Rings of
  // falling radius rather than a sphere, so it reads as a coiled braid.
  const Y = 0.55;
  const Z = -0.05;
  for (const sx of [-1, 1]) {
    b.addGeometry(new THREE.CylinderGeometry(0.38, 0.38, 0.2, 18), {
      x: sx * 0.6,
      y: Y,
      z: Z,
      rot: [0, 0, Math.PI / 2],
      color,
      opts: o,
    });
    b.addGeometry(new THREE.TorusGeometry(0.29, 0.105, 8, 22), {
      x: sx * 0.7,
      y: Y,
      z: Z,
      rot: [0, Math.PI / 2, 0],
      color,
      opts: o,
    });
    b.addGeometry(new THREE.TorusGeometry(0.175, 0.095, 7, 18), {
      x: sx * 0.79,
      y: Y,
      z: Z,
      rot: [0, Math.PI / 2, 0],
      color,
      opts: o,
    });
    b.addGeometry(new THREE.SphereGeometry(0.1, 10, 8), { x: sx * 0.855, y: Y, z: Z, color, opts: o });
  }
  return b.build();
}

/**
 * Leia's robe: a tapered white skirt replacing the visible gap between the
 * legs, so she reads as robed rather than trousered. Pelvis-local: the hips
 * occupy y 0..0.46 and the legs hang from y 0 down to -1.62.
 */
function leiaSkirt(color = COLORS.white) {
  const b = new Bricks();
  const yTop = 0.44;
  const yHem = -1.3;
  // Down to the ankle, not the knee: stopping halfway leaves two white shins
  // below the hem and she goes back to reading as trousers with an apron over
  // them. Lathed rather than a tapered box — four flat faces put a hard
  // vertical corner down the front of the robe wherever the key light is, and
  // cloth does not have corners.
  const geo = latheShell(
    [
      [0.03, yTop],
      [0.76, yTop],
      [0.83, 0.1],
      [0.94, -0.5],
      [1.04, -1.12],
      [1.08, yHem + 0.05],
      [0.03, yHem],
    ],
    { segments: 22, close: false }
  );
  // Gathered at the waist, round at the hem. One constant squash deep enough
  // at the hem to clear a stride is also that deep at the belt, and the robe
  // stands off the hips like a barrel.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.clamp((yTop - pos.getY(i)) / (yTop - yHem), 0, 1);
    pos.setZ(i, pos.getZ(i) * (0.6 + 0.15 * k));
  }
  pos.needsUpdate = true;
  b.addGeometry(weldNormals(geo), { x: 0, y: 0, z: 0.02, color });
  return b.build();
}

/**
 * Right-hand half of Vader's face-mask outline, in mask-local units (the mask
 * centre is the origin), running top-centre down to bottom-centre. Sized so
 * that every mark in helmet-vader.svg lands inside the plate: wide across the
 * brow, straight down the cheeks, then angling hard in to the chin.
 */
const VADER_MASK_OUTLINE = [
  [0.0, 0.543],
  [0.325, 0.519],
  [0.573, 0.415],
  [0.56, 0.059],
  [0.543, -0.177],
  [0.521, -0.296],
  [0.273, -0.464],
  [0.148, -0.578],
  [0.0, -0.592],
];

/**
 * Where the mask sits on the head, and how big the print on it is. The tilt is
 * negative — brow back, grille forward — which is both the real profile and
 * the only way the top edge of a flat plate stays close to a domed helmet
 * instead of standing off it as a shelf.
 */
const VADER_MASK_AT = { y: 0.47, z: 0.9, tilt: -0.16, w: 1.16, h: 1.16, bow: 0.1 };

/**
 * How much wider than deep the helmet is. Vader's cowl is a broad oval seen
 * from above, not a cylinder: scaling x alone widens the cheeks and the
 * shoulder flare without pushing the front of the shell out over the mask or
 * flattening the back of the dome.
 */
const VADER_WIDEN = 1.09;

/**
 * Vader's helmet, head-local (head bottom = 0, top = 1.04, r = 0.645).
 *
 * Three pieces and no more: an ogival crown whose widest point is down at
 * cheek height, a flared skirt over the neck and shoulders, and the angular
 * face plate. Everything else about the mask — brow, lenses, nose, grille,
 * chin — is printed by helmet-vader.svg, so moulding it as well only produces
 * a bright clutter of grey edges where the character wants a black void.
 */
function vaderHelmet({ shell = VADER_BLACK, mask = VADER_BLACK_DEEP } = {}) {
  const b = new Bricks();
  // Matte. A glossy black helmet under a hard key light grows a blown-out
  // white bar along every facet, which on this silhouette reads as a visor.
  const g = { finish: 'rubber' };

  // Crown and cowl are both lathed, then widened across x together so the
  // helmet is a broad oval in plan.
  b.push();
  b.scale(VADER_WIDEN, 1, 1);

  // Crown: one solid lathe, squat and round rather than ogival. A tall ogive
  // is a bullet — it has no brow, and from behind it is a smooth egg. Keeping
  // the apex low and the widest point down at the ears leaves the dome
  // reading as a helmet sitting over a face.
  b.addGeometry(
    latheShell(
      [
        [0.015, 1.4],
        [0.235, 1.375],
        [0.44, 1.3],
        [0.615, 1.175],
        [0.735, 1.01],
        [0.812, 0.82],
        [0.852, 0.62],
        [0.864, 0.44],
        [0.85, 0.3],
        [0.8, 0.2],
        [0.015, 0.19],
      ],
      { segments: 26, close: false }
    ),
    { color: shell, opts: g }
  );

  // Neck flare: one full lathe, raked so the hem is short under the chin and
  // long over the shoulders. An open sector gives the same asymmetry but
  // leaves two flat radial caps standing proud of the silhouette side-on, and
  // its inner wall z-fights the crown. The top ring is a hair wider than the
  // crown's widest point (0.864) so the join is a clean step, not a seam.
  b.addGeometry(
    rakeHem(
      latheShell(
        [
          [0.02, 0.34],
          [0.876, 0.34],
          [0.918, 0.15],
          [0.962, -0.05],
          [1.0, -0.25],
          [0.945, -0.32],
          [0.02, -0.28],
        ],
        { segments: 26 }
      ),
      { drop: 0.32, pivot: 0.34, span: 0.6, power: 1.25 }
    ),
    { color: shell, opts: g }
  );
  b.pop();

  // Face plate. The taper sinks its edges back into the dome and the bow
  // curves the cheeks away, so the mask grows out of the helmet instead of
  // being a slab screwed onto the front of it — side-on, a flat plate leaves a
  // shoebox of exposed side wall standing off the curve. It is left out of the
  // widening: the mask is the one part of the helmet that is not oval.
  b.addGeometry(taperShield(VADER_MASK_OUTLINE, 0.46, [1.2, 0.94], [0, -0.05], VADER_MASK_AT.bow), {
    x: 0,
    y: VADER_MASK_AT.y,
    z: VADER_MASK_AT.z,
    rot: [VADER_MASK_AT.tilt, 0, 0],
    color: mask,
    opts: g,
  });
  return b.build();
}

/**
 * Vader's lenses and grille, only used when helmet-vader.svg is unavailable.
 * Smoked grey rather than black: on a black helmet under this film's lighting
 * a black lens on black plastic simply disappears.
 */
function vaderMaskFallback(lens = 0x39454f) {
  const b = new Bricks();
  const o = { finish: 'glossy' };
  for (const sx of [-1, 1]) {
    // A trapezoid narrowing toward the nose, tilted like the real lens.
    b.addGeometry(taperBox(0.34, 0.42, 0.3, 0.05, 0.05, 0.025), {
      x: sx * 0.245,
      y: 0.19,
      z: 0.008,
      rot: [0, 0, sx * 0.32],
      color: lens,
      opts: o,
    });
  }
  // Triangular grille, five slats narrowing downward.
  for (let i = 0; i < 5; i++) {
    const w = 0.36 - i * 0.05;
    b.addGeometry(chamferBox(w, 0.035, 0.04, 0.012), { x: 0, y: -0.16 - i * 0.075, z: 0.008, color: lens, opts: o });
  }
  return b.build();
}

/**
 * Outline of the trooper shell, head-local (head bottom = 0, top = 1.04).
 * Squat and barrelled, widest down at the ear line rather than at the crown:
 * a shell whose widest point is up near the temples reads as a bike helmet.
 * Shared with the print, which is laid on this exact curve by `shellPatch`.
 */
const TROOPER_SHELL = [
  [0.03, 0.0],
  ...smoothProfile(
    [
      [0.5, 0.015],
      [0.7, 0.14],
      [0.762, 0.35],
      [0.778, 0.6],
      [0.735, 0.9],
      [0.625, 1.09],
      [0.42, 1.22],
      [0.2, 1.275],
      [0.03, 1.29],
    ],
    20
  ),
];

/**
 * Where the print sits on the shell. The artwork fills the middle 75% of the
 * SVG's height, so the band is sized to land the brow just under the crown and
 * the lip just above the neck seal; the empty margins run on up over the dome.
 */
const TROOPER_FACE_AT = { yFrom: 0.16, yTo: 1.13, halfAngle: 0.86 };

/**
 * Stormtrooper helmet, head-local.
 *
 * A solid of revolution does most of the work; the character comes from the
 * proportions (wide at the ears, tapering to a small chin) plus the crown rib
 * and the ear plates. Everything on the face — brow band, lenses, cheek
 * intakes, frown — is printed by helmet-stormtrooper.svg.
 */
function trooperHelmet({ armour = COLORS.white, dark = COLORS.trueBlack, trim = COLORS.darkBluishGray } = {}) {
  const b = new Bricks();
  // Plastic, not glossy: a tight specular on a white shell this size puts two
  // hard blue-white coins on the crown from the rim light, and the helmet
  // stops reading as moulded ABS and starts reading as porcelain.
  const o = { finish: 'plastic' };

  b.addGeometry(latheShell(TROOPER_SHELL, { segments: 26, close: false }), { color: armour, opts: o });

  // The rib over the crown, taken off the shell's own curve so it sits flush
  // and only its lift shows.
  b.addGeometry(crownRib(TROOPER_SHELL, { yFront: 1.04, yBack: 0.78, radius: 0.11, lift: 0.034 }), {
    color: armour,
    opts: o,
  });

  // Ear plates: the trooper's most legible profile feature after the frown —
  // a shallow raised panel with three vent bars, on the widest point of the
  // shell. Kept low; a proud plate throws a shadow and reads as a headphone.
  for (const sx of [-1, 1]) {
    onCurve(b, sx * (Math.PI / 2 + 0.1), 0.5, 0.775, 0, (bb) => {
      bb.addGeometry(taperBox(0.36, 0.29, 0.54, 0.06, 0.06, 0.04), { color: armour, opts: o });
      for (let i = -1; i <= 1; i++) {
        bb.addGeometry(chamferBox(0.055, 0.32, 0.04, 0.015), { x: i * 0.09, z: 0.028, color: trim, opts: o });
      }
    });
  }

  // Neck seal below the jaw, so the helmet does not end in a bare white hole.
  b.addGeometry(new THREE.CylinderGeometry(0.56, 0.52, 0.24, 18), { x: 0, y: -0.11, z: 0, color: dark, opts: o });
  return b.build();
}

/** Eyes and the "frown" vent, only used when helmet-stormtrooper.svg is missing. */
function trooperFaceFallback(armour = COLORS.white) {
  const b = new Bricks();
  const dark = 0x0a0d11;
  const o = { finish: 'glossy' };
  const R = 0.80;

  // Eye lenses: big, wide-set, wrapping round the curve of the helmet.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = sx * (0.16 + i * 0.20);
      onCurve(b, a, 0.76 - i * 0.02, R - 0.02, 0, (bb) =>
        bb.addGeometry(chamferBox(0.24, 0.30 - i * 0.045, 0.07, 0.025), { color: dark, opts: o })
      );
    }
  }
  // Brow line joining the lenses over the nose.
  onCurve(b, 0, 0.94, R - 0.02, 0, (bb) => bb.addGeometry(chamferBox(0.70, 0.06, 0.06, 0.02), { color: dark, opts: o }));
  // Nose vent.
  onCurve(b, 0, 0.62, R - 0.02, 0, (bb) => bb.addGeometry(chamferBox(0.17, 0.34, 0.07, 0.025), { color: dark, opts: o }));
  // The frown: a wide vent with three bars.
  onCurve(b, 0, 0.36, R - 0.03, 0, (bb) => bb.addGeometry(chamferBox(0.66, 0.22, 0.07, 0.025), { color: dark, opts: o }));
  for (let i = -1; i <= 1; i++) {
    onCurve(b, i * 0.20, 0.36, R + 0.005, 0, (bb) =>
      bb.addGeometry(chamferBox(0.06, 0.22, 0.05, 0.015), { color: armour, opts: o })
    );
  }
  // The two "tears" under the outer corners of the eyes.
  for (const sx of [-1, 1]) {
    onCurve(b, sx * 0.42, 0.54, R - 0.02, 0, (bb) =>
      bb.addGeometry(chamferBox(0.07, 0.16, 0.06, 0.02), { color: dark, opts: o })
    );
  }
  return b.build();
}

/**
 * Rebel Fleet Trooper helmet: an open-face cap with a narrow rim, leaving the
 * face visible under the brim.
 */
function rebelHelmet({ shell = COLORS.tan, trim = COLORS.sandBlue } = {}) {
  const b = new Bricks();
  const o = { finish: 'plastic' };
  const dbl = { finish: 'plastic', side: THREE.DoubleSide };

  // Squashed crown.
  b.push();
  b.translateWorld(0, 0.80, -0.02);
  b.scale(1, 0.66, 1.04);
  b.addGeometry(domeGeometry(0.78, Math.PI * 0.5, 18), { color: shell, opts: o });
  b.pop();
  // Back and sides, coming down over the ears; the front is left open.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.78, 0.82],
          [0.78, 0.44],
          [0.76, 0.18],
        ],
        // Thin enough that the inner wall stays outside the head (r 0.645);
        // any thicker and the head grinds out through the shell.
        0.1
      ),
      { segments: 20, openHalf: 1.04 }
    ),
    { x: 0, y: 0, z: -0.02, color: shell, opts: dbl }
  );
  // Narrow rim all the way round.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.80, 0.86],
          [0.93, 0.80],
        ],
        0.15
      ),
      { segments: 20 }
    ),
    { x: 0, y: 0, z: -0.02, color: trim, opts: dbl }
  );
  // Front brim, angled down over the brow.
  b.addGeometry(chamferBox(0.80, 0.07, 0.26, 0.03), {
    x: 0,
    y: 0.79,
    z: 0.80,
    rot: [-0.34, 0, 0],
    color: trim,
    opts: o,
  });
  // Comms box on the left side.
  b.addGeometry(chamferBox(0.15, 0.22, 0.30, 0.04), { x: -0.74, y: 0.48, z: 0.14, color: COLORS.darkBluishGray, opts: o });
  // Chin strap.
  b.addGeometry(chamferBox(1.30, 0.09, 0.12, 0.03), { x: 0, y: 0.08, z: 0.28, color: COLORS.darkBrown, opts: o });
  return b.build();
}

/**
 * Rebel pilot flight helmet: white shell with orange bands, a visor tipped up
 * over the brow, and a breather box on the cheek.
 */
function pilotHelmet({ shell = COLORS.white, band = COLORS.brightOrange, gear = COLORS.darkBluishGray } = {}) {
  const b = new Bricks();
  const o = { finish: 'glossy' };
  const dbl = { finish: 'glossy', side: THREE.DoubleSide };

  // Crown.
  b.push();
  b.translateWorld(0, 0.84, -0.02);
  b.scale(1, 0.62, 1.02);
  b.addGeometry(domeGeometry(0.80, Math.PI * 0.5, 20), { color: shell, opts: o });
  b.pop();
  // Sides and back, coming down past the ears.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.8, 0.86],
          [0.81, 0.42],
          [0.79, 0.04],
          [0.74, -0.1],
        ],
        0.11
      ),
      { segments: 22, openHalf: 1.00 }
    ),
    { x: 0, y: 0, z: -0.02, color: shell, opts: dbl }
  );
  // Brow band closing the top of the face opening.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.81, 0.90],
          [0.83, 0.80],
        ],
        0.15
      ),
      { segments: 20, openHalf: Math.PI - 1.05 }
    ),
    { x: 0, y: 0, z: -0.02, rot: [0, Math.PI, 0], color: shell, opts: dbl }
  );
  // Orange stripe round the shell.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.836, 0.72],
          [0.836, 0.55],
        ],
        0.055
      ),
      { segments: 22, openHalf: 1.00 }
    ),
    { x: 0, y: 0, z: -0.02, color: band, opts: dbl }
  );
  // Orange crest running front to back over the crown. A straight box laid on
  // top is tangent to the dome and juts out fore and aft like an aerial, so
  // this follows the crown's own ellipse.
  b.addGeometry(
    ridgeFin(
      [
        [-0.847, 0.974],
        [-0.721, 1.139],
        [-0.448, 1.292],
        [-0.02, 1.361],
        [0.408, 1.292],
        [0.681, 1.139],
        [0.807, 0.974],
        [0.768, 0.968],
        [0.648, 1.125],
        [0.388, 1.27],
        [-0.02, 1.336],
        [-0.428, 1.27],
        [-0.688, 1.125],
        [-0.808, 0.968],
      ],
      0.2
    ),
    { color: band, opts: o }
  );
  // Visor, tipped up just clear of the brow.
  b.addGeometry(chamferBox(1.18, 0.18, 0.32, 0.05), {
    x: 0,
    y: 1.04,
    z: 0.48,
    rot: [-0.46, 0, 0],
    color: COLORS.trueBlack,
    opts: { finish: 'glossy' },
  });
  b.addGeometry(chamferBox(1.24, 0.07, 0.10, 0.025), { x: 0, y: 0.93, z: 0.56, color: band, opts: o });
  // Breather box and hose stub on the cheek.
  b.addGeometry(chamferBox(0.24, 0.34, 0.28, 0.05), { x: -0.70, y: 0.28, z: 0.34, color: gear, opts: o });
  b.addGeometry(new THREE.CylinderGeometry(0.085, 0.085, 0.20, 10), {
    x: -0.82,
    y: 0.22,
    z: 0.34,
    rot: [0, 0, Math.PI / 2],
    color: STEEL,
    opts: POLISH,
  });
  // Chin strap.
  b.addGeometry(chamferBox(1.30, 0.10, 0.14, 0.03), { x: 0, y: 0.02, z: 0.28, color: gear, opts: o });
  return b.build();
}

/** Imperial officer's cap: flat-topped disc, black band, short peak. */
function officerCap(color = COLORS.trueBlack) {
  const b = new Bricks();
  const o = { finish: 'glossy' };
  b.addGeometry(new THREE.CylinderGeometry(0.74, 0.70, 0.18, 22), { x: 0, y: 1.00, z: -0.03, color, opts: o });
  b.addGeometry(new THREE.CylinderGeometry(0.70, 0.68, 0.24, 22), { x: 0, y: 0.84, z: -0.03, color, opts: o });
  // Peak.
  b.addGeometry(taperBox(0.52, 0.74, 0.07, 0.40, 0.28, 0.03), {
    x: 0,
    y: 0.76,
    z: 0.72,
    rot: [-0.26, 0, Math.PI],
    color,
    opts: o,
  });
  // Cap badge.
  b.addGeometry(chamferBox(0.22, 0.09, 0.05, 0.02), { x: 0, y: 0.89, z: 0.69, color: SILVER, opts: POLISH });
  return b.build();
}

/**
 * A conical hood, built as two lathed shells: an open lower cone that frames
 * the face and a closed upper cone that forms the brow and the peak.
 */
function hoodPiece({ color, rLow, rBrow, rTip, yLow, yBrow, yTip, openHalf, thickness = 0.14, opts = {} }) {
  const b = new Bricks();
  const dbl = { ...opts, side: THREE.DoubleSide };
  // latheSector, not latheShell: the sector caps the two cut ends, which is
  // what gives the face opening a rolled edge with thickness to it.
  b.addGeometry(
    latheSector(
      [
        [rLow, yLow],
        [rBrow, yBrow],
      ],
      thickness,
      { segments: 24, openHalf }
    ),
    { color, opts: dbl }
  );
  // The cap overlaps the cowl and sits a hair outside it. Butting the two at
  // the same ring leaves the cowl's top annulus lit and facing the sky, which
  // reads as a bright band drawn round the brow.
  const overlap = 0.24;
  const rJoin = rBrow + ((rLow - rBrow) * overlap) / (yBrow - yLow) + 0.015;
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [rJoin, yBrow - overlap],
          [rBrow * 0.84, yBrow + (yTip - yBrow) * 0.45],
          [rTip, yTip],
        ],
        thickness
      ),
      { segments: 24 }
    ),
    { color, opts: dbl }
  );
  return b;
}

/** Ben's hood: low and wide, framing the face rather than swallowing it. */
function benHood(color = COLORS.reddishBrown) {
  return hoodPiece({
    color,
    rLow: 0.95,
    rBrow: 0.84,
    rTip: 0.26,
    yLow: -0.3,
    yBrow: 0.82,
    yTip: 1.28,
    openHalf: 1.1,
    thickness: 0.15,
    opts: { finish: 'rubber' },
  }).build();
}

/** Ben's robe: a mantle over the shoulders plus the belt. Torso-local. */
function benMantle(color = COLORS.reddishBrown, under = COLORS.darkTan) {
  const b = new Bricks();
  const o = { finish: 'rubber' };
  const dbl = { finish: 'rubber', side: THREE.DoubleSide };
  // Squashed front to back. A plain surface of revolution wide enough to reach
  // the shoulders is also that deep, and Ben ends up wearing a barrel.
  b.push();
  b.scale(1, 1, 0.64);
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.66, 1.9],
          [0.98, 1.44],
          [1.12, 1.04],
        ],
        0.16
      ),
      { segments: 22 }
    ),
    { color, opts: dbl }
  );
  b.pop();
  // The robe's front edges, leaving the tunic showing between them.
  for (const sx of [-1, 1]) {
    b.addGeometry(taperBox(0.34, 0.30, 1.56, 0.20, 0.22, 0.06), {
      x: sx * 0.46,
      y: 0.80,
      z: 0.50,
      rot: [0, 0, sx * 0.06],
      color,
      opts: o,
    });
  }
  // Tunic panel between them.
  b.addGeometry(chamferBox(0.66, 1.20, 0.10, 0.04), { x: 0, y: 0.92, z: 0.52, color: under, opts: o });
  // Belt.
  b.addGeometry(chamferBox(1.56, 0.20, 0.96, 0.04), { x: 0, y: 0.14, z: 0, color: COLORS.darkBrown, opts: o });
  b.addGeometry(chamferBox(0.26, 0.18, 0.10, 0.03), { x: 0, y: 0.14, z: 0.51, color: STEEL, opts: POLISH });
  return b.build();
}

/** The Jawa's hood, drawn tight so only the glowing eyes show. */
function jawaHood(color = COLORS.darkBrown) {
  return hoodPiece({
    color,
    rLow: 1.06,
    rBrow: 0.84,
    rTip: 0.12,
    yLow: -0.36,
    yBrow: 0.86,
    yTip: 1.46,
    openHalf: 0.64,
    thickness: 0.15,
    opts: { finish: 'rubber' },
  }).build();
}

/** The Jawa's robe: a cone from the shoulders to the floor, hiding the legs. */
function jawaRobe(color = COLORS.darkBrown, { yTop, yBottom, rTop = 0.78, rBottom = 1.42 }) {
  const b = new Bricks();
  const o = { finish: 'rubber' };
  const h = yTop - yBottom;
  const rAt = (y) => rTop + ((yTop - y) / h) * (rBottom - rTop);
  b.addGeometry(new THREE.CylinderGeometry(rTop, rBottom, h, 22), { x: 0, y: yBottom + h / 2, z: 0, color, opts: o });
  // Hem lip.
  b.addGeometry(new THREE.CylinderGeometry(rBottom, rBottom * 1.03, 0.16, 22), { x: 0, y: yBottom + 0.08, z: 0, color, opts: o });
  // Bandolier across the chest, riding on the outside of the cone.
  for (let i = 0; i < 6; i++) {
    const y = yTop - 0.32 - i * 0.30;
    const x = -0.34 + i * 0.14;
    const r = rAt(y);
    const z = Math.sqrt(Math.max(0.02, r * r - x * x)) - 0.02;
    b.addGeometry(chamferBox(0.30, 0.30, 0.10, 0.03), {
      x,
      y,
      z,
      rot: [0, 0, 0.45],
      color: COLORS.reddishBrown,
      opts: o,
    });
    if (i % 2 === 0) {
      b.addGeometry(chamferBox(0.12, 0.14, 0.08, 0.02), { x, y, z: z + 0.07, color: STEEL, opts: POLISH });
    }
  }
  return b.build();
}

/** Two emissive discs set into the Jawa's pitch-black face. */
function jawaEyes(color = 0xffd21a) {
  const b = new Bricks();
  const glow = { emissive: color, emissiveIntensity: 3.2, finish: 'glow', toneMapped: false };
  for (const sx of [-1, 1]) {
    b.addGeometry(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 12), {
      x: sx * 0.23,
      y: 0.56,
      z: 0.635,
      rot: [Math.PI / 2, 0, 0],
      color,
      opts: glow,
    });
  }
  return b.build();
}

/**
 * Luke's hair: one swept blond cap. Everything is above the hairline — an
 * earlier version hung a separate fringe ring across the brow and it read
 * dead-on as a pair of goggles, which is exactly the wrong character.
 */
function lukeHair(color = SANDY_BLOND) {
  const b = new Bricks();
  const o = { finish: 'plastic' };

  // Cap, sitting on the head with its rim just above the printed brow.
  b.addGeometry(
    latheShell(
      [
        [0.03, FACE_TOP + 0.02],
        [0.7, FACE_TOP + 0.02],
        [0.706, 0.9],
        [0.688, 0.99],
        [0.63, 1.07],
        [0.52, 1.14],
        [0.36, 1.19],
        [0.18, 1.22],
        [0.03, 1.23],
      ],
      { segments: 22, close: false }
    ),
    { color, opts: o }
  );
  // Nape and sideburns: the hair is longer behind the ears than in front.
  // Solid, not a shell — a shell thin enough to look like hair has its inner
  // wall inside the head (r 0.645), and the head then z-fights its way out
  // through it in a ragged line all round the jaw.
  b.addGeometry(
    latheSector(
      [
        [0.02, 0.79],
        [0.694, 0.79],
        [0.698, 0.58],
        [0.678, 0.42],
        [0.63, 0.34],
        [0.02, 0.34],
      ],
      0,
      { segments: 20, openHalf: 1.15 }
    ),
    { color, opts: o }
  );
  // Side-parted fringe: a swept plate laid tangentially on the front of the
  // cap, off-centre for the parting. Placed with `onCurve` so it follows the
  // crown instead of stabbing through it at a corner.
  onCurve(b, 0.14, 0.9, 0.63, -0.62, (bb) =>
    bb.addGeometry(taperBox(0.94, 0.66, 0.3, 0.2, 0.13, 0.05), { color, opts: o })
  );
  return b.build();
}

/** C-3PO's exposed waist wiring. Torso-local, sitting in the hip gap. */
function threepioWiring() {
  const b = new Bricks();
  const wires = [COLORS.trueBlack, COLORS.red, COLORS.darkBluishGray, COLORS.blue, COLORS.trueBlack];
  // Laid on the ellipse of the torso's bottom (1.50 x 0.90) and standing a
  // little proud of it, or they sit inside the shell and never show.
  for (let i = 0; i < wires.length; i++) {
    const x = (i - (wires.length - 1) / 2) * 0.26;
    b.addGeometry(new THREE.CylinderGeometry(0.062, 0.062, 0.46, 8), {
      x,
      y: 0.1,
      z: 0.47 * Math.sqrt(Math.max(0, 1 - (x / 0.78) ** 2)) + 0.03,
      color: wires[i],
      opts: { finish: 'rubber' },
    });
  }
  // A loom running round the back.
  b.addGeometry(new THREE.TorusGeometry(0.52, 0.055, 6, 18, Math.PI), {
    x: 0,
    y: 0.12,
    z: 0,
    rot: [Math.PI / 2, 0, 0],
    color: COLORS.trueBlack,
    opts: { finish: 'rubber' },
  });
  // Waist collar capping the wiring.
  b.addGeometry(chamferBox(1.4, 0.16, 0.92, 0.05), { x: 0, y: 0.36, z: 0, color: DROID_GOLD_DARK, opts: POLISH });
  return b.build();
}

// ---------------------------------------------------------------------------
// The cast — minifigures
// ---------------------------------------------------------------------------

/**
 * Princess Leia — white robe, side buns.
 * @param {object} opts `{ scale, seed }`
 */
export async function makeLeia(opts = {}) {
  const fig = await buildMinifig({
    shirt: COLORS.white,
    arms: COLORS.white,
    legs: COLORS.white,
    hips: COLORS.white,
    hands: SKIN,
    head: SKIN,
    face: 'svg/face-leia.svg',
    torsoPrint: 'svg/torso-leia.svg',
    scale: opts.scale ?? 1,
    seed: opts.seed ?? 11.3,
    headStud: false,
  });

  fig.hair = leiaBuns(COLORS.reddishBrown);
  fig.accessory.add(fig.hair);

  fig.skirt = leiaSkirt(COLORS.white);
  fig.pelvis.add(fig.skirt);
  /**
   * A robe restricts the stride; scenes should walk her with this amplitude.
   * Much past it and the shins swing through the front of the hem rather than
   * only the feet coming out from under it.
   */
  fig.walkAmp = 0.3;

  // No moulded belt: torso-leia.svg prints the silver belt and its buckle at
  // the right height, and a brick over it only breaks the artwork.

  fig.name = 'leia';
  return fig;
}

/**
 * Darth Vader — taller than the rest, helmeted, caped, red blade off by
 * default. `fig.setSaber(0..1)` extends the blade.
 *
 * He is built in LEGO "black" rather than "true black": with no environment
 * map in the film, true black swallows every form he has.
 */
export async function makeVader(opts = {}) {
  const shell = opts.shell ?? VADER_BLACK;
  const fig = await buildMinifig({
    shirt: shell,
    arms: shell,
    legs: shell,
    hips: VADER_BLACK_DEEP,
    hands: VADER_BLACK_DEEP,
    head: shell,
    torsoPrint: 'svg/torso-vader.svg',
    scale: opts.scale ?? 1.14,
    seed: opts.seed ?? 23.7,
    // Matte: a glossy near-black torso picks up big white speculars that read
    // as pale grey armour instead of black.
    finish: 'plastic',
    headStud: false,
  });

  stripHeadTexture(fig, shell);

  const helmet = vaderHelmet({ shell });
  fig.accessory.add(helmet);
  fig.helmet = helmet;

  // The print and the moulded lenses share the plate's frame, so both sit
  // flush on the tilted face however the plate is positioned.
  const maskAt = new THREE.Group();
  maskAt.position.set(0, VADER_MASK_AT.y, VADER_MASK_AT.z);
  maskAt.rotation.x = VADER_MASK_AT.tilt;
  fig.accessory.add(maskAt);
  const mask = await decalOn(
    'svg/helmet-vader.svg',
    bowedDecal(VADER_MASK_AT.w, VADER_MASK_AT.h, VADER_MASK_AT.bow)
  );
  if (mask) {
    mask.position.z = 0.006;
    maskAt.add(mask);
  } else {
    maskAt.add(vaderMaskFallback());
  }

  // No moulded chest box or belt: torso-vader.svg prints the control panel,
  // the silver plates and the belt, and a brick on top of them only fights
  // the artwork.
  attachCape(fig, VADER_BLACK_DEEP, { width: 2.375, height: 3.5 });

  giveSaber(fig, KIT.saberRed, { on: false, length: 3.3 });

  fig.name = 'vader';
  return fig;
}

/**
 * Stormtrooper. `opts.variant` gives each member of a squad its own phase and
 * a slightly different amount of scuffing, so crowds do not move or read in
 * lockstep.
 */
export async function makeStormtrooper(opts = {}) {
  const variant = opts.variant ?? 0;
  const h = (k) => hash11(variant + 1, 9137 + k * 131);
  // Grubbiness: pristine on the Death Star, dustier on Tatooine.
  const scuff = (opts.scuff ?? 1) * (0.02 + h(0) * 0.10);
  const armour = mixHex(COLORS.white, COLORS.lightBluishGray, scuff);
  const helmetWhite = mixHex(COLORS.white, COLORS.lightBluishGray, scuff * 0.7);

  const fig = await buildMinifig({
    shirt: armour,
    arms: armour,
    legs: armour,
    hips: COLORS.trueBlack,
    hands: armour,
    head: helmetWhite,
    torsoPrint: 'svg/torso-stormtrooper.svg',
    scale: opts.scale ?? 1 + (h(1) - 0.5) * 0.03,
    seed: opts.seed ?? 3.1 + variant * 0.9137,
    finish: 'glossy',
    headStud: false,
  });

  stripHeadTexture(fig, helmetWhite);

  const helmet = trooperHelmet({ armour: helmetWhite });
  fig.accessory.add(helmet);
  fig.helmet = helmet;

  const face = await decalOn(
    'svg/helmet-stormtrooper.svg',
    shellPatch(TROOPER_SHELL, { ...TROOPER_FACE_AT, rows: 12, segments: 22 })
  );
  if (face) fig.accessory.add(face);
  else fig.accessory.add(trooperFaceFallback(helmetWhite));

  // A scuff or two, placed from the hash so each trooper is subtly its own.
  if (scuff > 0.05) {
    const b = new Bricks();
    const smudge = mixHex(COLORS.lightBluishGray, COLORS.darkBluishGray, 0.4);
    b.addGeometry(chamferBox(0.30, 0.16, 0.05, 0.02), {
      x: (h(2) - 0.5) * 1.2,
      y: 0.4 + h(3) * 1.1,
      z: 0.52,
      rot: [0, 0, (h(4) - 0.5) * 1.2],
      color: smudge,
      opts: { opacity: 0.55, transparent: true },
    });
    fig.torso.add(b.build());
  }

  // Short barrel: at the kit's 0.15 bore, anything much over a stud long
  // hangs from the resting hand as a uniformly thin rod and reads as a cane.
  giveBlaster(fig, COLORS.trueBlack, { len: 1.0, scope: true });

  fig.variant = variant;
  fig.name = 'stormtrooper';
  return fig;
}

/** Rebel Fleet Trooper — tan flak vest, blue trousers, open-face helmet. */
export async function makeRebelTrooper(opts = {}) {
  const variant = opts.variant ?? 0;
  const fig = await buildMinifig({
    shirt: COLORS.tan,
    arms: COLORS.tan,
    legs: COLORS.sandBlue,
    hips: COLORS.darkBluishGray,
    hands: SKIN,
    head: SKIN,
    face: 'svg/face-determined.svg',
    torsoPrint: 'svg/torso-rebel-trooper.svg',
    scale: opts.scale ?? 1,
    seed: opts.seed ?? 5.7 + variant * 1.213,
    headStud: false,
  });

  fig.helmet = rebelHelmet();
  fig.accessory.add(fig.helmet);

  giveBlaster(fig, COLORS.trueBlack, { len: 0.8 });

  fig.variant = variant;
  fig.name = 'rebel-trooper';
  return fig;
}

/** Luke Skywalker — Tatooine tunic. `opts.withSaber` clips a blue blade in. */
export async function makeLuke(opts = {}) {
  const fig = await buildMinifig({
    shirt: COLORS.tan,
    arms: COLORS.tan,
    legs: COLORS.darkTan,
    hips: COLORS.reddishBrown,
    hands: SKIN,
    head: SKIN,
    face: 'svg/face-luke.svg',
    torsoPrint: 'svg/torso-luke.svg',
    scale: opts.scale ?? 1,
    seed: opts.seed ?? 7.9,
    headStud: false,
  });

  fig.hair = lukeHair();
  fig.accessory.add(fig.hair);

  const belt = new Bricks()
    .addGeometry(chamferBox(1.56, 0.18, 0.96, 0.04), { x: 0, y: 0.14, z: 0, color: COLORS.reddishBrown })
    .addGeometry(chamferBox(0.26, 0.20, 0.10, 0.03), { x: 0, y: 0.14, z: 0.50, color: STEEL, opts: POLISH })
    .build();
  fig.torso.add(belt);

  if (opts.withSaber) giveSaber(fig, KIT.saberBlue, { on: opts.saberOn ?? false, length: 3.1 });

  fig.name = 'luke';
  return fig;
}

/**
 * Obi-Wan "Ben" Kenobi — hooded desert robes and a blue blade.
 * `opts.ghost = true` turns every material translucent additive blue.
 */
export async function makeBen(opts = {}) {
  const robe = COLORS.reddishBrown;
  const tunic = COLORS.darkTan;
  const fig = await buildMinifig({
    shirt: COLORS.brown,
    arms: robe,
    legs: tunic,
    hips: COLORS.darkBrown,
    hands: SKIN,
    head: SKIN,
    face: 'svg/face-old-ben.svg',
    torsoPrint: 'svg/torso-luke.svg',
    scale: opts.scale ?? 1.02,
    seed: opts.seed ?? 13.1,
    headStud: false,
  });

  fig.hood = benHood(robe);
  fig.accessory.add(fig.hood);
  fig.torso.add(benMantle(robe, tunic));
  attachCape(fig, robe, { width: 2.25, height: 3.0 });

  giveSaber(fig, KIT.saberBlue, { on: opts.saberOn ?? false, length: 3.1 });

  if (opts.ghost) {
    ghostify(fig.root, opts.ghostColor ?? KIT.hologram);
    fig.ghost = true;
  }

  fig.name = 'ben';
  return fig;
}

/** Rebel X-wing pilot — orange flight suit, white legs, flight helmet. */
export async function makePilot(opts = {}) {
  const variant = opts.variant ?? 0;
  const fig = await buildMinifig({
    shirt: COLORS.brightOrange,
    arms: COLORS.brightOrange,
    legs: COLORS.white,
    hips: COLORS.darkBluishGray,
    hands: COLORS.darkBluishGray,
    head: SKIN,
    face: 'svg/face-determined.svg',
    torsoPrint: 'svg/torso-pilot.svg',
    scale: opts.scale ?? 1,
    seed: opts.seed ?? 17.4 + variant * 1.117,
    headStud: false,
  });

  fig.helmet = pilotHelmet();
  fig.accessory.add(fig.helmet);

  // Chest life-support box and harness.
  const b = new Bricks();
  b.addGeometry(chamferBox(0.88, 0.42, 0.16, 0.04), { x: 0, y: 0.60, z: 0.54, color: COLORS.white });
  b.addGeometry(chamferBox(0.32, 0.16, 0.06, 0.02), { x: 0, y: 0.60, z: 0.63, color: COLORS.darkBluishGray });
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.20, 1.28, 0.10, 0.03), { x: sx * 0.40, y: 1.30, z: 0.52, color: COLORS.white });
  }
  fig.torso.add(b.build());

  fig.variant = variant;
  fig.name = 'pilot';
  return fig;
}

/** Imperial officer — grey uniform, black cap and gloves. */
export async function makeImperialOfficer(opts = {}) {
  const uniform = opts.uniform ?? COLORS.darkBluishGray;
  const fig = await buildMinifig({
    shirt: uniform,
    arms: uniform,
    legs: uniform,
    hips: uniform,
    hands: COLORS.trueBlack,
    head: SKIN,
    face: 'svg/face-neutral.svg',
    torsoPrint: 'svg/torso-officer.svg',
    scale: opts.scale ?? 1,
    seed: opts.seed ?? 19.6 + (opts.variant ?? 0) * 1.31,
    headStud: false,
  });

  fig.cap = officerCap(COLORS.trueBlack);
  fig.accessory.add(fig.cap);

  const b = new Bricks();
  b.addGeometry(chamferBox(1.56, 0.20, 0.96, 0.04), { x: 0, y: 0.16, z: 0, color: COLORS.trueBlack, opts: { finish: 'glossy' } });
  b.addGeometry(chamferBox(0.24, 0.34, 0.20, 0.04), { x: -0.72, y: 0.06, z: 0.14, color: COLORS.trueBlack, opts: { finish: 'glossy' } });
  fig.torso.add(b.build());

  fig.name = 'officer';
  return fig;
}

/**
 * Jawa — a short cone of robe with two glowing eyes in the dark. The legs are
 * hidden inside the robe; `fig.waddle(t)` is its walk.
 */
export async function makeJawa(opts = {}) {
  const robe = COLORS.darkBrown;
  const fig = await buildMinifig({
    shirt: robe,
    arms: robe,
    legs: robe,
    hips: robe,
    hands: COLORS.brown,
    head: COLORS.trueBlack,
    face: 'svg/face-jawa.svg',
    scale: opts.scale ?? 0.8,
    seed: opts.seed ?? 29.2 + (opts.variant ?? 0) * 0.717,
    headStud: false,
  });

  // The robe reaches the floor, so the legs never show.
  fig.legL.visible = false;
  fig.legR.visible = false;

  fig.hood = jawaHood(robe);
  fig.accessory.add(fig.hood);
  fig.accessory.add(jawaEyes(opts.eyeColor ?? 0xffd21a));

  fig.robe = jawaRobe(robe, { yTop: FIG.torsoH - 0.16, yBottom: -FIG.torsoY, rTop: 0.80, rBottom: 1.44 });
  fig.torso.add(fig.robe);

  fig.armL.rotation.z = -0.16;
  fig.armR.rotation.z = 0.16;

  /** The Jawa waddle: no visible legs, so the whole body rocks. Pure in t. */
  fig.waddle = (t, o = {}) => {
    const speed = o.speed ?? 2.0;
    const amt = o.amount ?? 1;
    const p = t * speed * Math.PI + (fig.seed ?? 0);
    fig.body.position.y = Math.abs(Math.sin(p)) * 0.07 * amt;
    fig.body.rotation.z = Math.sin(p) * 0.14 * amt;
    fig.body.rotation.y = Math.sin(p) * 0.07 * amt;
    fig.torso.rotation.y = -Math.sin(p) * 0.06 * amt;
    fig.armL.rotation.set(-Math.sin(p) * 0.34 * amt, 0, -0.16);
    fig.armR.rotation.set(Math.sin(p) * 0.34 * amt, 0, 0.16);
    fig.head.rotation.set(0, Math.sin(p * 0.47) * 0.14, Math.sin(p) * 0.05);
  };
  fig.waddle(0);

  fig.name = 'jawa';
  return fig;
}

/**
 * C-3PO — a gold minifigure with exposed waist wiring, a stiff default stance
 * and a fidgety idle (`fig.fuss(t)`).
 */
export async function makeProtocolDroid(opts = {}) {
  const gold = opts.gold ?? DROID_GOLD;
  const fig = await buildMinifig({
    shirt: gold,
    arms: gold,
    legs: opts.silverLeg ? COLORS.chromeSilver : gold,
    hips: DROID_GOLD_DARK,
    hands: DROID_GOLD_DARK,
    head: gold,
    face: 'svg/head-threepio.svg',
    scale: opts.scale ?? 1,
    seed: opts.seed ?? 31.5,
    finish: 'glossy',
    headStud: false,
  });

  fig.torso.add(threepioWiring());

  // Photoreceptors and mouth grille, so he reads as 3PO even before the decal
  // exists — and so the head keeps some relief once it does.
  const face = new Bricks();
  for (const sx of [-1, 1]) {
    face.addGeometry(new THREE.TorusGeometry(0.135, 0.05, 6, 14), {
      x: sx * 0.235,
      y: 0.60,
      z: 0.60,
      rot: [Math.PI / 2, 0, 0],
      color: DROID_GOLD_DARK,
      opts: POLISH,
    });
    face.addGeometry(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 12), {
      x: sx * 0.235,
      y: 0.60,
      z: 0.625,
      rot: [Math.PI / 2, 0, 0],
      color: COLORS.trueBlack,
      opts: { finish: 'glossy' },
    });
  }
  face.addGeometry(chamferBox(0.34, 0.11, 0.07, 0.02), { x: 0, y: 0.28, z: 0.62, color: DROID_GOLD_DARK, opts: POLISH });
  // Brow plate.
  face.addGeometry(chamferBox(0.72, 0.09, 0.08, 0.02), { x: 0, y: 0.76, z: 0.60, color: DROID_GOLD_DARK, opts: POLISH });
  fig.head.add(face.build());

  /** Locked-elbow protocol-droid stance. */
  fig.stiff = () => {
    fig.legL.rotation.set(0, 0, 0);
    fig.legR.rotation.set(0, 0, 0);
    fig.armL.rotation.set(-0.16, 0, -0.24);
    fig.armR.rotation.set(-0.16, 0, 0.24);
    fig.torso.rotation.set(0, 0, 0);
    fig.head.rotation.set(0.05, 0, 0);
    fig.body.position.y = 0;
  };

  /** Fidgety idle: small hand gestures and head turns. Pure function of t. */
  fig.fuss = (t, o = {}) => {
    const a = o.amount ?? 1;
    const s = (fig.seed ?? 0) * 0.37;
    const n = (k, f) => (noise1(t * f + s + k, 17) - 0.5) * 2;
    fig.armL.rotation.set(-0.18 + n(0, 0.85) * 0.42 * a, n(3, 0.55) * 0.2 * a, -0.24 - Math.abs(n(1, 0.7)) * 0.24 * a);
    fig.armR.rotation.set(-0.18 + n(7, 1.05) * 0.42 * a, n(9, 0.45) * 0.2 * a, 0.24 + Math.abs(n(5, 0.8)) * 0.24 * a);
    fig.head.rotation.set(0.05 + n(13, 0.65) * 0.1 * a, n(11, 0.42) * 0.42 * a, 0);
    fig.torso.rotation.y = n(17, 0.3) * 0.08 * a;
    fig.body.position.y = Math.sin(t * 1.35 + s) * 0.012 * a;
  };

  fig.stiff();
  fig.name = 'threepio';
  return fig;
}

// ---------------------------------------------------------------------------
// The cast — droids built from scratch
// ---------------------------------------------------------------------------

/**
 * R2-style astromech. Not a minifigure.
 *
 * Returns `{ root, body, dome, legL, legR, legC, projector, roll, setCenterLeg }`.
 * `roll(t, { speed })` is the two-leg waddle: the body rocks side to side and
 * the dome swivels. `projector` is an empty group sitting at the holoprojector
 * lens with +Y along the projection axis, ready for a hologram to be parented in.
 */
export async function makeAstromech(opts = {}) {
  const shell = opts.shell ?? COLORS.white;
  const trim = opts.trim ?? COLORS.blue;
  const dark = COLORS.darkBluishGray;
  const seed = opts.seed ?? 41.3;
  const G = { finish: 'glossy' };

  const root = new THREE.Group();
  const body = new THREE.Group(); // rocks about the floor during the waddle
  root.add(body);

  const R = 0.52; // body radius
  const Y0 = 0.38; // body bottom
  const Y1 = 2.02; // body top / dome base

  // --- chassis
  const b = new Bricks();
  b.addGeometry(new THREE.CylinderGeometry(R, R, Y1 - Y0, 24), { x: 0, y: (Y0 + Y1) / 2, z: 0, color: shell, opts: G });
  // Silver bands top and bottom, all but flush. A ring standing 0.02 proud of
  // the barrel shows the camera its top annulus, and the lower one — cut in
  // half by the centre leg — then reads as two grey crescents sweeping out
  // from behind the leg, which is to say a moustache.
  for (const y of [Y0 + 0.09, Y1 - 0.07]) {
    b.addGeometry(new THREE.CylinderGeometry(R + 0.006, R + 0.006, 0.15, 24), { x: 0, y, z: 0, color: STEEL, opts: POLISH });
  }

  // Panel details around the barrel, laid on the barrel's own curve. A flat
  // box wide enough to read as a panel is a chord across a cylinder this
  // small, so its corners stand 0.07 off the surface and it reads as a brick
  // glued to the front rather than a panel let into it.
  const panel = (angle, y, w, hh, color) => {
    const g = conePatch(R + 0.014, R + 0.014, y - hh / 2, y + hh / 2, w / (2 * R), 7);
    g.rotateY(angle);
    b.addGeometry(g, { color, opts: { ...G, side: THREE.DoubleSide } });
  };
  panel(0, 1.6, 0.46, 0.28, trim);
  panel(0, 1.18, 0.34, 0.44, trim);
  panel(0, 0.74, 0.4, 0.2, STEEL);
  for (const s of [-1, 1]) {
    panel(s * 0.85, 1.56, 0.34, 0.26, trim);
    panel(s * 0.85, 1.04, 0.3, 0.5, COLORS.lightBluishGray);
    panel(s * 1.75, 1.38, 0.36, 0.6, trim);
    panel(s * 2.55, 1.18, 0.34, 0.42, dark);
    // Octagonal utility ports low on the front.
    onCurve(b, s * 0.42, 0.62, R - 0.015, 0, (bb) =>
      bb.addGeometry(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8), { rot: [Math.PI / 2, 0, 0], color: STEEL, opts: POLISH })
    );
  }
  body.add(b.build());

  // --- dome
  const dome = new THREE.Group();
  dome.position.y = Y1;
  body.add(dome);

  const d = new Bricks();
  d.addGeometry(domeGeometry(R, Math.PI * 0.5, 24), { x: 0, y: 0, z: 0, color: shell, opts: G });
  // The base band sits level with the dome's rim; any higher and it cuts off
  // the bottom of the print.
  d.addGeometry(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.08, 24), { x: 0, y: 0, z: 0, color: STEEL, opts: POLISH });
  // Blue wedges radiating up the dome, skipping the front where the face goes.
  for (let i = 0; i < 7; i++) {
    const a = 0.85 + (i / 7) * (Math.PI * 2 - 1.7);
    onCurve(d, a, 0.20, R * 0.93, -0.42, (bb) =>
      bb.addGeometry(chamferBox(0.20, 0.34, 0.06, 0.02), { color: i % 2 ? trim : dark, opts: G })
    );
  }
  d.addGeometry(new THREE.CylinderGeometry(0.19, 0.21, 0.05, 14), { x: 0, y: R - 0.02, z: 0, color: STEEL, opts: POLISH });

  // Holoprojector lens, up and to one side of the eye.
  const pn = new THREE.Vector3(-0.42, 0.72, 0.55).normalize();
  const pTilt = Math.acos(pn.y);
  const pYaw = Math.atan2(pn.x, pn.z);
  d.push();
  d.rotateY(pYaw);
  d.rotateX(pTilt);
  d.translateWorld(0, R - 0.04, 0);
  d.addGeometry(new THREE.CylinderGeometry(0.075, 0.095, 0.12, 12), { color: STEEL, opts: POLISH });
  d.addGeometry(new THREE.CylinderGeometry(0.05, 0.05, 0.17, 12), {
    color: KIT.hologram,
    opts: { emissive: KIT.hologram, emissiveIntensity: 1.4, finish: 'glow' },
  });
  d.pop();
  dome.add(d.build());

  // An empty at the lens, +y pointing out along the beam, for scenes to hang a
  // hologram off.
  const projector = new THREE.Group();
  projector.position.copy(pn.clone().multiplyScalar(R + 0.05));
  projector.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pn);
  dome.add(projector);

  // Dome face: the decal follows the dome exactly, so nothing floats at the
  // corners, and it is laid on by height so the radar eye lands halfway up
  // where it is drawn rather than up by the projectors.
  const face = await decalOn(
    'svg/head-astromech.svg',
    shellPatch(domeProfile(R), { yFrom: -0.02, yTo: 0.47, halfAngle: 0.95, offset: 0.014, rows: 14, segments: 22 })
  );
  if (face) {
    dome.add(face);
  } else {
    // Fallback: the radar eye and two logic displays.
    const f = new Bricks();
    onCurve(f, 0, 0.19, R - 0.03, -0.36, (bb) => {
      bb.addGeometry(new THREE.CylinderGeometry(0.20, 0.20, 0.09, 18), { color: dark, opts: POLISH });
      bb.addGeometry(new THREE.CylinderGeometry(0.145, 0.145, 0.12, 18), { color: COLORS.trueBlack, opts: { finish: 'glossy' } });
      bb.addGeometry(new THREE.CylinderGeometry(0.06, 0.06, 0.145, 12), {
        color: KIT.hologram,
        opts: { emissive: KIT.hologram, emissiveIntensity: 1.8, finish: 'glow' },
      });
    });
    for (const s of [-1, 1]) {
      onCurve(f, s * 0.62, 0.13, R - 0.02, -0.26, (bb) =>
        bb.addGeometry(chamferBox(0.17, 0.13, 0.06, 0.02), { color: COLORS.trueBlack, opts: G })
      );
    }
    dome.add(f.build());
  }

  // --- legs
  const legMesh = () => {
    const g = new Bricks();
    g.addGeometry(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 16), {
      rot: [0, 0, Math.PI / 2],
      color: trim,
      opts: G,
    });
    g.addGeometry(chamferBox(0.26, 0.80, 0.44, 0.05), { x: 0, y: -0.36, z: 0, color: shell, opts: G });
    g.addGeometry(chamferBox(0.30, 0.86, 0.48, 0.05), { x: 0, y: -1.09, z: 0, color: shell, opts: G });
    g.addGeometry(chamferBox(0.32, 0.10, 0.50, 0.03), { x: 0, y: -0.72, z: 0, color: STEEL, opts: POLISH });
    g.addGeometry(chamferBox(0.06, 1.46, 0.16, 0.02), { x: 0.16, y: -0.78, z: 0.14, color: trim, opts: G });
    g.addGeometry(chamferBox(0.38, 0.22, 0.72, 0.05), { x: 0, y: -1.63, z: 0.05, color: shell, opts: G });
    g.addGeometry(chamferBox(0.40, 0.09, 0.74, 0.03), { x: 0, y: -1.72, z: 0.05, color: dark, opts: POLISH });
    return g.build();
  };

  const legL = new THREE.Group();
  const legR = new THREE.Group();
  for (const [grp, sx] of [[legL, 1], [legR, -1]]) {
    grp.position.set(sx * (R + 0.06), 1.74, 0);
    grp.rotation.z = -sx * 0.05; // splayed a little, like a real astromech
    grp.add(legMesh());
    body.add(grp);
  }

  // Retractable centre leg. It hangs off the front of the chassis and tips
  // forward, rather than running up the middle of it: a shaft whose back half
  // is buried in the barrel has no silhouette of its own and reads as a grey
  // stripe painted down R2's front.
  const legC = new THREE.Group();
  legC.position.set(0, 0.98, 0.44);
  legC.rotation.x = -0.2;
  const c = new Bricks();
  // Hinge shoulder, sunk into the barrel so the leg looks hung off it.
  c.addGeometry(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 12), { x: 0, y: 0, z: -0.03, rot: [0, 0, Math.PI / 2], color: dark, opts: POLISH });
  c.addGeometry(chamferBox(0.24, 0.78, 0.26, 0.04), { x: 0, y: -0.42, z: 0.02, color: STEEL, opts: POLISH });
  c.addGeometry(chamferBox(0.28, 0.09, 0.3, 0.03), { x: 0, y: -0.5, z: 0.02, color: dark, opts: POLISH });
  c.addGeometry(chamferBox(0.3, 0.2, 0.58, 0.04), { x: 0, y: -0.92, z: 0.12, color: shell, opts: G });
  c.addGeometry(chamferBox(0.32, 0.08, 0.6, 0.03), { x: 0, y: -1.0, z: 0.12, color: dark, opts: POLISH });
  legC.add(c.build());
  body.add(legC);
  const legCY = legC.position.y;

  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });

  const scale = opts.scale ?? 1;
  if (scale !== 1) root.scale.setScalar(scale);

  const droid = {
    root,
    body,
    dome,
    legL,
    legR,
    legC,
    projector,
    seed,
    height: 2.56 * scale,
    /** Centre leg extension, 1 = planted, 0 = stowed inside the body. */
    setCenterLeg(v) {
      const k = THREE.MathUtils.clamp(v, 0, 1);
      legC.position.y = legCY + (1 - k) * 1.0;
      legC.visible = k > 0.02;
    },
    /**
     * The two-leg waddle. Pure function of t: the chassis rocks about the
     * floor, the legs counter-swing and the dome hunts left and right.
     */
    roll(t, o = {}) {
      const speed = o.speed ?? 1;
      const amt = o.amount ?? 1;
      const p = t * speed * 5.4 + seed;
      body.rotation.z = Math.sin(p) * 0.11 * amt;
      body.rotation.x = Math.sin(p * 2) * 0.022 * amt;
      body.position.y = Math.abs(Math.sin(p)) * 0.035 * amt;
      legL.rotation.z = -0.05 - Math.sin(p) * 0.05 * amt;
      legR.rotation.z = 0.05 - Math.sin(p) * 0.05 * amt;
      dome.rotation.y = Math.sin(t * 0.85 * speed + seed) * 0.34 + (noise1(t * 0.4 + seed, 61) - 0.5) * 1.1;
    },
  };
  droid.roll(0);
  if (opts.centerLeg === false) droid.setCenterLeg(0);
  return droid;
}

/**
 * Mouse droid — a hand-sized grey wedge that scoots along Imperial corridors.
 * `roll(t)` spins the wheels and adds the little side-to-side hunt; the scene
 * owns where it actually goes.
 */
export async function makeMouseDroid(opts = {}) {
  const shell = opts.shell ?? COLORS.darkBluishGray;
  const trim = COLORS.lightBluishGray;
  const seed = opts.seed ?? 53.9;

  const root = new THREE.Group();
  const chassis = new THREE.Group();
  root.add(chassis);

  const b = new Bricks();
  const G = { finish: 'glossy' };
  // A stepped wedge, 0.78 long: tall at the back, tapering to a low nose.
  b.addGeometry(chamferBox(0.46, 0.22, 0.46, 0.045), { x: 0, y: 0.17, z: -0.15, color: shell, opts: G });
  b.addGeometry(chamferBox(0.44, 0.17, 0.20, 0.04), { x: 0, y: 0.145, z: 0.16, color: shell, opts: G });
  b.addGeometry(chamferBox(0.39, 0.12, 0.16, 0.03), { x: 0, y: 0.115, z: 0.32, color: shell, opts: G });
  // Top plate and sensor bar.
  b.addGeometry(chamferBox(0.40, 0.05, 0.40, 0.02), { x: 0, y: 0.30, z: -0.15, color: trim, opts: G });
  b.addGeometry(chamferBox(0.20, 0.07, 0.09, 0.02), { x: 0, y: 0.33, z: 0.02, color: COLORS.trueBlack, opts: G });
  for (const sx of [-1, 1]) {
    b.addGeometry(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 8), {
      x: sx * 0.10,
      y: 0.14,
      z: 0.40,
      rot: [Math.PI / 2, 0, 0],
      color: KIT.laserRed,
      opts: { emissive: KIT.laserRed, emissiveIntensity: 2.4, finish: 'glow' },
    });
  }
  // Rear antenna.
  b.addGeometry(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 6), { x: 0.15, y: 0.44, z: -0.28, color: COLORS.trueBlack });
  chassis.add(b.build());

  // Wheels on a shared axle group so `roll` can spin them together.
  const wheels = new THREE.Group();
  wheels.position.set(0, 0.095, -0.06);
  const w = new Bricks();
  for (const sx of [-1, 1]) {
    w.addGeometry(new THREE.CylinderGeometry(0.09, 0.09, 0.055, 14), {
      x: sx * 0.215,
      rot: [0, 0, Math.PI / 2],
      color: COLORS.trueBlack,
      opts: { finish: 'rubber' },
    });
    w.addGeometry(new THREE.CylinderGeometry(0.04, 0.04, 0.065, 10), {
      x: sx * 0.215,
      rot: [0, 0, Math.PI / 2],
      color: trim,
      opts: POLISH,
    });
  }
  wheels.add(w.build());
  chassis.add(wheels);

  root.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });

  const scale = opts.scale ?? 1;
  if (scale !== 1) root.scale.setScalar(scale);

  const droid = {
    root,
    chassis,
    wheels,
    seed,
    length: 0.78 * scale,
    /** Wheel spin plus the nervous little hunt. Pure function of t. */
    roll(t, o = {}) {
      const speed = o.speed ?? 1;
      wheels.rotation.x = t * speed * 7.5;
      chassis.position.y = Math.abs(Math.sin(t * speed * 11 + seed)) * 0.012;
      chassis.rotation.z = Math.sin(t * speed * 9.3 + seed) * 0.05;
      chassis.rotation.y = Math.sin(t * speed * 2.1 + seed) * 0.08;
    },
  };
  droid.roll(0);
  return droid;
}

// ---------------------------------------------------------------------------
// Preview turntables
// ---------------------------------------------------------------------------

/** Wrap a minifig so the turntable animates it. */
function previewFig(fig, poser) {
  fig.root.userData.previewUpdate = poser ?? ((t) => poseWalk(fig, t, { speed: 1.6 }));
  return fig.root;
}

/** Everyone, shoulder to shoulder, for a scale and style check. */
async function lineup() {
  const g = new THREE.Group();
  const cast = [
    await makeLeia(),
    await makeLuke({ withSaber: true }),
    await makeBen(),
    await makeRebelTrooper(),
    await makePilot(),
    await makeProtocolDroid(),
    await makeAstromech(),
    await makeJawa(),
    await makeMouseDroid(),
    await makeImperialOfficer(),
    await makeStormtrooper({ variant: 1 }),
    await makeVader(),
  ];
  const step = 2.9;
  const x0 = (-(cast.length - 1) * step) / 2;
  cast.forEach((c, i) => {
    c.root.position.x = x0 + i * step;
    g.add(c.root);
  });
  g.userData.previewUpdate = (t) => {
    for (const c of cast) {
      if (c.roll) c.roll(t);
      else if (c.waddle) c.waddle(t, { amount: 0.4 });
      else if (c.fuss) c.fuss(t, { amount: 0.6 });
      else poseStand(c, t);
    }
  };
  return g;
}

/** A squad, to check that `variant` really does break up the lockstep. */
async function squad() {
  const g = new THREE.Group();
  const troopers = [];
  for (let i = 0; i < 8; i++) {
    const s = await makeStormtrooper({ variant: i });
    s.root.position.set((i % 4) * 2.2 - 3.3, 0, Math.floor(i / 4) * 2.4 - 1.2);
    troopers.push(s);
    g.add(s.root);
  }
  g.userData.previewUpdate = (t) => troopers.forEach((s) => poseWalk(s, t, { speed: 2.0 }));
  return g;
}

export const PREVIEW = {
  leia: () => makeLeia().then((f) => previewFig(f)),
  vader: () =>
    makeVader().then((f) =>
      previewFig(f, (t) => {
        poseStand(f, t);
        f.setSaber(Math.min(1, Math.max(0, (t % 6) - 1)));
        f.capeWave(t, 0.6);
      })
    ),
  stormtrooper: () => makeStormtrooper({ variant: 2 }).then((f) => previewFig(f)),
  'rebel-trooper': () => makeRebelTrooper().then((f) => previewFig(f)),
  luke: () => makeLuke({ withSaber: true, saberOn: true }).then((f) => previewFig(f)),
  ben: () => makeBen({ saberOn: true }).then((f) => previewFig(f, (t) => poseStand(f, t))),
  'ben-ghost': () => makeBen({ ghost: true }).then((f) => previewFig(f, (t) => poseStand(f, t))),
  pilot: () => makePilot().then((f) => previewFig(f)),
  officer: () => makeImperialOfficer().then((f) => previewFig(f, (t) => poseStand(f, t))),
  jawa: () => makeJawa().then((f) => previewFig(f, (t) => f.waddle(t))),
  astromech: () =>
    makeAstromech().then((d) => {
      d.root.userData.previewUpdate = (t) => d.roll(t);
      return d.root;
    }),
  threepio: () => makeProtocolDroid().then((f) => previewFig(f, (t) => f.fuss(t))),
  'mouse-droid': () =>
    makeMouseDroid().then((d) => {
      d.root.userData.previewUpdate = (t) => d.roll(t);
      return d.root;
    }),
  lineup,
  squad,
  // TEMP-DEBUG
  'dbg-vader-head': () => makeVader().then(headOnly),
  'dbg-trooper-head': () => makeStormtrooper().then(headOnly),
  'dbg-leia-head': () => makeLeia().then(headOnly),
  'dbg-luke-head': () => makeLuke().then(headOnly),
  'dbg-ben-head': () => makeBen().then(headOnly),
  'dbg-pilot-head': () => makePilot().then(headOnly),
  'dbg-rebel-head': () => makeRebelTrooper().then(headOnly),
  'dbg-officer-head': () => makeImperialOfficer().then(headOnly),
  'dbg-jawa-head': () => makeJawa().then(headOnly),
  'dbg-3po-head': () => makeProtocolDroid().then(headOnly),
};

// TEMP-DEBUG
function headOnly(fig) {
  const g = new THREE.Group();
  g.add(fig.head);
  return g;
}
