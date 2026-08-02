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

/** LEGO "bright light yellow" — Luke's sandy blond hair. */
const SANDY_BLOND = 0xdcb679;

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
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.008), y));
  if (close && pts[0].distanceTo(pts[pts.length - 1]) > 1e-6) pts.push(pts[0].clone());
  const g = new THREE.LatheGeometry(pts, segments, openHalf, Math.PI * 2 - openHalf * 2);
  g.computeVertexNormals();
  return g;
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

/** The same idea on a sphere, for the astromech's dome. `theta` is from the pole. */
function spherePatch(r, yCentre, thetaFrom, thetaTo, halfAngle, segments = 18) {
  const g = new THREE.SphereGeometry(
    r,
    segments,
    Math.max(4, Math.round(segments * 0.55)),
    Math.PI / 2 - halfAngle,
    halfAngle * 2,
    thetaFrom,
    thetaTo - thetaFrom
  );
  g.translate(0, yCentre, 0);
  return g;
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
      roughness: 0.34,
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
 * Hang a cape from the shoulder line. `cape()` places its own top edge just
 * below its parent's origin, so it needs a mount at shoulder height rather
 * than being dropped straight onto the torso.
 */
function attachCape(fig, color, opts = {}) {
  const mount = new THREE.Group();
  mount.position.set(0, FIG.torsoH - 0.06, opts.z ?? 0);
  fig.torso.add(mount);
  const mesh = cape(color, { width: opts.width ?? 2.1, height: safeCapeHeight(opts.height ?? 2.6) });
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
 * Leia's hair: a brown cap high enough to clear the face print, coming down
 * over the ears and nape, plus the two coiled buns. Head-local coordinates
 * (head bottom = 0, top = 1.04, r = 0.645).
 */
function leiaBuns(color = COLORS.brown) {
  const b = new Bricks();

  // Crown, sitting on top of the head.
  b.addGeometry(domeGeometry(0.695, Math.PI * 0.5, 20), { x: 0, y: FACE_TOP, z: 0, color });
  // Sides and nape, coming down past the ears but leaving the face clear.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.695, FACE_TOP + 0.02],
          [0.70, 0.42],
          [0.66, 0.24],
        ],
        0.09
      ),
      { segments: 22, openHalf: 1.02 }
    ),
    { color, opts: { side: THREE.DoubleSide } }
  );
  // Centre-parted fringe across the brow.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.70, 1.00],
          [0.715, FACE_TOP],
        ],
        0.085
      ),
      { segments: 20, openHalf: Math.PI - 1.15 }
    ),
    { rot: [0, Math.PI, 0], color, opts: { side: THREE.DoubleSide } }
  );
  b.addGeometry(chamferBox(0.20, 0.24, 0.16, 0.05), { x: 0, y: 0.94, z: 0.66, color });

  // The buns, at ear height and out to the sides where they cannot mask the
  // face: a ball flattened against the head, wrapped in a coil.
  for (const sx of [-1, 1]) {
    b.push();
    b.translateWorld(sx * 0.80, 0.44, -0.02);
    b.scale(0.76, 1, 1);
    b.addGeometry(new THREE.SphereGeometry(0.40, 16, 12), { color });
    b.pop();
    // Coils, so it reads as a braid rather than a stuck-on ball.
    b.addGeometry(new THREE.TorusGeometry(0.27, 0.095, 7, 18), {
      x: sx * 0.855,
      y: 0.44,
      z: -0.02,
      rot: [0, Math.PI / 2, 0],
      color,
    });
    b.addGeometry(new THREE.TorusGeometry(0.145, 0.08, 6, 14), {
      x: sx * 0.89,
      y: 0.44,
      z: -0.02,
      rot: [0, Math.PI / 2, 0],
      color,
    });
    // Short root joining the bun to the crown.
    b.addGeometry(new THREE.CylinderGeometry(0.26, 0.33, 0.32, 12), {
      x: sx * 0.58,
      y: 0.46,
      z: -0.02,
      rot: [0, 0, Math.PI / 2],
      color,
    });
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
  b.addGeometry(taperBox(1.94, 1.50, 1.44, 1.32, 0.92, 0.11), { x: 0, y: -0.30, z: 0.02, color });
  // Hem: a slightly proud lip so the skirt has an edge instead of a fade-out.
  b.addGeometry(taperBox(2.00, 1.94, 0.14, 1.36, 1.32, 0.05), { x: 0, y: -0.99, z: 0.02, color });
  // Two soft folds, to break up the flat panel.
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.16, 1.10, 0.14, 0.05), { x: sx * 0.30, y: -0.38, z: 0.58, color });
  }
  return b.build();
}

