import * as THREE from 'three';
import type { MaterialLibrary } from '../render/Materials';
import { mergeGeometries } from '../world/Level';

/**
 * Strike aircraft.
 *
 * At the ranges an airstrike actually happens over — 150 to 400 m — nobody
 * identifies an airframe. What reads is three things, in this order: the
 * planform against the sky, the afterburner, and the trails. So the geometry
 * budget goes on the *outline* — a big cranked delta, twin canted tails, a
 * long nose — and the shading budget goes on making the exhaust bloom.
 *
 * Two further details do most of the storytelling. The aircraft carries its
 * ordnance on visible wing pylons and sheds it bomb by bomb as the stick goes
 * down, so a player watching the run can see the jet get lighter; and the
 * wingtips condense vapour under g, which is what makes the pull-off read as a
 * hard manoeuvre rather than a change of heading.
 */

export interface JetModel {
  group: THREE.Group;
  flybyPlayed: boolean;
  /** 0..1 throttle; drives plume length, brightness and colour. */
  setAfterburner(amount: number): void;
  /** 0..1 aerodynamic loading; drives wingtip vapour. */
  setLoad(amount: number): void;
  /** Number of stores still hanging, 0..STORES. */
  setStores(count: number): void;
  /** World-space point the exhaust leaves the airframe from. */
  exhaustWorld(out: THREE.Vector3): THREE.Vector3;
  update(dt: number, position: THREE.Vector3, velocity: THREE.Vector3): void;
  dispose(): void;
}

export const JET_STORES = 4;

interface Piece {
  geo: THREE.BufferGeometry;
  x?: number; y?: number; z?: number;
  rx?: number; ry?: number; rz?: number;
  sx?: number; sy?: number; sz?: number;
}

function bake(pieces: Piece[]): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const list: THREE.BufferGeometry[] = [];
  for (const piece of pieces) {
    const g = piece.geo.clone();
    if (!g.getAttribute('uv')) {
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = pos.getX(i) * 0.4;
        uv[i * 2 + 1] = pos.getZ(i) * 0.4;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    e.set(piece.rx ?? 0, piece.ry ?? 0, piece.rz ?? 0);
    q.setFromEuler(e);
    s.set(piece.sx ?? 1, piece.sy ?? 1, piece.sz ?? 1);
    m.compose(p.set(piece.x ?? 0, piece.y ?? 0, piece.z ?? 0), q, s);
    g.applyMatrix4(m);
    list.push(g);
  }
  const merged = mergeGeometries(list)!;
  for (const g of list) g.dispose();
  return merged;
}

/**
 * Prototype for the exhaust plume; each aircraft gets a clone.
 *
 * It used to be shared outright, on the reasoning that a fresh shader program
 * costs tens of seconds to compile under the software rasteriser. That is
 * true, but it is not what sharing a *material* costs: `uPower` lives in the
 * uniforms, so both aircraft had one throttle between them and each damped it
 * toward its own target every frame. The lead lighting the burner for its
 * break turn was dragged straight back down by the wingman still at cruise,
 * and neither plume ever reached the length it was written for.
 *
 * Cloning is the fix and it is free: three.js keys its program cache on the
 * shader source, so identical clones reuse the compiled program and only the
 * uniform block is duplicated.
 */
let flameProto: THREE.ShaderMaterial | null = null;

