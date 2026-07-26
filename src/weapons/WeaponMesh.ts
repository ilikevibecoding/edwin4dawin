import * as THREE from 'three';
import type { WeaponDef } from './WeaponDefs';
import type { MaterialLibrary } from '../render/Materials';
import { mergeGeometries } from '../world/Level';

/**
 * Procedural weapon geometry.
 *
 * Built from primitives at roughly 1:1 real-world dimensions. The parts that
 * matter for a first-person view are the ones the player stares at for hours:
 * the top of the receiver, the optic, the handguard rail, and the ejection
 * port. Those get the vertex budget; the stock and the far end of the barrel
 * get much less because they are barely on screen.
 */

export interface WeaponModel {
  group: THREE.Group;
  muzzle: THREE.Object3D;
  ejectionPort: THREE.Object3D;
  opticCentre: THREE.Object3D;
  sprintPose: { position: THREE.Vector3; rotation: THREE.Euler };
  sprintBlend: number;
  onFire(): void;
  setMagazineVisible(v: boolean): void;
  setBoltBack(t: number): void;
  update(dt: number, ads: number, elapsed: number): void;
  dispose(): void;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
const _e = new THREE.Euler();

interface Part {
  geo: THREE.BufferGeometry;
  x: number; y: number; z: number;
  rx?: number; ry?: number; rz?: number;
  sx?: number; sy?: number; sz?: number;
}

function collect(parts: Part[]): THREE.BufferGeometry | null {
  const list: THREE.BufferGeometry[] = [];
  for (const p of parts) {
    const g = p.geo.clone();
    if (!g.getAttribute('uv')) {
      // Give unwrapped primitives a planar UV so the material still reads.
      const pos = g.getAttribute('position') as THREE.BufferAttribute;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = pos.getX(i) * 3;
        uv[i * 2 + 1] = pos.getY(i) * 3;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    _e.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1);
    _m.compose(_p.set(p.x, p.y, p.z), _q, _s);
    g.applyMatrix4(_m);
    list.push(g);
  }
  const merged = mergeGeometries(list);
  for (const g of list) g.dispose();
  return merged;
}

function roundedBox(w: number, h: number, d: number, r: number, seg = 2): THREE.BufferGeometry {
  // Cheap rounded box: a box with its corner vertices pulled in. At view-model
  // scale a full bevel is wasted geometry, but the softened silhouette edge is
  // very visible because it catches a specular highlight.
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const hw = w / 2, hh = h / 2, hd = d / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(x) / hw, ay = Math.abs(y) / hh, az = Math.abs(z) / hd;
    const edges = (ax > 0.98 ? 1 : 0) + (ay > 0.98 ? 1 : 0) + (az > 0.98 ? 1 : 0);
    if (edges >= 2) {
      pos.setXYZ(
        i,
        x - Math.sign(x) * Math.min(r, hw * 0.4) * (ax > 0.98 ? 1 : 0),
        y - Math.sign(y) * Math.min(r, hh * 0.4) * (ay > 0.98 ? 1 : 0),
        z - Math.sign(z) * Math.min(r, hd * 0.4) * (az > 0.98 ? 1 : 0),
      );
    }
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Picatinny rail: a row of slots along +Z. */
function railGeometry(length: number, width: number): THREE.BufferGeometry {
  const parts: Part[] = [];
  const base = new THREE.BoxGeometry(width, 0.004, length);
  parts.push({ geo: base, x: 0, y: 0, z: 0 });
  const slots = Math.floor(length / 0.0102);
  const tooth = new THREE.BoxGeometry(width * 0.92, 0.005, 0.0056);
  for (let i = 0; i < slots; i++) {
    parts.push({ geo: tooth, x: 0, y: 0.0045, z: -length / 2 + 0.005 + i * 0.0102 });
  }
  const g = collect(parts)!;
  base.dispose();
  tooth.dispose();
  return g;
}

export function buildWeaponModel(def: WeaponDef, materials: MaterialLibrary): WeaponModel {
  const group = new THREE.Group();
  group.name = `weapon:${def.id}`;

  const metal = materials.get('gunmetal', { scale: 1 });
  const polymer = materials.get(def.class === 'PISTOL' ? 'polymerBlack' : 'polymerBlack', { scale: 1 });
  const polymerAccent = materials.get('polymerTan', { scale: 1 });

  const isPistol = def.class === 'PISTOL';
  const barrelLen = isPistol ? 0.11 : def.class === 'SMG' ? 0.19 : def.class === 'DMR' ? 0.42 : 0.31;
  const receiverLen = isPistol ? 0.16 : 0.24;

  // ---------------------------------------------------------------- metal --
  const metalParts: Part[] = [];
  // Barrel
  const barrel = new THREE.CylinderGeometry(0.0072, 0.0078, barrelLen, 12);
  barrel.rotateX(Math.PI / 2);
  metalParts.push({ geo: barrel, x: 0, y: isPistol ? 0.004 : 0.007, z: -receiverLen / 2 - barrelLen / 2 });

  // Muzzle device
  if (!isPistol) {
    const brake = new THREE.CylinderGeometry(0.0125, 0.0125, 0.052, 12);
    brake.rotateX(Math.PI / 2);
    metalParts.push({ geo: brake, x: 0, y: 0.007, z: -receiverLen / 2 - barrelLen - 0.02 });
    // Compensator ports.
    const port = new THREE.BoxGeometry(0.027, 0.004, 0.006);
    for (let i = 0; i < 3; i++) {
      metalParts.push({ geo: port, x: 0, y: 0.017, z: -receiverLen / 2 - barrelLen - 0.006 - i * 0.013 });
    }
    brake.dispose();
    port.dispose();
  }

  // Receiver
  const upper = roundedBox(0.036, 0.038, receiverLen, 0.004);
  metalParts.push({ geo: upper, x: 0, y: 0.006, z: 0 });
  const lower = roundedBox(0.032, 0.03, receiverLen * 0.82, 0.003);
  metalParts.push({ geo: lower, x: 0, y: -0.026, z: 0.006 });

  // Top rail
  const topRail = railGeometry(receiverLen * (isPistol ? 0.5 : 0.95), 0.0205);
  metalParts.push({ geo: topRail, x: 0, y: 0.0265, z: isPistol ? -0.01 : 0 });

  // Ejection port + brass deflector
  const port = new THREE.BoxGeometry(0.004, 0.019, 0.045);
  metalParts.push({ geo: port, x: 0.019, y: 0.008, z: 0.01 });
  const deflector = new THREE.BoxGeometry(0.006, 0.016, 0.02);
  metalParts.push({ geo: deflector, x: 0.019, y: 0.014, z: 0.038, ry: -0.35 });

  // Charging handle
  if (!isPistol) {
    const ch = new THREE.BoxGeometry(0.05, 0.008, 0.014);
    metalParts.push({ geo: ch, x: 0, y: 0.019, z: receiverLen / 2 + 0.008 });
    ch.dispose();
  }

  // Trigger + guard
  const trigger = new THREE.BoxGeometry(0.005, 0.017, 0.006);
  metalParts.push({ geo: trigger, x: 0, y: -0.046, z: 0.028, rx: 0.2 });
  const guardTorus = new THREE.TorusGeometry(0.018, 0.0028, 5, 12, Math.PI);
  guardTorus.rotateY(Math.PI / 2);
  metalParts.push({ geo: guardTorus, x: 0, y: -0.046, z: 0.03, rz: Math.PI });

  // Iron sights (folded when an optic is present)
  const frontPost = new THREE.BoxGeometry(0.003, 0.014, 0.003);
  metalParts.push({ geo: frontPost, x: 0, y: 0.036, z: -receiverLen / 2 - barrelLen * 0.62 });
  const frontHood = new THREE.CylinderGeometry(0.009, 0.009, 0.014, 10, 1, true);
  frontHood.rotateX(Math.PI / 2);
  metalParts.push({ geo: frontHood, x: 0, y: 0.035, z: -receiverLen / 2 - barrelLen * 0.62 });

  const metalGeo = collect(metalParts);
  barrel.dispose();
  upper.dispose();
  lower.dispose();
  topRail.dispose();
  port.dispose();
  deflector.dispose();
  trigger.dispose();
  guardTorus.dispose();
  frontPost.dispose();
  frontHood.dispose();

  const metalMesh = new THREE.Mesh(metalGeo!, metal);
  metalMesh.castShadow = false;
  metalMesh.receiveShadow = false;
  group.add(metalMesh);

  // -------------------------------------------------------------- polymer --
  const polyParts: Part[] = [];
  // Pistol grip: angled, with a palm swell.
  const grip = roundedBox(0.028, 0.088, 0.036, 0.006);
  polyParts.push({ geo: grip, x: 0, y: -0.082, z: 0.058, rx: -0.28 });

  if (!isPistol) {
    // Handguard
    const hg = roundedBox(0.042, 0.042, barrelLen * 0.78, 0.006);
    polyParts.push({ geo: hg, x: 0, y: 0.004, z: -receiverLen / 2 - barrelLen * 0.42 });
    hg.dispose();

    // Stock
    const stockTube = new THREE.CylinderGeometry(0.011, 0.011, 0.11, 10);
    stockTube.rotateX(Math.PI / 2);
    polyParts.push({ geo: stockTube, x: 0, y: -0.004, z: receiverLen / 2 + 0.055 });
    const stockBody = roundedBox(0.034, 0.058, 0.086, 0.008);
    polyParts.push({ geo: stockBody, x: 0, y: -0.016, z: receiverLen / 2 + 0.082 });
    const buttPad = roundedBox(0.036, 0.07, 0.014, 0.006);
    polyParts.push({ geo: buttPad, x: 0, y: -0.018, z: receiverLen / 2 + 0.128 });
    stockTube.dispose();
    stockBody.dispose();
    buttPad.dispose();

    // Angled foregrip
    const fg = roundedBox(0.022, 0.05, 0.026, 0.005);
    polyParts.push({ geo: fg, x: 0, y: -0.028, z: -receiverLen / 2 - barrelLen * 0.5, rx: 0.55 });
    fg.dispose();
  }
  const polyGeo = collect(polyParts);
  grip.dispose();
  const polyMesh = new THREE.Mesh(polyGeo!, polymer);
  group.add(polyMesh);

  // ------------------------------------------------------------ magazine --
  const magGroup = new THREE.Group();
  const magParts: Part[] = [];
  if (isPistol) {
    const mag = roundedBox(0.024, 0.09, 0.032, 0.004);
    magParts.push({ geo: mag, x: 0, y: -0.082, z: 0.058, rx: -0.28 });
    mag.dispose();
  } else {
    // Curved STANAG-style magazine built from three tapered segments.
    for (let i = 0; i < 3; i++) {
      const t = i / 2;
      const seg = roundedBox(0.024, 0.036, 0.03 - t * 0.002, 0.003);
      magParts.push({
        geo: seg,
        x: 0,
        y: -0.052 - i * 0.034,
        z: 0.006 + t * t * 0.018,
        rx: -t * 0.24,
      });
      seg.dispose();
    }
    const floorPlate = roundedBox(0.027, 0.008, 0.032, 0.002);
    magParts.push({ geo: floorPlate, x: 0, y: -0.132, z: 0.03, rx: -0.24 });
    floorPlate.dispose();
  }
  const magMesh = new THREE.Mesh(collect(magParts)!, polymerAccent);
  magGroup.add(magMesh);
  group.add(magGroup);

  // --------------------------------------------------------------- optic ---
  const opticGroup = new THREE.Group();
  const opticCentre = new THREE.Object3D();
  let reticleMesh: THREE.Mesh | null = null;
  let lensMesh: THREE.Mesh | null = null;

  if (def.optic !== 'iron') {
    const opticParts: Part[] = [];
    const isScope = def.optic === 'acog' || def.optic === 'sniper';
    const tubeLen = isScope ? 0.13 : 0.062;
    const tubeR = isScope ? 0.019 : 0.016;

    const body = new THREE.CylinderGeometry(tubeR, tubeR, tubeLen, 16);
    body.rotateX(Math.PI / 2);
    opticParts.push({ geo: body, x: 0, y: 0.052, z: -0.01 });

    // Objective bell for magnified optics.
    if (isScope) {
      const bell = new THREE.CylinderGeometry(0.026, tubeR, 0.036, 16);
      bell.rotateX(Math.PI / 2);
      opticParts.push({ geo: bell, x: 0, y: 0.052, z: -0.09 });
      bell.dispose();
      const turret = new THREE.CylinderGeometry(0.011, 0.011, 0.016, 12);
      opticParts.push({ geo: turret, x: 0, y: 0.072, z: -0.01 });
      opticParts.push({ geo: turret, x: 0.02, y: 0.052, z: -0.01, rz: Math.PI / 2 });
      turret.dispose();
    }

    // Mount
    const mount = roundedBox(0.024, 0.026, tubeLen * 0.6, 0.003);
    opticParts.push({ geo: mount, x: 0, y: 0.038, z: -0.01 });
    const throwLever = new THREE.BoxGeometry(0.03, 0.006, 0.012);
    opticParts.push({ geo: throwLever, x: 0.014, y: 0.032, z: 0.008 });

    const opticMesh = new THREE.Mesh(collect(opticParts)!, metal);
    opticGroup.add(opticMesh);
    body.dispose();
    mount.dispose();
    throwLever.dispose();

    // Lens: a slightly concave disc with a coloured coating. The anti-
    // reflective coating tint and the way it catches the sky is one of those
    // details that immediately reads as "real optic".
    const lensGeo = new THREE.CircleGeometry(tubeR * 0.88, 24);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1420,
      metalness: 0.1,
      roughness: 0.06,
      transmission: 0.55,
      thickness: 0.004,
      ior: 1.52,
      iridescence: 0.85,
      iridescenceIOR: 1.9,
      iridescenceThicknessRange: [180, 420],
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.set(0, 0.052, -0.01 - tubeLen / 2 + 0.002);
    opticGroup.add(lensMesh);

    // Reticle: emissive, always drawn on top of the lens, and only visible
    // from close to the optical axis — exactly like a real red dot.
    const reticleGeo = new THREE.PlaneGeometry(tubeR * 1.5, tubeR * 1.5);
    const reticleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(1.0, 0.13, 0.09) },
        uType: { value: def.optic === 'acog' ? 1 : def.optic === 'holo' ? 2 : 0 },
        uBrightness: { value: 3.6 },
        uParallax: { value: new THREE.Vector2() },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vViewDir;
        uniform vec3 uColor;
        uniform int uType;
        uniform float uBrightness;
        uniform vec2 uParallax;

        float dot2(vec2 p, float r) {
          return 1.0 - smoothstep(r * 0.6, r, length(p));
        }

        void main() {
          vec2 p = (vUv - 0.5) * 2.0 + uParallax;
          float a = 0.0;

          if (uType == 0) {
            // Red dot: a small core plus a soft halo.
            a = dot2(p, 0.09) + dot2(p, 0.26) * 0.16;
          } else if (uType == 1) {
            // Chevron.
            float d = abs(p.x) * 1.7 + p.y * 1.0 + 0.06;
            a = (1.0 - smoothstep(0.0, 0.07, abs(d))) * step(p.y, 0.02) * step(-0.34, p.y);
            a += dot2(p - vec2(0.0, -0.42), 0.05) * 0.8;
          } else {
            // Holographic ring with a centre dot.
            float r = length(p);
            a = (1.0 - smoothstep(0.03, 0.05, abs(r - 0.52))) * 0.85;
            a += dot2(p, 0.07);
            // Tick marks.
            float ang = atan(p.y, p.x);
            float ticks = step(0.96, abs(cos(ang * 2.0)));
            a += ticks * (1.0 - smoothstep(0.42, 0.5, r)) * (1.0 - smoothstep(0.0, 0.36, r)) * 0.0;
          }

          // Eyebox: the reticle disappears as the eye moves off axis.
          float axis = smoothstep(0.72, 0.985, vViewDir.z);
          a *= axis;
          if (a < 0.003) discard;
          gl_FragColor = vec4(uColor * uBrightness * a, a);
        }
      `,
    });
    reticleMesh = new THREE.Mesh(reticleGeo, reticleMat);
    reticleMesh.position.set(0, 0.052, -0.01 - tubeLen / 2 + 0.012);
    reticleMesh.renderOrder = 10;
    opticGroup.add(reticleMesh);

    opticCentre.position.set(0, 0.052, -0.01);
  } else {
    // Iron sights: a notch rear aligned with the front post.
    const rearParts: Part[] = [];
    const ring = new THREE.TorusGeometry(0.0068, 0.0016, 5, 14);
    rearParts.push({ geo: ring, x: 0, y: 0.034, z: receiverLen / 2 - 0.012 });
    const rearMesh = new THREE.Mesh(collect(rearParts)!, metal);
    opticGroup.add(rearMesh);
    ring.dispose();
    opticCentre.position.set(0, 0.034, 0);
  }
  group.add(opticGroup);
  group.add(opticCentre);

  // ---------------------------------------------------------------- hands --
  const hands = buildHands(def, materials);
  group.add(hands);

  // ---------------------------------------------------------- attachments --
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, isPistol ? 0.004 : 0.007, -receiverLen / 2 - barrelLen - (isPistol ? 0.005 : 0.046));
  group.add(muzzle);

  const ejectionPort = new THREE.Object3D();
  ejectionPort.position.set(0.022, 0.008, 0.012);
  group.add(ejectionPort);

  // ------------------------------------------------------------ behaviour --
  let boltOffset = 0;
  let boltTarget = 0;
  let heat = 0;

  const sprintPose = {
    position: new THREE.Vector3(
      def.hipPosition.x + 0.045,
      def.hipPosition.y - 0.06,
      def.hipPosition.z + 0.05,
    ),
    rotation: new THREE.Euler(-0.24, -0.62, 0.42, 'YXZ'),
  };

  const model: WeaponModel = {
    group,
    muzzle,
    ejectionPort,
    opticCentre,
    sprintPose,
    sprintBlend: 0,
    onFire(): void {
      boltOffset = 1;
      heat = Math.min(1, heat + 0.09);
    },
    setMagazineVisible(v: boolean): void {
      magGroup.visible = v;
    },
    setBoltBack(t: number): void {
      boltTarget = t;
    },
    update(dt: number, ads: number, elapsed: number): void {
      // Bolt cycling: snaps back instantly on fire, returns over the cycle.
      boltOffset = Math.max(boltTarget, boltOffset - dt * 22);
      metalMesh.position.z = boltOffset * 0.016;

      heat = Math.max(0, heat - dt * 0.32);
      // A hot barrel glows and shimmers; subtle, but it rewards sustained fire.
      const mat = metalMesh.material as THREE.MeshStandardMaterial;
      if (mat.emissive) {
        mat.emissive.setRGB(heat * 0.22, heat * 0.05, 0);
        mat.emissiveIntensity = heat * heat * 1.6;
      }

      if (reticleMesh) {
        const rm = reticleMesh.material as THREE.ShaderMaterial;
        // Reticle brightness tracks ADS so it does not bloom the whole screen
        // from the hip, and flickers minutely like a real emitter.
        rm.uniforms.uBrightness.value = (1.6 + ads * 3.4) * (0.97 + Math.sin(elapsed * 60) * 0.03);
      }
      if (lensMesh) {
        const lm = lensMesh.material as THREE.MeshPhysicalMaterial;
        lm.envMapIntensity = 1.4;
      }
      void ads;
    },
    dispose(): void {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
    },
  };

  return model;
}

/**
 * Gloved hands.
 *
 * Simplified but correctly proportioned: the trigger hand wraps the grip and
 * the support hand sits on the handguard. Both are static — animating fingers
 * procedurally at this fidelity costs more than it returns, whereas hands in
 * the wrong *place* is immediately noticeable.
 */
function buildHands(def: WeaponDef, materials: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  const glove = materials.get('fabricTarp', { scale: 0.4, roughness: 0.92 });
  const isPistol = def.class === 'PISTOL';
  const barrelLen = isPistol ? 0.11 : def.class === 'SMG' ? 0.19 : def.class === 'DMR' ? 0.42 : 0.31;

  const makeHand = (
    x: number, y: number, z: number,
    rx: number, ry: number, rz: number,
    scale: number,
  ): void => {
    const parts: Part[] = [];
    // Palm
    const palm = roundedBox(0.052, 0.082, 0.038, 0.012);
    parts.push({ geo: palm, x: 0, y: 0, z: 0 });
    // Fingers wrapping forward.
    for (let i = 0; i < 4; i++) {
      const fx = -0.018 + i * 0.012;
      const len = 0.046 - Math.abs(i - 1.5) * 0.005;
      const finger = new THREE.CapsuleGeometry(0.0062, len, 3, 6);
      finger.rotateX(Math.PI / 2);
      parts.push({ geo: finger, x: fx, y: -0.016, z: -0.03, rx: 0.9 - i * 0.06 });
      finger.dispose();
    }
    // Thumb
    const thumb = new THREE.CapsuleGeometry(0.0075, 0.038, 3, 6);
    thumb.rotateZ(Math.PI / 2);
    parts.push({ geo: thumb, x: 0.026, y: 0.016, z: -0.012, ry: 0.5, rz: -0.4 });
    // Forearm, cut off at the screen edge.
    const arm = new THREE.CylinderGeometry(0.032, 0.042, 0.2, 10);
    arm.rotateX(Math.PI / 2);
    parts.push({ geo: arm, x: 0, y: 0.006, z: 0.12 });

    const mesh = new THREE.Mesh(collect(parts)!, glove);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz, 'YXZ');
    mesh.scale.setScalar(scale);
    g.add(mesh);

    palm.dispose();
    thumb.dispose();
    arm.dispose();
  };

  // Trigger hand on the grip.
  makeHand(0.026, -0.088, 0.078, -0.34, 0.22, -0.16, 1);
  // Support hand on the handguard (or wrapping the pistol grip).
  if (isPistol) {
    makeHand(-0.03, -0.082, 0.086, -0.3, -0.3, 0.3, 0.96);
  } else {
    makeHand(-0.028, -0.03, -0.16 - barrelLen * 0.18, -0.55, -0.34, 0.42, 0.98);
  }

  return g;
}