/**
 * Vader's helmet: an ogival dome, an angular face mask that stands clearly
 * proud of it, and the flared skirt that comes down over the shoulders at the
 * back and sides. Head-local.
 */
function vaderHelmet({ shell = COLORS.black, lens = COLORS.trueBlack, trim = COLORS.darkBluishGray } = {}) {
  const b = new Bricks();
  const g = { finish: 'glossy' };
  const dbl = { finish: 'glossy', side: THREE.DoubleSide };

  // --- crown: a single lathed ogive, wide at the brow and tapering upward
  b.addGeometry(
    latheShell(
      [
        [0.012, 1.44],
        [0.30, 1.40],
        [0.52, 1.28],
        [0.66, 1.08],
        [0.745, 0.82],
        [0.792, 0.55],
        [0.812, 0.36],
        [0.808, 0.26],
        [0.012, 0.26],
      ],
      { segments: 26, close: false }
    ),
    { color: shell, opts: g }
  );
  // Flared rim at the base of the dome, back and sides only.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.815, 0.34],
          [0.905, 0.19],
          [0.885, 0.11],
        ],
        0.11
      ),
      { segments: 24, openHalf: 0.98 }
    ),
    { color: shell, opts: dbl }
  );

  // --- neck skirt, flaring out over the shoulders
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.86, 0.18],
          [0.98, -0.04],
          [1.14, -0.26],
          [1.30, -0.48],
        ],
        0.15
      ),
      { segments: 26, openHalf: 1.02 }
    ),
    { color: shell, opts: dbl }
  );

  // --- face mask: vertical front face so a flat decal sits flush on it
  b.addGeometry(taperBox(0.58, 1.00, 0.94, 0.68, 0.68, 0.07), { x: 0, y: 0.56, z: 0.46, color: shell, opts: g });
  // Brow, jutting forward over the eyes and tying the mask into the dome.
  b.addGeometry(chamferBox(1.12, 0.20, 0.44, 0.06), {
    x: 0,
    y: 0.99,
    z: 0.50,
    rot: [-0.30, 0, 0],
    color: shell,
    opts: g,
  });
  // Cheek panels, angling back to meet the skirt and widening the mask.
  for (const sx of [-1, 1]) {
    b.addGeometry(taperBox(0.22, 0.30, 0.84, 0.62, 0.66, 0.06), {
      x: sx * 0.51,
      y: 0.58,
      z: 0.34,
      rot: [0, sx * 0.34, 0],
      color: shell,
      opts: g,
    });
  }
  // A single contour line following the taper of each cheek. Anything bolder
  // turns into a bright cage across the face under a hard key light.
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.04, 0.78, 0.045, 0.014), {
      x: sx * 0.455,
      y: 0.58,
      z: 0.805,
      rot: [0, 0, sx * 0.145],
      color: trim,
      opts: g,
    });
  }
  // Central nose ridge between the lenses.
  b.addGeometry(taperBox(0.22, 0.17, 0.50, 0.17, 0.14, 0.035), { x: 0, y: 0.58, z: 0.855, color: shell, opts: g });
  // Mouth grille, proud of the mask, with slats.
  b.addGeometry(chamferBox(0.60, 0.24, 0.16, 0.04), { x: 0, y: 0.24, z: 0.82, color: trim, opts: g });
  for (let i = -2; i <= 2; i++) {
    b.addGeometry(chamferBox(0.06, 0.22, 0.08, 0.015), { x: i * 0.118, y: 0.24, z: 0.885, color: lens, opts: g });
  }
  // Chin, tucking the mask back under the grille.
  b.addGeometry(taperBox(0.42, 0.60, 0.20, 0.46, 0.66, 0.05), { x: 0, y: 0.07, z: 0.52, color: shell, opts: g });
  // The two "tusk" vents at the outer bottom corners of the mask.
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.12, 0.20, 0.14, 0.03), { x: sx * 0.35, y: 0.16, z: 0.74, color: trim, opts: g });
  }
  return b.build();
}

