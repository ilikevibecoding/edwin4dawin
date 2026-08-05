import * as THREE from 'three';

/**
 * Generated facial morph targets.
 *
 * The avatar mesh ships with only `mouthOpen` and `mouthSmile`, and a character
 * that never blinks looks embalmed in a close-up. Rather than accept that, the
 * missing shapes are synthesised from the geometry itself: eyelid vertices are
 * located relative to the eye bones and displaced to form a closed lid, then
 * registered as a real morph attribute so the normal morph pipeline (and GPU
 * skinning) can drive it.
 */

interface MorphBuildResult {
  index: number;
  affected: number;
}

/** Position of a bone in the mesh's bind (geometry) space. */
function bindSpacePosition(mesh: THREE.SkinnedMesh, bone: THREE.Bone, out = new THREE.Vector3()): THREE.Vector3 | null {
  const idx = mesh.skeleton.bones.indexOf(bone);
  if (idx < 0) return null;
  const bind = mesh.skeleton.boneInverses[idx].clone().invert();
  return out.setFromMatrixPosition(bind);
}

function addMorph(mesh: THREE.Mesh, name: string, deltas: Float32Array): number {
  const geo = mesh.geometry;
  const attr = new THREE.BufferAttribute(deltas, 3);
  if (!geo.morphAttributes.position) geo.morphAttributes.position = [];
  geo.morphAttributes.position.push(attr);
  geo.morphTargetsRelative = true;
  const index = geo.morphAttributes.position.length - 1;
  if (!mesh.morphTargetDictionary) mesh.morphTargetDictionary = {};
  if (!mesh.morphTargetInfluences) mesh.morphTargetInfluences = [];
  mesh.morphTargetDictionary[name] = index;
  while (mesh.morphTargetInfluences.length <= index) mesh.morphTargetInfluences.push(0);
  // Existing relative morphs keep working; the new one just extends the list.
  mesh.updateMorphTargets = mesh.updateMorphTargets;
  return index;
}

export interface BlinkOptions {
  /** Multiplier on the automatically measured eye radius. */
  radiusScale?: number;
  /** How far down the lid travels, as a fraction of eye radius. */
  closeAmount?: number;
  /** Forward push so the lid wraps over the eyeball. */
  wrap?: number;
}

/**
 * Builds an `eyesClosed` morph on a head mesh. Returns null when the rig has no
 * eye bones (faceless chassis characters), in which case blinking is skipped.
 */
export function buildBlinkMorph(
  headMesh: THREE.SkinnedMesh,
  eyeBones: THREE.Bone[],
  eyeRadiusHint: number,
  opts: BlinkOptions = {}
): MorphBuildResult | null {
  if (!eyeBones.length) return null;
  const radiusScale = opts.radiusScale ?? 1.85;
  const closeAmount = opts.closeAmount ?? 1.5;
  const wrap = opts.wrap ?? 0.35;

  const geo = headMesh.geometry;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const deltas = new Float32Array(count * 3);

  const centres: THREE.Vector3[] = [];
  for (const bone of eyeBones) {
    const p = bindSpacePosition(headMesh, bone);
    if (p) centres.push(p);
  }
  if (!centres.length) return null;

  const radius = eyeRadiusHint * radiusScale;
  const v = new THREE.Vector3();
  let affected = 0;

  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i);
    for (const c of centres) {
      const d = v.distanceTo(c);
      if (d > radius) continue;
      // Only the lid above the pupil line moves, with a soft radial falloff.
      const above = v.y - c.y;
      if (above < -eyeRadiusHint * 0.35) continue;
      const radial = 1 - d / radius;
      const falloff = radial * radial * (3 - 2 * radial);
      const lidTravel = Math.max(0, above + eyeRadiusHint * 0.35);
      const dy = -Math.min(lidTravel, eyeRadiusHint * closeAmount) * falloff;
      const dz = eyeRadiusHint * wrap * falloff * 0.5;
      deltas[i * 3] += 0;
      deltas[i * 3 + 1] += dy;
      deltas[i * 3 + 2] += dz;
      affected++;
      break;
    }
  }

  if (!affected) return null;
  const index = addMorph(headMesh, 'eyesClosed', deltas);
  return { index, affected };
}

export interface HairOptions {
  /** Shell thickness in model units. */
  thickness?: number;
  /** Height of the hairline above the eyes at the front of the skull. */
  frontLift?: number;
  /** How much lower the hairline sits at the nape. */
  napeDrop?: number;
  color?: number;
  roughness?: number;
}

/**
 * Builds a hair shell from the scalp of a head mesh.
 *
 * The avatar's hair lives in a hat mesh that had to go, and a bald lead reads as
 * a mannequin in close-up. Rather than model hair, the scalp region of the head
 * itself is copied, pushed out along its normals and given a hair material. The
 * copy keeps the original skin weights, so it deforms with the head for free and
 * can never separate from it.
 */
