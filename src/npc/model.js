// Minecraft-proportioned humanoid model (pixel units, 1 px = 1.8/32 blocks) with hats.
import * as THREE from 'three';
import { REGIONS as R } from './skins.js';
import { makeEntityMaterial, canvasTexture } from '../entityMaterial.js';

export const PX = 1.8 / 32; // world units per skin pixel

// Applies classic skin layout UVs to a BoxGeometry given its region set {top,bottom,right,front,left,back}
function applyUV(geo, regions, texW = 64, texH = 32) {
  const uv = geo.attributes.uv;
  // Three BoxGeometry face order: +x(0), -x(1), +y(2), -y(3), +z(4), -z(5); 4 verts per face:
  // (0,1) top-left, (1,1) top-right, (0,0) bottom-left, (1,0) bottom-right in Three's uv space.
  const order = [regions.left, regions.right, regions.top, regions.bottom, regions.front, regions.back];
  for (let f = 0; f < 6; f++) {
    const r = order[f];
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      const u = uv.getX(i) > 0.5 ? 1 : 0;   // right?
      const vTop = uv.getY(i) > 0.5;          // top?
      let px = r[0] + u * r[2];
      let py = vTop ? r[1] : r[1] + r[3];
      uv.setXY(i, px / texW, py / texH);
    }
  }
  uv.needsUpdate = true;
}

function part(w, h, d, regions, material, pivot) {
  const geo = new THREE.BoxGeometry(w * PX, h * PX, d * PX);
  applyUV(geo, regions);
  // shift geometry so the pivot is at the local origin: pivot = [px, py, pz] offsets in px from box center
  geo.translate(pivot[0] * PX, pivot[1] * PX, pivot[2] * PX);
  return new THREE.Mesh(geo, material);
}

const HEAD = { top: R.headTop, bottom: R.headBottom, right: R.headRight, front: R.headFront, left: R.headLeft, back: R.headBack };
const BODY = { top: R.bodyTop, bottom: R.bodyBottom, right: R.bodyRight, front: R.bodyFront, left: R.bodyLeft, back: R.bodyBack };
const ARM = { top: R.armTop, bottom: R.armBottom, right: R.armRight, front: R.armFront, left: R.armLeft, back: R.armBack };
const LEG = { top: R.legTop, bottom: R.legBottom, right: R.legRight, front: R.legFront, left: R.legLeft, back: R.legBack };

function hatTexture(color, band) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, 8, 8);
  ctx.fillStyle = band; ctx.fillRect(0, 5, 8, 1);
  return canvasTexture(c);
}

export function buildHumanoid(skinCanvas, hat, hatColor) {
  const tex = canvasTexture(skinCanvas);
  const mat = makeEntityMaterial(tex);
  const root = new THREE.Group();
  // pivots: head at y=24px, body center at 18, arms at shoulder (y=22), legs at hip (y=12)
  const head = part(8, 8, 8, HEAD, mat, [0, 4, 0]);
  head.position.set(0, 24 * PX, 0);
  const body = part(8, 12, 4, BODY, mat, [0, 0, 0]);
  body.position.set(0, 18 * PX, 0);
  const rightArm = part(4, 12, 4, ARM, mat, [0, -4, 0]);
  rightArm.position.set(-6 * PX, 22 * PX, 0);
  const leftArm = part(4, 12, 4, ARM, mat, [0, -4, 0]);
  leftArm.position.set(6 * PX, 22 * PX, 0);
  const rightLeg = part(4, 12, 4, LEG, mat, [0, -6, 0]);
  rightLeg.position.set(-2 * PX, 12 * PX, 0);
  const leftLeg = part(4, 12, 4, LEG, mat, [0, -6, 0]);
  leftLeg.position.set(2 * PX, 12 * PX, 0);
  root.add(head, body, rightArm, leftArm, rightLeg, leftLeg);

  // hats (attached to the head)
  if (hat && hat !== 'none') {
    const hmat = makeEntityMaterial(hatTexture(hatColor, hat === 'straw' ? '#8a6a40' : '#1a1a1a'));
    const solid = (w, h, d, y) => { const g = new THREE.BoxGeometry(w * PX, h * PX, d * PX); g.translate(0, y * PX, 0); return new THREE.Mesh(g, hmat); };
    switch (hat) {
      case 'cowboy': head.add(solid(13, 1, 13, 8.5), solid(8.6, 4, 8.6, 11)); break;
      case 'straw': head.add(solid(14, 1, 14, 8.5), solid(8.6, 3, 8.6, 10.5)); break;
      case 'bowler': head.add(solid(11, 1, 11, 8.5), solid(8.6, 3.5, 8.6, 10.75)); break;
      case 'flat': head.add(solid(12, 1, 12, 8.5), solid(8.6, 2, 8.6, 10)); break;
      case 'flatcap': { const m = solid(8.6, 2, 8.6, 9); head.add(m); const brim = solid(6, 1, 4, 8.5); brim.position.z = 5 * PX; head.add(brim); break; }
      case 'bonnet': { const m = solid(8.8, 5, 8.8, 6); m.position.z = -1 * PX; head.add(m); const brim = solid(9.5, 6, 2, 6.5); brim.position.z = 4.5 * PX; head.add(brim); break; }
      default: break;
    }
  }
  return { root, head, body, rightArm, leftArm, rightLeg, leftLeg, material: mat };
}

// Generic quadruped/other animal builder: parts described as {w,h,d,x,y,z,pivot?:[...]} in px (1 px = PX)
export function buildBoxModel(parts, textureCanvas) {
  const tex = canvasTexture(textureCanvas);
  const mat = makeEntityMaterial(tex);
  const root = new THREE.Group();
  const out = { root, material: mat, parts: {} };
  for (const p of parts) {
    const g = new THREE.BoxGeometry(p.w * PX, p.h * PX, p.d * PX);
    // map every face to the given texture region (simple solid-ish textures)
    if (p.uv) applyUV(g, p.uv, textureCanvas.width, textureCanvas.height);
    if (p.pivot) g.translate(p.pivot[0] * PX, p.pivot[1] * PX, p.pivot[2] * PX);
    const m = new THREE.Mesh(g, mat);
    m.position.set(p.x * PX, p.y * PX, p.z * PX);
    if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    root.add(m);
    out.parts[p.name] = m;
  }
  return out;
}