function flameMaterial(): THREE.ShaderMaterial {
  if (flameProto) return flameProto.clone();
  flameProto = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0.4 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uPower;
      void main() {
        vUv = uv;
        vec3 p = position;
        // Plume length and girth scale with throttle; at military power it is
        // a stub, in full reheat it is longer than the aircraft.
        p.z *= 0.30 + uPower * 2.1;
        p.xy *= 0.62 + uPower * 0.75;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uPower;

      float hash(vec2 p) {
        uvec2 q = uvec2(ivec2(p * 512.0)) * uvec2(1597334673u, 3812015801u);
        uint n = (q.x ^ q.y) * 1597334673u;
        return float(n) * (1.0 / 4294967296.0);
      }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }

      void main() {
        float along = vUv.y;
        // Shock diamonds: periodic bright nodes along the plume, the single
        // most recognisable feature of an afterburner. They only exist under
        // reheat, so they fade in with throttle.
        float diamonds = 0.5 + 0.5 * sin(along * 30.0 - uTime * 26.0);
        diamonds = pow(diamonds, 5.0)
                 * smoothstep(0.04, 0.22, along)
                 * smoothstep(0.85, 0.35, along)
                 * smoothstep(0.35, 0.8, uPower);

        float turb = noise(vec2(vUv.x * 7.0, along * 10.0 - uTime * 13.0));
        float core = pow(1.0 - along, 1.35);
        float body = core * (0.62 + turb * 0.62);

        // Hot near the nozzle, blue-violet where unburnt fuel is still
        // igniting, and it never goes fully white because the tonemap would
        // flatten it.
        vec3 hot  = vec3(1.0, 0.80, 0.52);
        vec3 blue = vec3(0.46, 0.60, 1.0);
        vec3 c = mix(blue, hot, core * core);
        c += vec3(1.0, 0.86, 0.62) * diamonds * 2.8;

        float a = (body + diamonds * 0.9) * (0.24 + uPower * 0.72);
        a *= smoothstep(0.0, 0.05, along);
        if (a < 0.004) discard;
        // Pitched to bloom without erasing what it is attached to. At the gain
        // this started on, a wingman at three hundred metres was a white mass
        // twice the length of its own airframe with the silhouette lost inside
        // it — which costs the one read that matters at these ranges.
        gl_FragColor = vec4(c * (2.1 + uPower * 5.2) * a, min(a, 1.0));
      }
    `,
  });
  return flameProto.clone();
}

/** Ring of vertex-coloured quads used for wingtip vapour; no extra program. */
function vaporGeometry(length: number, radius: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.18, radius, length, 6, 1, true);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, length / 2);
  return geo;
}

export function buildJet(materials: MaterialLibrary): JetModel {
  const group = new THREE.Group();
  group.name = 'jet';

  // Dark, low-chroma, slightly glossy. Against a bright desert sky the only
  // thing that matters is that it reads as a hole in the sky with a specular
  // highlight running along the spine.
  const skin = materials.get('paintedMetalTan', {
    scale: 0.22,
    color: 0x3c4148,
    roughness: 0.42,
    metalness: 0.92,
  });
  const dark = materials.get('gunmetal', { scale: 0.3, color: 0x24272b });

  const pieces: Piece[] = [];

  // ---- fuselage --------------------------------------------------------
  // Three stretched capsules give the body a waist; a single tube reads as a
  // rocket rather than an aircraft.
  const fwd = new THREE.CapsuleGeometry(1.0, 4.6, 4, 12);
  fwd.rotateX(Math.PI / 2);
  pieces.push({ geo: fwd, z: -5.0, sx: 1.0, sy: 0.82 });

  const mid = new THREE.CapsuleGeometry(1.32, 6.2, 4, 12);
  mid.rotateX(Math.PI / 2);
  pieces.push({ geo: mid, z: 0.9, sx: 1.26, sy: 0.88 });

  const aft = new THREE.CapsuleGeometry(1.06, 3.6, 4, 12);
  aft.rotateX(Math.PI / 2);
  pieces.push({ geo: aft, z: 7.0, sx: 1.14, sy: 0.9 });

  const nose = new THREE.ConeGeometry(1.0, 4.2, 12);
  nose.rotateX(-Math.PI / 2);
  pieces.push({ geo: nose, z: -9.5 });

  // Canopy: long bubble, sat proud of the spine so it catches a highlight.
  const canopy = new THREE.SphereGeometry(0.8, 12, 8);
  pieces.push({ geo: canopy, y: 0.72, z: -4.8, sx: 0.98, sy: 0.74, sz: 3.0 });

  // ---- cranked delta wing ---------------------------------------------
  // Two panels: a highly swept inboard section and a straighter outboard one.
  // The kink is what separates a fighter planform from a paper dart.
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.0, -2.4);
  wingShape.lineTo(4.0, 2.2);
  wingShape.lineTo(7.3, 4.0);
  wingShape.lineTo(7.3, 5.0);
  wingShape.lineTo(4.2, 4.6);
  wingShape.lineTo(0.5, 4.2);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.26, bevelEnabled: false });
  wingGeo.rotateX(Math.PI / 2);
  pieces.push({ geo: wingGeo, x: 0.85, y: -0.22, z: 0.4 });
  pieces.push({ geo: wingGeo, x: -0.85, y: -0.22, z: 0.4, sx: -1 });

  // Leading-edge root extensions: they widen the forward silhouette and stop
  // the fuselage/wing junction reading as a stick through a triangle.
  const lerxShape = new THREE.Shape();
  lerxShape.moveTo(0, -5.6);
  lerxShape.lineTo(1.5, -1.2);
  lerxShape.lineTo(1.5, -0.2);
  lerxShape.lineTo(0.3, -0.6);
  lerxShape.closePath();
  const lerxGeo = new THREE.ExtrudeGeometry(lerxShape, { depth: 0.16, bevelEnabled: false });
  lerxGeo.rotateX(Math.PI / 2);
  pieces.push({ geo: lerxGeo, x: 1.05, y: -0.1, z: 0.4 });
  pieces.push({ geo: lerxGeo, x: -1.05, y: -0.1, z: 0.4, sx: -1 });

  // ---- tail ------------------------------------------------------------
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(2.6, 0.5);
  finShape.lineTo(2.9, 3.3);
  finShape.lineTo(1.1, 3.7);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: false });
  finGeo.rotateY(Math.PI / 2);
  finGeo.rotateZ(-Math.PI / 2);
  pieces.push({ geo: finGeo, x: 1.5, y: 0.45, z: 5.6, rz: -0.32 });
  pieces.push({ geo: finGeo, x: -1.5, y: 0.45, z: 5.6, rz: 0.32 });

  // All-moving stabilators.
  const stabShape = new THREE.Shape();
  stabShape.moveTo(0, -1.4);
  stabShape.lineTo(3.1, 0.6);
  stabShape.lineTo(3.1, 1.5);
  stabShape.lineTo(0.3, 1.7);
  stabShape.closePath();
  const stabGeo = new THREE.ExtrudeGeometry(stabShape, { depth: 0.16, bevelEnabled: false });
  stabGeo.rotateX(Math.PI / 2);
  pieces.push({ geo: stabGeo, x: 1.2, y: -0.15, z: 7.6 });
  pieces.push({ geo: stabGeo, x: -1.2, y: -0.15, z: 7.6, sx: -1 });

  // ---- intakes ---------------------------------------------------------
  const intake = new THREE.BoxGeometry(1.15, 1.05, 4.6);
  pieces.push({ geo: intake, x: 1.72, y: -0.42, z: -1.6, rz: 0.13 });
  pieces.push({ geo: intake, x: -1.72, y: -0.42, z: -1.6, rz: -0.13 });

  // Intake lips, so the front of the aircraft has depth in a silhouette.
  const lip = new THREE.CylinderGeometry(0.62, 0.62, 0.5, 10, 1, true);
  lip.rotateX(Math.PI / 2);
  pieces.push({ geo: lip, x: 1.72, y: -0.42, z: -3.9, sx: 1.5 });
  pieces.push({ geo: lip, x: -1.72, y: -0.42, z: -3.9, sx: 1.5 });

  // ---- pylons ----------------------------------------------------------
  const pylonGeo = new THREE.BoxGeometry(0.22, 0.62, 1.7);
  const pylonX = [2.9, 4.7];
  for (const side of [1, -1]) {
    for (const px of pylonX) {
      pieces.push({ geo: pylonGeo, x: side * px, y: -0.55, z: 1.9 });
    }
  }

  const bodyGeo = bake(pieces);
  const body = new THREE.Mesh(bodyGeo, skin);
  body.castShadow = false;
  body.frustumCulled = false;
  group.add(body);
  for (const p of pieces) p.geo.dispose();

  // ---- stores ----------------------------------------------------------
  // Visible ordnance that disappears as the stick goes down.
  const storeGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    const b = new THREE.CylinderGeometry(0.28, 0.28, 2.4, 10);
    b.rotateX(Math.PI / 2);
    parts.push(b);
    const n = new THREE.ConeGeometry(0.28, 0.8, 10);
    n.rotateX(-Math.PI / 2);
    n.translate(0, 0, -1.55);
    parts.push(n);
    const t = new THREE.BoxGeometry(0.62, 0.06, 0.6);
    t.translate(0, 0, 1.3);
    parts.push(t);
    const t2 = new THREE.BoxGeometry(0.06, 0.62, 0.6);
    t2.translate(0, 0, 1.3);
    parts.push(t2);
    const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
    for (const g of parts) g.dispose();
    return merged;
  })();
  const stores: THREE.Mesh[] = [];
  for (const side of [1, -1]) {
    for (const px of pylonX) {
      const m = new THREE.Mesh(storeGeo, dark);
      m.position.set(side * px, -1.05, 1.9);
      m.frustumCulled = false;
      group.add(m);
      stores.push(m);
    }
  }

  // ---- exhaust ---------------------------------------------------------
  const nozzleGeo = new THREE.CylinderGeometry(0.72, 0.86, 1.5, 14, 1, true);
  nozzleGeo.rotateX(Math.PI / 2);
  const nozzleL = new THREE.Mesh(nozzleGeo, dark);
  nozzleL.position.set(0.82, -0.05, 9.1);
  nozzleL.frustumCulled = false;
  const nozzleR = new THREE.Mesh(nozzleGeo, dark);
  nozzleR.position.set(-0.82, -0.05, 9.1);
  nozzleR.frustumCulled = false;
  group.add(nozzleL, nozzleR);

  const flameMat = flameMaterial();
  const flameGeo = new THREE.ConeGeometry(0.72, 9.0, 14, 1, true);
  flameGeo.rotateX(-Math.PI / 2);
  flameGeo.translate(0, 0, 4.5);
  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(0.82, -0.05, 9.7);
  flameL.frustumCulled = false;
  flameL.renderOrder = 6;
  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(-0.82, -0.05, 9.7);
  flameR.frustumCulled = false;
  flameR.renderOrder = 6;
  group.add(flameL, flameR);

  // ---- wingtip vapour --------------------------------------------------
  // Vertex-coloured so it costs no new program. Opacity is driven by g, not
  // by airspeed: a jet in level cruise does not stream vapour, one in a 5 g
  // pull-off does, and that difference is most of what sells the manoeuvre.
  const vaporGeo = vaporGeometry(26, 0.85);
  {
    const pos = vaporGeo.getAttribute('position') as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 4);
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp(pos.getZ(i) / 26, 0, 1);
      col[i * 4 + 0] = 0.94;
      col[i * 4 + 1] = 0.95;
      col[i * 4 + 2] = 0.99;
      col[i * 4 + 3] = Math.pow(1 - t, 1.5) * Math.min(1, t * 14);
    }
    vaporGeo.setAttribute('color', new THREE.BufferAttribute(col, 4));
  }
  const vaporMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    opacity: 0,
  });
  const vaporL = new THREE.Mesh(vaporGeo, vaporMat);
  vaporL.position.set(7.3, -0.12, 4.6);
  vaporL.frustumCulled = false;
  const vaporR = new THREE.Mesh(vaporGeo, vaporMat);
  vaporR.position.set(-7.3, -0.12, 4.6);
  vaporR.frustumCulled = false;
  group.add(vaporL, vaporR);

  // ---- lights ----------------------------------------------------------
  const strobeGeo = new THREE.SphereGeometry(0.19, 6, 5);
  const strobeMatR = new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false });
  const strobeMatG = new THREE.MeshBasicMaterial({ color: 0x2aff55, toneMapped: false });
  const strobeMatW = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const strobeL = new THREE.Mesh(strobeGeo, strobeMatR);
  strobeL.position.set(7.2, -0.1, 4.4);
  const strobeR = new THREE.Mesh(strobeGeo, strobeMatG);
  strobeR.position.set(-7.2, -0.1, 4.4);
  const beacon = new THREE.Mesh(strobeGeo, strobeMatW);
  beacon.position.set(0, 1.3, 5.9);
  beacon.scale.setScalar(1.3);
  group.add(strobeL, strobeR, beacon);

  let burner = 0.4;
  let load = 0;
  let elapsed = 0;
  const _exhaustLocal = new THREE.Vector3(0, -0.05, 10.2);

  return {
    group,
    flybyPlayed: false,
    setAfterburner(amount: number): void {
      burner = amount;
    },
    setLoad(amount: number): void {
      load = amount;
    },
    setStores(count: number): void {
      for (let i = 0; i < stores.length; i++) stores[i].visible = i < count;
    },
    exhaustWorld(out: THREE.Vector3): THREE.Vector3 {
      return out.copy(_exhaustLocal).applyMatrix4(group.matrixWorld);
    },
    update(dt: number, _position: THREE.Vector3, velocity: THREE.Vector3): void {
      elapsed += dt;
      flameMat.uniforms.uTime.value = elapsed;
      flameMat.uniforms.uPower.value = THREE.MathUtils.damp(
        flameMat.uniforms.uPower.value as number, burner, 5, dt,
      );
      vaporMat.opacity = THREE.MathUtils.damp(vaporMat.opacity, load * 0.8, 5, dt);
      vaporMat.visible = vaporMat.opacity > 0.01;

      // Two-pulse anti-collision strobe, which is what an aircraft beacon
      // actually does and reads instantly as "aircraft" even at a pixel.
      const cycle = (elapsed * 1.15) % 1;
      const flash = cycle < 0.05 || (cycle > 0.11 && cycle < 0.16) ? 1 : 0.05;
      strobeMatR.color.setRGB(flash, 0.16 * flash, 0.1 * flash);
      strobeMatG.color.setRGB(0.16 * flash, flash, 0.33 * flash);
      strobeMatW.color.setRGB(flash * 1.6, flash * 1.6, flash * 1.5);
      void velocity;
    },
    dispose(): void {
      bodyGeo.dispose();
      storeGeo.dispose();
      nozzleGeo.dispose();
      flameGeo.dispose();
      flameMat.dispose();
      vaporGeo.dispose();
      vaporMat.dispose();
      strobeGeo.dispose();
      strobeMatR.dispose();
      strobeMatG.dispose();
      strobeMatW.dispose();
    },
  };
}
