/**
 * SVG asset pipeline.
 *
 * Vector art in `public/svg/` is the source of truth for every logo, crest,
 * insignia, face and decal in the film. It gets used two ways:
 *   extrudeSVG()  -> real extruded 3-D geometry (title logo, crests)
 *   svgTexture()  -> rasterised CanvasTexture (minifig faces, hull printing)
 */
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const textCache = new Map();
const parseCache = new Map();
const texCache = new Map();

export async function loadSVGText(url) {
  if (textCache.has(url)) return textCache.get(url);
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`SVG not found: ${url}`);
    return r.text();
  });
  textCache.set(url, p);
  return p;
}

/** Parsed SVGLoader data (paths + xml). */
export async function parseSVG(url) {
  if (parseCache.has(url)) return parseCache.get(url);
  const p = loadSVGText(url).then((txt) => new SVGLoader().parse(txt));
  parseCache.set(url, p);
  return p;
}

/**
 * Extrude an SVG into 3-D geometry.
 *
 * SVG's y axis points down, so the result is flipped to stand upright in
 * world space; the mesh is centred on its bounding box and scaled so its
 * largest dimension equals `size`.
 *
 * @returns {THREE.Group} group whose children are one mesh per fill colour
 */
export async function extrudeSVG(url, opts = {}) {
  const data = await parseSVG(url);
  const {
    depth = 0.4,
    size = 10,
    bevel = true,
    bevelSize = 0.03,
    bevelThickness = 0.05,
    color = null, // override every path colour
    material = null,
    curveSegments = 6,
    center = true,
  } = opts;

  const buckets = new Map();
  for (const path of data.paths) {
    const fill = path.userData?.style?.fill;
    if (fill === 'none' || fill === undefined) continue;
    const hex = color !== null ? color : new THREE.Color().setStyle(fill).getHex();
    const shapes = SVGLoader.createShapes(path);
    if (!shapes.length) continue;
    const geos = [];
    for (const shape of shapes) {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: bevel,
        bevelSize,
        bevelThickness,
        bevelSegments: 2,
        curveSegments,
      });
      geos.push(g.index ? g.toNonIndexed() : g);
    }
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    if (!buckets.has(hex)) buckets.set(hex, []);
    buckets.get(hex).push(merged);
  }

  const group = new THREE.Group();
  const all = [];
  for (const [hex, geos] of buckets) {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) continue;
    all.push(merged);
    const mat =
      material ||
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: opts.roughness ?? 0.35,
        metalness: opts.metalness ?? 0.35,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 1,
      });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    group.add(mesh);
  }

  // SVG space -> world space: flip Y, centre, normalise scale.
  const box = new THREE.Box3();
  for (const g of all) {
    g.computeBoundingBox();
    box.union(g.boundingBox);
  }
  const sizeVec = new THREE.Vector3();
  box.getSize(sizeVec);
  const centerVec = new THREE.Vector3();
  box.getCenter(centerVec);
  const scale = size / Math.max(sizeVec.x, sizeVec.y, 1e-6);

  const inner = new THREE.Group();
  while (group.children.length) inner.add(group.children[0]);
  if (center) inner.position.set(-centerVec.x, -centerVec.y, -centerVec.z * (opts.centerZ ? 1 : 0));
  const flip = new THREE.Group();
  flip.add(inner);
  flip.scale.set(scale, -scale, scale);
  const outer = new THREE.Group();
  outer.add(flip);
  outer.userData.svgSize = sizeVec.clone().multiplyScalar(scale);
  return outer;
}

const imgCache = new Map();
/** Decoded <img> for an SVG, for compositing decals onto part colours. */
export async function svgImage(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  const p = (async () => {
    const txt = await loadSVGText(url);
    const blob = new Blob([txt], { type: 'image/svg+xml;charset=utf-8' });
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('SVG raster failed: ' + url));
      img.src = objUrl;
    });
    return img;
  })();
  imgCache.set(url, p);
  return p;
}

/**
 * Rasterise an SVG to a CanvasTexture.
 * `w`/`h` are pixel dimensions; `background` may be a CSS colour or null.
 */
export async function svgTexture(url, opts = {}) {
  const { w = 256, h = 256, background = null, padding = 0, flipY = false } = opts;
  const key = `${url}|${w}|${h}|${background}|${padding}|${flipY}`;
  if (texCache.has(key)) return texCache.get(key);

  const p = (async () => {
    const txt = await loadSVGText(url);
    const blob = new Blob([txt], { type: 'image/svg+xml;charset=utf-8' });
    const objUrl = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('SVG raster failed: ' + url));
      img.src = objUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, padding, padding, w - padding * 2, h - padding * 2);
    URL.revokeObjectURL(objUrl);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.flipY = flipY;
    tex.needsUpdate = true;
    return tex;
  })();

  texCache.set(key, p);
  return p;
}

/**
 * Flat (non-extruded) SVG as a filled mesh in the XY plane, centred and
 * normalised to `size`. Cheaper than extrusion for backdrop decals.
 */
export async function flatSVG(url, opts = {}) {
  return extrudeSVG(url, { ...opts, depth: 0.001, bevel: false });
}