/**
 * Vader's lenses, only used when helmet-vader.svg is unavailable. They are a
 * smoked grey rather than black: on a black helmet under this film's lighting,
 * a black lens on black plastic simply disappears.
 */
function vaderMaskFallback(lens = 0x36434d) {
  const b = new Bricks();
  const o = { finish: 'glossy' };
  for (const sx of [-1, 1]) {
    // A trapezoid narrowing toward the nose, tilted like the real lens.
    b.addGeometry(taperBox(0.30, 0.38, 0.30, 0.07, 0.07, 0.025), {
      x: sx * 0.265,
      y: 0.72,
      z: 0.808,
      rot: [0, 0, sx * 0.34],
      color: lens,
      opts: o,
    });
  }
  return b.build();
}

/** The chest control box and belt that give Vader's silhouette its bulk. */
function vaderChestGear() {
  const b = new Bricks();
  const dark = COLORS.trueBlack;
  // Matte, so a hard key light does not blow the flat panels out to grey.
  const box = { finish: 'plastic' };
  b.addGeometry(chamferBox(0.70, 0.40, 0.12, 0.035), { x: 0, y: 1.30, z: 0.54, color: dark, opts: box });
  const lights = [
    [-0.22, 1.38, COLORS.red],
    [-0.075, 1.38, COLORS.brightGreen],
    [0.075, 1.38, COLORS.blue],
    [0.22, 1.38, COLORS.white],
    [-0.15, 1.23, COLORS.red],
    [0.15, 1.23, COLORS.brightYellow],
  ];
  for (const [x, y, c] of lights) {
    b.addGeometry(new THREE.CylinderGeometry(0.042, 0.042, 0.04, 8), {
      x,
      y,
      z: 0.60,
      rot: [Math.PI / 2, 0, 0],
      color: c,
      opts: { emissive: c, emissiveIntensity: 1.2, finish: 'glossy' },
    });
  }
  // Belt with a buckle and two small side boxes.
  b.addGeometry(chamferBox(1.62, 0.22, 1.00, 0.04), { x: 0, y: 0.15, z: 0, color: dark, opts: box });
  b.addGeometry(chamferBox(0.30, 0.18, 0.09, 0.03), { x: 0, y: 0.15, z: 0.53, color: STEEL, opts: box });
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.20, 0.18, 0.18, 0.03), { x: sx * 0.48, y: 0.15, z: 0.44, color: STEEL, opts: box });
  }
  return b.build();
}

/**
 * Stormtrooper helmet: a squared-off jaw under a tapered face barrel and a
 * squashed crown, so the whole face region lies on a cone the decal can hug.
 */
