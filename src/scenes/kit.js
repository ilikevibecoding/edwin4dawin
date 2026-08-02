// Helpers shared by the sequences: camera-locked overlays, cue-list plumbing,
// simple flight controllers and the standard "space" or "desert" stage setups.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { starfield, nebulaSky, spaceLights, sunBillboard } from '../worlds/space.js';
import { voDur } from '../data/vo-manifest.js';
import { LINES, CAST } from '../data/script.js';
import { clamp, smoothstep, lerp, Ease } from '../util/math.js';

/**
 * Attaches a full-frame quad to the camera. Used for the "A long time ago"
 * card, the title logo and the end plates, so 2D elements are inside the
 * rendered frame (and therefore inside the captured video) rather than being
 * DOM overlays.
 */
export function cameraQuad(camera, texture, { distance = 10, widthFrac = 0.86, opacity = 1, y = 0, blending = THREE.NormalBlending } = {}) {
  const vFov = (camera.fov * Math.PI) / 180;
  const h = 2 * Math.tan(vFov / 2) * distance;
  const w = h * camera.aspect;
  const img = texture.image;
  const aspect = img ? img.width / img.height : 4;
  const quadW = w * widthFrac;
  const quadH = quadW / aspect;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(quadW, quadH),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, depthTest: false, depthWrite: false, blending, toneMapped: false }),
  );
  mesh.position.set(0, y * h, -distance);
  mesh.renderOrder = 100;
  mesh.frustumCulled = false;
  camera.add(mesh);
  mesh.userData.frameHeight = h;
  mesh.userData.frameWidth = w;
  return mesh;
}

/** Standard deep-space stage: stars, nebula, lights. */
export function spaceStage({ fov = 40, near = 2, far = 90000, nebulaSeed = 77, starCount = 2400, hueA, hueB, density = 1, lights = {} } = {}) {
  const { scene, camera } = makeStage({ background: 0x000000, fov, near, far });
  scene.add(camera);
  const sky = nebulaSky({ radius: far * 0.82, seed: nebulaSeed, hueA, hueB, density });
  scene.add(sky);
  scene.add(starfield({ count: starCount, radius: far * 0.7 }));
  const rig = spaceLights(scene, lights);
  return { scene, camera, sky, rig };
}

/** Builds the absolute-time cue list for the audio director. */
export function collectCues(sequences) {
  const out = [];
  let base = 0;
  for (const seq of sequences) {
    for (const cue of seq.cues || []) {
      const c = { ...cue, t: base + cue.t };
      if (c.kind === 'vo') c.dur = voDur(c.id);
      out.push(c);
    }
    base += seq.duration;
  }
  return out;
}

/** Subtitle track derived from the same cue list. */
export function collectSubtitles(sequences) {
  const out = [];
  let base = 0;
  for (const seq of sequences) {
    for (const cue of (seq.cues || [])) {
      if (cue.kind !== 'vo') continue;
      const line = LINES[cue.id];
      if (!line) continue;
      const who = CAST[line.who];
      out.push({
        t: base + cue.t,
        end: base + cue.t + voDur(cue.id) + 0.35,
        text: line.text,
        speaker: line.who === 'narrator' ? '' : who.name,
        color: who.color,
      });
    }
    base += seq.duration;
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Convenience for writing cue lists: vo('n1', 2.4) */
export const vo = (id, t, opts = {}) => ({ kind: 'vo', id, t, ...opts });
export const sfx = (id, t, opts = {}) => ({ kind: 'sfx', id, t, opts });
export const music = (id, t, opts = {}) => ({ kind: 'music', id, t, ...opts });

/** When a voice line ends, given the cue list of a sequence. */
export function voEnd(cues, id) {
  const c = cues.find((x) => x.kind === 'vo' && x.id === id);
  return c ? c.t + voDur(id) : 0;
}

/**
 * Moves an object along a straight line at constant speed, with optional
 * banking. Cheap alternative to a full flight path for pass-bys.
 */
export function linearFlight(obj, { from, to, t0, t1, bank = 0, roll = 0 }) {
  return (t) => {
    const u = clamp((t - t0) / (t1 - t0));
    obj.position.lerpVectors(from, to, u);
    if (bank) obj.rotation.z = bank;
    if (roll) obj.rotation.z += roll * t;
    return u;
  };
}

/** Keeps a group of objects in a loose V formation behind a leader. */
export function formation(index, spacing = 14) {
  const row = Math.floor((index + 1) / 2);
  const side = index === 0 ? 0 : (index % 2 === 1 ? -1 : 1);
  return new THREE.Vector3(side * row * spacing, (index % 3) * 1.6 - 1.6, -row * spacing * 1.15);
}

/** Adds a soft planet-lit fill so ships are not pure silhouettes. */
export function bounceLight(scene, { color = 0x3a5a8c, intensity = 0.5, dir = [0, -1, 0] } = {}) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...dir).normalize().multiplyScalar(-1000);
  scene.add(l);
  return l;
}

/** Fades a material's opacity over a window. */
export function fadeMat(mat, t, { in0, in1, out0, out1, max = 1 }) {
  let a = max;
  if (in1 !== undefined) a *= smoothstep(in0, in1, t);
  if (out1 !== undefined) a *= 1 - smoothstep(out0, out1, t);
  mat.opacity = a;
  mat.visible = a > 0.002;
  return a;
}

/** Simple shot-list helper: returns which shot index is active at time t. */
export function shotAt(shots, t) {
  let i = 0;
  while (i < shots.length - 1 && t >= shots[i + 1].t) i++;
  return i;
}
