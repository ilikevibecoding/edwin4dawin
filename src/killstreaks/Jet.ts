import * as THREE from 'three';
import type { MaterialLibrary } from '../render/Materials';
import { mergeGeometries } from '../world/Level';

/**
 * Strike aircraft.
 *
 * A delta-wing attack jet built from primitives, plus the two things that
 * actually sell an aircraft at distance: afterburner plumes that stretch and
 * flicker, and wingtip vortex trails that only appear when the airframe is
 * loaded. Nobody can identify the airframe at 400 m — everybody notices if the
 * exhaust is a static orange blob.
 */

export interface JetModel {
  group: THREE.Group;
  flybyPlayed: boolean;
  setAfterburner(amount: number): void;
  update(dt: number, position: THREE.Vector3, velocity: THREE.Vector3): void;
  dispose(): void;
}

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

export function buildJet(materials: MaterialLibrary): JetModel {
  const group = new THREE.Group();
  group.name = 'jet';

  const skin = materials.get('paintedMetalTan', {
    scale: 0.25,
    color: 0x6f7278,
    roughness: 0.44,
    metalness: 0.9,
  });
  const dark = materials.get('gunmetal', { scale: 0.3, color: 0x33373c });

  // ---- airframe ----
  const pieces: Piece[] = [];

  // Fuselage: a long tapered body. Built from three stretched capsules so the
  // silhouette has a proper waist rather than reading as a tube.
  const fwd = new THREE.CapsuleGeometry(0.9, 3.4, 4, 12);
  fwd.rotateX(Math.PI / 2);
  pieces.push({ geo: fwd, z: -3.6, sx: 1.0, sy: 0.86 });

  const mid = new THREE.CapsuleGeometry(1.15, 5.0, 4, 12);
  mid.rotateX(Math.PI / 2);
  pieces.push({ geo: mid, z: 0.6, sx: 1.15, sy: 0.9 });

  const aft = new THREE.CapsuleGeometry(0.95, 3.0, 4, 12);
  aft.rotateX(Math.PI / 2);
  pieces.push({ geo: aft, z: 5.2, sx: 1.05, sy: 0.92 });

  // Nose cone
  const nose = new THREE.ConeGeometry(0.9, 3.0, 12);
  nose.rotateX(-Math.PI / 2);
  pieces.push({ geo: nose, z: -6.9 });

  // Canopy
  const canopy = new THREE.SphereGeometry(0.66, 12, 8);
  pieces.push({ geo: canopy, y: 0.62, z: -3.4, sx: 1.0, sy: 0.72, sz: 2.5 });

  // Delta wings with a leading-edge sweep.
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -2.6);
  wingShape.lineTo(6.4, 3.2);
  wingShape.lineTo(6.4, 4.1);
  wingShape.lineTo(0.4, 3.3);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.22, bevelEnabled: false });
  wingGeo.rotateX(Math.PI / 2);
  pieces.push({ geo: wingGeo, x: 0.7, y: -0.15, z: 0 });
  pieces.push({ geo: wingGeo, x: -0.7, y: -0.15, z: 0, sx: -1 });

  // Canards
  const canardShape = new THREE.Shape();
  canardShape.moveTo(0, -0.9);
  canardShape.lineTo(2.1, 0.5);
  canardShape.lineTo(2.1, 1.0);
  canardShape.lineTo(0.2, 1.1);
  canardShape.closePath();
  const canardGeo = new THREE.ExtrudeGeometry(canardShape, { depth: 0.14, bevelEnabled: false });
  canardGeo.rotateX(Math.PI / 2);
  pieces.push({ geo: canardGeo, x: 0.8, y: 0.1, z: -4.0 });
  pieces.push({ geo: canardGeo, x: -0.8, y: 0.1, z: -4.0, sx: -1 });

  // Twin canted tail fins.
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(2.2, 0.4);
  finShape.lineTo(2.4, 2.6);
  finShape.lineTo(0.9, 2.9);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.14, bevelEnabled: false });
  finGeo.rotateY(Math.PI / 2);
  finGeo.rotateZ(-Math.PI / 2);
  pieces.push({ geo: finGeo, x: 1.15, y: 0.4, z: 4.6, rz: -0.34 });
  pieces.push({ geo: finGeo, x: -1.15, y: 0.4, z: 4.6, rz: 0.34 });

  // Intakes
  const intake = new THREE.BoxGeometry(0.9, 0.8, 3.2);
  pieces.push({ geo: intake, x: 1.35, y: -0.35, z: -1.6, rz: 0.12 });
  pieces.push({ geo: intake, x: -1.35, y: -0.35, z: -1.6, rz: -0.12 });

  const bodyGeo = bake(pieces);
  const body = new THREE.Mesh(bodyGeo, skin);
  body.castShadow = false;
  body.frustumCulled = false;
  group.add(body);

  for (const p of pieces) p.geo.dispose();

  // Exhaust nozzles
  const nozzleGeo = new THREE.CylinderGeometry(0.62, 0.72, 1.1, 14, 1, true);
  nozzleGeo.rotateX(Math.PI / 2);
  const nozzleL = new THREE.Mesh(nozzleGeo, dark);
  nozzleL.position.set(0.7, -0.05, 7.0);
  const nozzleR = new THREE.Mesh(nozzleGeo, dark);
  nozzleR.position.set(-0.7, -0.05, 7.0);
  group.add(nozzleL, nozzleR);

  // ---- afterburner ----
  const flameGeo = new THREE.ConeGeometry(0.55, 6.0, 14, 1, true);
  flameGeo.rotateX(-Math.PI / 2);
  flameGeo.translate(0, 0, 3.0);
  const flameMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
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
        // Plume length scales with throttle.
        p.z *= 0.35 + uPower * 1.35;
        p.xy *= 0.7 + uPower * 0.55;
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
        // most recognisable feature of an afterburner.
        float diamonds = 0.5 + 0.5 * sin(along * 34.0 - uTime * 30.0);
        diamonds = pow(diamonds, 6.0) * smoothstep(0.05, 0.25, along) * smoothstep(0.75, 0.3, along);

        float turb = noise(vec2(vUv.x * 8.0, along * 12.0 - uTime * 14.0));
        float core = pow(1.0 - along, 1.6);
        float body = core * (0.55 + turb * 0.7);

        vec3 hot = vec3(1.0, 0.86, 0.72);
        vec3 blue = vec3(0.42, 0.62, 1.0);
        vec3 c = mix(blue, hot, core);
        c += vec3(1.0, 0.78, 0.5) * diamonds * 2.4;

        float a = (body + diamonds * 0.8) * uPower;
        a *= smoothstep(0.0, 0.06, along);
        if (a < 0.004) discard;
        gl_FragColor = vec4(c * (2.4 + uPower * 5.0) * a, a);
      }
    `,
  });
  const flameL = new THREE.Mesh(flameGeo, flameMat);
  flameL.position.set(0.7, -0.05, 7.4);
  flameL.frustumCulled = false;
  const flameR = new THREE.Mesh(flameGeo, flameMat);
  flameR.position.set(-0.7, -0.05, 7.4);
  flameR.frustumCulled = false;
  group.add(flameL, flameR);

  // ---- wingtip vortices ----
  const trailGeo = new THREE.CylinderGeometry(0.06, 0.5, 60, 6, 1, true);
  trailGeo.rotateX(Math.PI / 2);
  trailGeo.translate(0, 0, 30);
  const trailMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0.0 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uOpacity;
      uniform float uTime;
      void main() {
        float along = vUv.y;
        // The vortex core condenses just behind the wing and dissipates.
        float a = smoothstep(0.0, 0.06, along) * pow(1.0 - along, 1.4);
        float wisp = 0.7 + 0.3 * sin(along * 40.0 + uTime * 6.0);
        gl_FragColor = vec4(vec3(0.92, 0.94, 0.98), a * uOpacity * wisp * 0.5);
      }
    `,
  });
  const trailL = new THREE.Mesh(trailGeo, trailMat);
  trailL.position.set(7.0, -0.15, 3.4);
  trailL.frustumCulled = false;
  const trailR = new THREE.Mesh(trailGeo, trailMat);
  trailR.position.set(-7.0, -0.15, 3.4);
  trailR.frustumCulled = false;
  group.add(trailL, trailR);

  // Navigation strobes.
  const strobeGeo = new THREE.SphereGeometry(0.12, 6, 5);
  const strobeMatR = new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false });
  const strobeMatG = new THREE.MeshBasicMaterial({ color: 0x2aff55, toneMapped: false });
  const strobeL = new THREE.Mesh(strobeGeo, strobeMatR);
  strobeL.position.set(6.9, -0.1, 3.5);
  const strobeR = new THREE.Mesh(strobeGeo, strobeMatG);
  strobeR.position.set(-6.9, -0.1, 3.5);
  group.add(strobeL, strobeR);

  let burner = 0.4;
  let elapsed = 0;

  return {
    group,
    flybyPlayed: false,
    setAfterburner(amount: number): void {
      burner = amount;
    },
    update(dt: number, _position: THREE.Vector3, velocity: THREE.Vector3): void {
      elapsed += dt;
      flameMat.uniforms.uTime.value = elapsed;
      flameMat.uniforms.uPower.value = THREE.MathUtils.damp(
        flameMat.uniforms.uPower.value as number, burner, 4, dt,
      );
      trailMat.uniforms.uTime.value = elapsed;
      // Vortices only condense at speed and under load.
      const load = THREE.MathUtils.clamp(velocity.length() / 260, 0, 1);
      trailMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        trailMat.uniforms.uOpacity.value as number, load * 0.85, 3, dt,
      );
      const strobe = Math.sin(elapsed * 9) > 0.75 ? 1 : 0.08;
      strobeMatR.color.setRGB(strobe, 0.16 * strobe, 0.1 * strobe);
      strobeMatG.color.setRGB(0.16 * strobe, strobe, 0.33 * strobe);
    },
    dispose(): void {
      bodyGeo.dispose();
      nozzleGeo.dispose();
      flameGeo.dispose();
      flameMat.dispose();
      trailGeo.dispose();
      trailMat.dispose();
      strobeGeo.dispose();
      strobeMatR.dispose();
      strobeMatG.dispose();
    },
  };
}