function trooperHelmet({ armour = COLORS.white, dark = COLORS.trueBlack } = {}) {
  const b = new Bricks();
  const o = { finish: 'glossy' };

  // Jaw: wide and squared off rather than a point.
  b.addGeometry(new THREE.CylinderGeometry(0.815, 0.70, 0.36, 22), { x: 0, y: 0.12, z: 0, color: armour, opts: o });
  b.addGeometry(chamferBox(1.16, 0.34, 1.18, 0.22), { x: 0, y: 0.14, z: 0.02, color: armour, opts: o });
  // Face barrel: the decal surface, r 0.815 -> 0.755 over y 0.30..0.98.
  b.addGeometry(new THREE.CylinderGeometry(0.755, 0.815, 0.68, 22), { x: 0, y: 0.64, z: 0, color: armour, opts: o });
  // Crown, squashed so the helmet is not a bullet.
  b.push();
  b.translateWorld(0, 0.98, 0);
  b.scale(1, 0.50, 1);
  b.addGeometry(domeGeometry(0.755, Math.PI * 0.5, 20), { color: armour, opts: o });
  b.pop();
  // Back-of-skull bulge, so the profile is not a plain cylinder.
  b.push();
  b.translateWorld(0, 0.74, -0.26);
  b.scale(0.92, 0.74, 0.92);
  b.addGeometry(new THREE.SphereGeometry(0.74, 16, 12), { color: armour, opts: o });
  b.pop();
  // Central vent ridge over the crown.
  b.addGeometry(chamferBox(0.16, 0.13, 1.12, 0.04), { x: 0, y: 1.30, z: -0.08, color: armour, opts: o });
  b.addGeometry(chamferBox(0.12, 0.10, 0.30, 0.03), { x: 0, y: 1.34, z: 0.34, color: dark, opts: o });
  // Brow ledge across the front.
  b.addGeometry(taperBox(1.18, 1.00, 0.11, 0.34, 0.28, 0.035), {
    x: 0,
    y: 0.98,
    z: 0.58,
    rot: [-0.26, 0, 0],
    color: armour,
    opts: o,
  });
  // Vocoder "ears".
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.15, 0.42, 0.36, 0.05), { x: sx * 0.77, y: 0.54, z: 0.04, color: dark, opts: o });
    b.addGeometry(new THREE.CylinderGeometry(0.11, 0.11, 0.10, 12), {
      x: sx * 0.845,
      y: 0.54,
      z: 0.04,
      rot: [0, 0, Math.PI / 2],
      color: COLORS.darkBluishGray,
      opts: o,
    });
  }
  // Neck seal below the jaw.
  b.addGeometry(new THREE.CylinderGeometry(0.60, 0.57, 0.22, 18), { x: 0, y: -0.16, z: 0, color: dark, opts: o });
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
function rebelHelmet({ shell = COLORS.darkTan, trim = COLORS.sandBlue } = {}) {
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
          [0.73, 0.18],
        ],
        0.12
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
          [0.80, 0.86],
          [0.81, 0.42],
          [0.76, 0.04],
          [0.70, -0.08],
        ],
        0.13
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
  // Orange crest over the crown.
  b.addGeometry(chamferBox(0.20, 0.09, 1.10, 0.03), { x: 0, y: 1.30, z: -0.10, color: band, opts: o });
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
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [rLow, yLow],
          [rBrow, yBrow],
        ],
        thickness
      ),
      { segments: 24, openHalf }
    ),
    { color, opts: dbl }
  );
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [rBrow, yBrow],
          [rBrow * 0.82, yBrow + (yTip - yBrow) * 0.5],
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
  const b = hoodPiece({
    color,
    rLow: 1.06,
    rBrow: 0.94,
    rTip: 0.30,
    yLow: -0.36,
    yBrow: 0.74,
    yTip: 1.20,
    openHalf: 1.18,
    thickness: 0.17,
    opts: { finish: 'rubber' },
  });
  // Rolled edge round the face opening, following the cone rather than
  // sticking out from it.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const y = -0.20 + i * 0.30;
      const r = 1.06 + ((y + 0.36) / 1.10) * (0.94 - 1.06);
      b.addGeometry(new THREE.SphereGeometry(0.105, 8, 6), {
        x: sx * r * Math.sin(1.18),
        y,
        z: r * Math.cos(1.18),
        color,
        opts: { finish: 'rubber' },
      });
    }
  }
  return b.build();
}

/** Ben's robe: a mantle over the shoulders plus the belt. Torso-local. */
function benMantle(color = COLORS.reddishBrown, under = COLORS.darkTan) {
  const b = new Bricks();
  const o = { finish: 'rubber' };
  const dbl = { finish: 'rubber', side: THREE.DoubleSide };
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.68, 1.92],
          [0.98, 1.42],
          [1.10, 1.02],
        ],
        0.16
      ),
      { segments: 22 }
    ),
    { color, opts: dbl }
  );
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

/** Luke's hair: a swept blond cap with a fringe, rather than a helmet. */
function lukeHair(color = SANDY_BLOND) {
  const b = new Bricks();
  // Crown.
  b.addGeometry(domeGeometry(0.695, Math.PI * 0.54, 18), { x: 0, y: 0.66, z: 0, color });
  // Nape.
  b.addGeometry(chamferBox(1.26, 0.60, 0.58, 0.16), { x: 0, y: 0.52, z: -0.34, color });
  // Fringe: a band hugging the brow, thicker in the middle.
  b.addGeometry(
    latheShell(
      shellProfile(
        [
          [0.69, 0.92],
          [0.705, 0.74],
        ],
        0.085
      ),
      { segments: 20, openHalf: Math.PI - 1.30 }
    ),
    { x: 0, y: 0, z: 0, rot: [0, Math.PI, 0], color, opts: { side: THREE.DoubleSide } }
  );
  // Two locks sweeping over the brow.
  for (const sx of [-1, 1]) {
    b.addGeometry(chamferBox(0.34, 0.20, 0.16, 0.05), {
      x: sx * 0.20,
      y: 0.80,
      z: 0.63,
      rot: [0, 0, sx * 0.32],
      color,
    });
    // Sideburns.
    b.addGeometry(chamferBox(0.14, 0.30, 0.24, 0.05), { x: sx * 0.62, y: 0.54, z: 0.16, color });
  }
  return b.build();
}