export function buildHairCap(
  headMesh: THREE.SkinnedMesh,
  headBone: THREE.Bone,
  eyeBones: THREE.Bone[],
  opts: HairOptions = {}
): THREE.SkinnedMesh | null {
  const thickness = opts.thickness ?? 0.008;
  const frontLift = opts.frontLift ?? 0.052;
  const napeDrop = opts.napeDrop ?? 0.045;

  const geo = headMesh.geometry;
  const pos = geo.attributes.position as THREE.BufferAttribute | undefined;
  const nrm = geo.attributes.normal as THREE.BufferAttribute | undefined;
  const index = geo.index;
  if (!pos || !nrm || !index) return null;

  const headPos = bindSpacePosition(headMesh, headBone);
  if (!headPos) return null;
  let eyeY = headPos.y + 0.08;
  let eyeZ = headPos.z;
  if (eyeBones.length) {
    let sumY = 0;
    let sumZ = 0;
    let n = 0;
    for (const b of eyeBones) {
      const p = bindSpacePosition(headMesh, b);
      if (p) {
        sumY += p.y;
        sumZ += p.z;
        n++;
      }
    }
    if (n) {
      eyeY = sumY / n;
      eyeZ = sumZ / n;
    }
  }

  // Hairline: high across the forehead, dropping toward the nape.
  const v = new THREE.Vector3();
  const selected = new Uint8Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const forward = Math.max(-1, Math.min(1, (v.z - eyeZ) / 0.09));
    const threshold = eyeY + frontLift - napeDrop * (1 - (forward + 1) / 2);
    if (v.y >= threshold) selected[i] = 1;
  }

  // Keep only triangles fully inside the scalp region.
  const keep: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t);
    const b = index.getX(t + 1);
    const c = index.getX(t + 2);
    if (selected[a] && selected[b] && selected[c]) keep.push(a, b, c);
  }
  if (keep.length < 90) return null;

  const hairGeo = new THREE.BufferGeometry();
  const newPos = new Float32Array(pos.count * 3);
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nrm, i).normalize();
    v.addScaledVector(n, thickness);
    newPos[i * 3] = v.x;
    newPos[i * 3 + 1] = v.y;
    newPos[i * 3 + 2] = v.z;
  }
  hairGeo.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
  hairGeo.setAttribute('normal', nrm.clone());
  if (geo.attributes.uv) hairGeo.setAttribute('uv', (geo.attributes.uv as THREE.BufferAttribute).clone());
  if (geo.attributes.skinIndex) hairGeo.setAttribute('skinIndex', (geo.attributes.skinIndex as THREE.BufferAttribute).clone());
  if (geo.attributes.skinWeight) hairGeo.setAttribute('skinWeight', (geo.attributes.skinWeight as THREE.BufferAttribute).clone());
  hairGeo.setIndex(keep);
  hairGeo.computeVertexNormals();

  const hair = new THREE.SkinnedMesh(
    hairGeo,
    new THREE.MeshPhysicalMaterial({
      color: opts.color ?? 0x1a1512,
      roughness: opts.roughness ?? 0.42,
      metalness: 0.05,
      sheen: 0.6,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(0x6a5a4a),
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.9,
    })
  );
  hair.name = `${headMesh.name}_hair`;
  hair.castShadow = true;
  hair.receiveShadow = true;
  hair.frustumCulled = false;
  hair.bind(headMesh.skeleton, headMesh.bindMatrix);
  return hair;
}

/** Measures eye radius from a dedicated eyeball mesh, if the model has one. */
export function measureEyeRadius(root: THREE.Object3D, fallback = 0.013): number {
  let radius = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!/^eye(left|right)$|eyeball/i.test(mesh.name)) return;
    mesh.geometry.computeBoundingSphere();
    const r = mesh.geometry.boundingSphere?.radius ?? 0;
    if (r > radius) radius = r;
  });
  return radius > 0.0005 ? radius : fallback;
}

/**
 * Finds the mesh that carries the face.
 *
 * Name matching has to be strict: this avatar also has a `Wolf3D_Headwear` mesh,
 * and a loose "head" match picks the hat instead of the head, which silently
 * produces a hat-shaped hair shell and blink morphs on the wrong geometry.
 */
const NOT_HEAD = /headwear|hat|cap|helmet|hair|teeth|beard|mustache|eye|glasses|outfit|body|footwear/i;

export function findHeadMesh(root: THREE.Object3D): THREE.SkinnedMesh | null {
  let named: THREE.SkinnedMesh | null = null;
  let biggest: THREE.SkinnedMesh | null = null;
  let biggestCount = 0;
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    if (!named && /head|face/i.test(mesh.name) && !NOT_HEAD.test(mesh.name)) named = mesh;
    const c = mesh.geometry.attributes.position?.count ?? 0;
    if (c > biggestCount && !NOT_HEAD.test(mesh.name)) {
      biggestCount = c;
      biggest = mesh;
    }
  });
  return named ?? biggest;
}