/** C-3PO's exposed waist wiring. Torso-local, sitting in the hip gap. */
function threepioWiring() {
  const b = new Bricks();
  const wires = [COLORS.trueBlack, COLORS.red, COLORS.darkBluishGray, COLORS.blue, COLORS.trueBlack];
  for (let i = 0; i < wires.length; i++) {
    const x = (i - (wires.length - 1) / 2) * 0.26;
    b.addGeometry(new THREE.CylinderGeometry(0.075, 0.075, 0.44, 8), {
      x,
      y: 0.02,
      z: 0.32 - Math.abs(i - 2) * 0.07,
      color: wires[i],
      opts: { finish: 'rubber' },
    });
  }
  // A loom running round the back.
  b.addGeometry(new THREE.TorusGeometry(0.50, 0.06, 6, 16, Math.PI), {
    x: 0,
    y: 0.04,
    z: 0,
    rot: [Math.PI / 2, 0, 0],
    color: COLORS.trueBlack,
    opts: { finish: 'rubber' },
  });
  // Waist collar capping the wiring.
  b.addGeometry(chamferBox(1.36, 0.16, 0.88, 0.05), { x: 0, y: 0.26, z: 0, color: COLORS.pearlGold, opts: POLISH });
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

  fig.hair = leiaBuns(COLORS.brown);
  fig.accessory.add(fig.hair);

  fig.skirt = leiaSkirt(COLORS.white);
  fig.pelvis.add(fig.skirt);
  /** A robe restricts the stride; scenes should walk her with this amplitude. */
  fig.walkAmp = 0.34;

  const belt = new Bricks()
    .addGeometry(chamferBox(1.58, 0.16, 0.98, 0.04), { x: 0, y: 0.14, z: 0, color: SILVER, opts: POLISH })
    .build();
  fig.torso.add(belt);

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
  const shell = opts.shell ?? COLORS.black;
  const fig = await buildMinifig({
    shirt: shell,
    arms: shell,
    legs: shell,
    hips: COLORS.trueBlack,
    hands: COLORS.trueBlack,
    head: shell,
    torsoPrint: 'svg/torso-vader.svg',
    scale: opts.scale ?? 1.14,
    seed: opts.seed ?? 23.7,
    finish: 'glossy',
    headStud: false,
  });

  stripHeadTexture(fig, shell);

  const helmet = vaderHelmet({ shell });
  fig.accessory.add(helmet);
  fig.helmet = helmet;

  const mask = await decalOn('svg/helmet-vader.svg', flatDecal(1.00, 0.94));
  if (mask) {
    mask.position.set(0, 0.58, 0.803);
    fig.accessory.add(mask);
  } else {
    fig.accessory.add(vaderMaskFallback());
  }

  fig.torso.add(vaderChestGear());
  attachCape(fig, COLORS.trueBlack, { width: 2.375, height: 3.5 });

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

  const face = await decalOn('svg/helmet-stormtrooper.svg', conePatch(0.822, 0.762, 0.28, 1.00, 0.95, 20));
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

  giveBlaster(fig, COLORS.trueBlack, { len: 0.9 });

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
  const gold = opts.gold ?? COLORS.chromeGold;
  const fig = await buildMinifig({
    shirt: gold,
    arms: gold,
    legs: opts.silverLeg ? COLORS.chromeSilver : gold,
    hips: COLORS.pearlGold,
    hands: COLORS.pearlGold,
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
      color: COLORS.pearlGold,
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
  face.addGeometry(chamferBox(0.34, 0.11, 0.07, 0.02), { x: 0, y: 0.28, z: 0.62, color: COLORS.pearlGold, opts: POLISH });
  // Brow plate.
  face.addGeometry(chamferBox(0.72, 0.09, 0.08, 0.02), { x: 0, y: 0.76, z: 0.60, color: COLORS.pearlGold, opts: POLISH });
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
  // Silver bands top and bottom.
  for (const y of [Y0 + 0.08, Y1 - 0.07]) {
    b.addGeometry(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.12, 24), { x: 0, y, z: 0, color: STEEL, opts: POLISH });
  }
  b.addGeometry(new THREE.CylinderGeometry(R * 0.94, R * 0.86, 0.14, 20), { x: 0, y: Y0 - 0.04, z: 0, color: dark, opts: POLISH });

  // Blue panel details around the barrel.
  const panel = (angle, y, w, hh, color, depth = 0.06) =>
    onCurve(b, angle, y, R - 0.015, 0, (bb) => bb.addGeometry(chamferBox(w, hh, depth, 0.02), { color, opts: G }));
  panel(0, 1.60, 0.46, 0.28, trim);
  panel(0, 1.18, 0.34, 0.44, trim);
  panel(0, 0.72, 0.44, 0.22, dark);
  for (const s of [-1, 1]) {
    panel(s * 0.85, 1.56, 0.34, 0.26, trim);
    panel(s * 0.85, 1.04, 0.30, 0.50, shell);
    panel(s * 1.75, 1.38, 0.36, 0.60, trim);
    panel(s * 2.55, 1.18, 0.34, 0.42, dark);
    // Octagonal utility ports low on the front.
    onCurve(b, s * 0.42, 0.62, R - 0.015, 0, (bb) =>
      bb.addGeometry(new THREE.CylinderGeometry(0.10, 0.10, 0.10, 8), { rot: [Math.PI / 2, 0, 0], color: STEEL, opts: POLISH })
    );
  }
  body.add(b.build());

  // --- dome
  const dome = new THREE.Group();
  dome.position.y = Y1;
  body.add(dome);

  const d = new Bricks();
  d.addGeometry(domeGeometry(R, Math.PI * 0.5, 24), { x: 0, y: 0, z: 0, color: shell, opts: G });
  d.addGeometry(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.08, 24), { x: 0, y: 0.04, z: 0, color: STEEL, opts: POLISH });
  // Blue wedges radiating up the dome, skipping the front where the face goes.
  for (let i = 0; i < 7; i++) {
    const a = 0.85 + (i / 7) * (Math.PI * 2 - 1.7);
    onCurve(d, a, 0.20, R * 0.93, -0.42, (bb) =>
      bb.addGeometry(chamferBox(0.20, 0.34, 0.06, 0.02), { color: i % 2 ? trim : dark, opts: G })
    );
  }
  d.addGeometry(new THREE.CylinderGeometry(0.19, 0.21, 0.05, 14), { x: 0, y: R - 0.02, z: 0, color: STEEL, opts: POLISH });

  // Holoprojector lens, up and to one side of the eye.
  const pn = new THREE.Vector3(-0.34, 0.50, 0.30).normalize();
  const pPos = pn.clone().multiplyScalar(R - 0.03);
  d.push();
  d.translateWorld(pPos.x, pPos.y, pPos.z);
  d.addGeometry(new THREE.CylinderGeometry(0.085, 0.10, 0.10, 12), { color: STEEL, opts: POLISH });
  d.addGeometry(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 12), {
    color: KIT.hologram,
    opts: { emissive: KIT.hologram, emissiveIntensity: 1.4, finish: 'glow' },
  });
  d.pop();
  dome.add(d.build());

  const projector = new THREE.Group();
  projector.position.copy(pn.clone().multiplyScalar(R + 0.03));
  projector.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pn);
  dome.add(projector);

  // Dome face: the decal wraps the sphere, so nothing floats at the corners.
  const face = await decalOn('svg/head-astromech.svg', spherePatch(R + 0.012, 0, 0.50, 1.45, 0.95, 22));
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

  // Retractable centre leg, angled back.
  const legC = new THREE.Group();
  legC.position.set(0, 1.19, -0.44);
  legC.rotation.x = 0.20;
  const c = new Bricks();
  c.addGeometry(chamferBox(0.26, 1.02, 0.32, 0.04), { x: 0, y: -0.52, z: 0, color: shell, opts: G });
  c.addGeometry(chamferBox(0.30, 0.10, 0.36, 0.03), { x: 0, y: -0.72, z: 0, color: STEEL, opts: POLISH });
  c.addGeometry(chamferBox(0.32, 0.20, 0.60, 0.04), { x: 0, y: -1.11, z: 0.06, color: shell, opts: G });
  c.addGeometry(chamferBox(0.34, 0.08, 0.62, 0.03), { x: 0, y: -1.19, z: 0.06, color: dark, opts: POLISH });
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
