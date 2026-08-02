import * as THREE from 'three';
import { getMaterials } from './Materials';
import { anchor, enginePlume, glowDisc, RunningLights, type Anchors, type Plume } from './ShipCommon';
import {
  boxAt,
  frustumBox,
  greebleInstances,
  mergeParts,
  parametricSurface,
  scatterOnPlane,
  windowStrip,
} from './Greeble';
import { rng } from '../core/Rng';
import type { QualitySettings } from '../core/Quality';
import { clamp, damp } from '../core/MathX';

/**
 * The Imperial destroyer: a 1600 unit dagger.
 *
 * The silhouette is the whole point, so the hull is a clean lofted wedge and
 * all the noise lives in instanced greeble, trenches and the superstructure.
 * Local frame matches every other ship: nose at -Z, stern at +Z.
 */

const LENGTH = 1600;
const HALF_LEN = LENGTH / 2;
const STERN_HALF_WIDTH = 495;
const NOSE_HALF_WIDTH = 6;

/** Plan half-width as a function of normalised nose→stern parameter. */
const halfWidth = (t: number): number => NOSE_HALF_WIDTH + (STERN_HALF_WIDTH - NOSE_HALF_WIDTH) * t;
const topY = (t: number): number => 6 + 96 * Math.pow(t, 0.94);
const botY = (t: number): number => -4 - 58 * Math.pow(t, 1.15);
const zAt = (t: number): number => -HALF_LEN + LENGTH * t;
export const destroyerParamAtZ = (z: number): number => clamp((z + HALF_LEN) / LENGTH, 0, 1);

export interface Turret {
  root: THREE.Group;
  yoke: THREE.Group;
  barrels: THREE.Group;
  muzzles: THREE.Object3D[];
  side: number;
}

export class StarDestroyer {
  readonly root = new THREE.Group();
  readonly anchors: Anchors = {};
  readonly length = LENGTH;
  readonly turrets: Turret[] = [];
  readonly ventralTurrets: Turret[] = [];

  private plumes: Plume[] = [];
  private glows: THREE.Mesh[] = [];
  private navLights: RunningLights;
  private engineLights: THREE.PointLight[] = [];
  private hangarLight: THREE.PointLight;
  private windowMat: THREE.MeshBasicMaterial;
  private tractorCone: THREE.Mesh;
  private tractorMat: THREE.ShaderMaterial;

  enginePower = 1;
  /** 0..1 strength of the tractor beam reaching down to the captured ship. */
  tractorBeam = 0;

  constructor(quality: QualitySettings) {
    const M = getMaterials();
    const r = rng('star-destroyer');
    this.root.name = 'StarDestroyer';

    const seg = quality.name === 'low' ? 24 : 48;

    // ------------------------------------------------------- hull surfaces
    const dorsal = parametricSurface(
      seg,
      12,
      (u, v, out) => {
        const w = halfWidth(u);
        out.set((v * 2 - 1) * w, topY(u), zAt(u));
      },
      [10, 4],
      true,
    );
    const ventral = parametricSurface(
      seg,
      12,
      (u, v, out) => {
        const w = halfWidth(u) * 0.72;
        out.set((v * 2 - 1) * w, botY(u), zAt(u));
      },
      [8, 3],
      false,
    );
    const sideL = parametricSurface(
      seg,
      3,
      (u, v, out) => {
        const wTop = halfWidth(u);
        const wBot = wTop * 0.72;
        out.set(-(wTop + (wBot - wTop) * v), topY(u) + (botY(u) - topY(u)) * v, zAt(u));
      },
      [16, 1],
      false,
    );
    const sideR = parametricSurface(
      seg,
      3,
      (u, v, out) => {
        const wTop = halfWidth(u);
        const wBot = wTop * 0.72;
        out.set(wTop + (wBot - wTop) * v, topY(u) + (botY(u) - topY(u)) * v, zAt(u));
      },
      [16, 1],
      true,
    );
    const sternCap = parametricSurface(
      3,
      3,
      (u, v, out) => {
        const w = halfWidth(1) * (1 - v * 0.28);
        out.set((u * 2 - 1) * w, topY(1) + (botY(1) - topY(1)) * v, HALF_LEN);
      },
      [8, 3],
      false,
    );

    const hull = new THREE.Mesh(
      mergeParts([dorsal, ventral, sideL, sideR, sternCap]),
      M.imperialHull,
    );
    hull.name = 'hull';
    hull.castShadow = true;
    hull.receiveShadow = true;
    this.root.add(hull);

    // --------------------------------------------------- dorsal structure
    const trenchParts: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 26; i++) {
        const t = 0.14 + (i / 26) * 0.72;
        const z = zAt(t);
        const w = halfWidth(t);
        trenchParts.push(boxAt(w * 0.1, 7, LENGTH * 0.028, side * w * 0.62, topY(t) - 2.4, z));
      }
    }
    // Central spine and the stepped plates ahead of the superstructure.
    for (let i = 0; i < 22; i++) {
      const t = 0.1 + (i / 22) * 0.62;
      const z = zAt(t);
      const w = halfWidth(t);
      trenchParts.push(boxAt(w * 0.3, 5.5, LENGTH * 0.03, 0, topY(t) + 2.2, z));
    }
    const trenches = new THREE.Mesh(mergeParts(trenchParts), M.imperialDeep);
    trenches.name = 'trenches';
    this.root.add(trenches);

    // Raised dorsal plates flanking the spine give the wedge visible strata.
    const plateParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const t = 0.2 + (i / 16) * 0.55;
      const w = halfWidth(t);
      for (const side of [-1, 1]) {
        plateParts.push(
          boxAt(w * 0.24, 3.2, LENGTH * 0.032, side * w * 0.34, topY(t) + 1.6, zAt(t)),
        );
      }
    }
    const plates = new THREE.Mesh(mergeParts(plateParts), M.imperialHullDark);
    this.root.add(plates);

    // ------------------------------------------------------ superstructure
    const superGroup = new THREE.Group();
    superGroup.name = 'superstructure';
    this.root.add(superGroup);

    const baseT = 0.72;
    const baseZ = zAt(baseT);
    const baseY = topY(baseT);

    const l1 = new THREE.Mesh(frustumBox(196, 214, 168, 188, 46), M.imperialHull);
    l1.position.set(0, baseY - 2, baseZ + 100);
    superGroup.add(l1);

    const l2 = new THREE.Mesh(frustumBox(160, 176, 128, 140, 40), M.imperialHull);
    l2.position.set(0, baseY + 42, baseZ + 108);
    superGroup.add(l2);

    const tower = new THREE.Mesh(frustumBox(86, 74, 76, 62, 54), M.imperialHullDark);
    tower.position.set(0, baseY + 80, baseZ + 118);
    superGroup.add(tower);

    const bridge = new THREE.Mesh(frustumBox(96, 40, 88, 34, 22), M.imperialHull);
    bridge.position.set(0, baseY + 132, baseZ + 112);
    superGroup.add(bridge);
    this.anchors.bridge = anchor(superGroup, 'bridge', 0, baseY + 150, baseZ + 96);

    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(84, 7, 2.5), M.emissiveIce);
    bridgeGlass.position.set(0, baseY + 146, baseZ + 95);
    bridgeGlass.name = 'imperialBridgeGlass';
    superGroup.add(bridgeGlass);

    // Deflector domes.
    for (const side of [-1, 1]) {
      const domeStalk = new THREE.Mesh(new THREE.CylinderGeometry(8, 10, 24, 10), M.imperialTrim);
      domeStalk.position.set(side * 56, baseY + 152, baseZ + 130);
      superGroup.add(domeStalk);
      const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(22, 1), M.imperialHullDark);
      dome.position.set(side * 56, baseY + 176, baseZ + 130);
      superGroup.add(dome);
      const domeRing = new THREE.Mesh(new THREE.TorusGeometry(21, 2.2, 6, 18), M.imperialTrim);
      domeRing.rotation.x = Math.PI / 2;
      domeRing.position.copy(dome.position);
      superGroup.add(domeRing);
    }

    // Comms mast.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4, 46, 8), M.imperialTrim);
    mast.position.set(0, baseY + 168, baseZ + 122);
    superGroup.add(mast);

    superGroup.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });

    // ------------------------------------------------------------ engines
    const engineGroup = new THREE.Group();
    engineGroup.position.z = HALF_LEN + 4;
    this.root.add(engineGroup);
    this.anchors.engines = engineGroup;

    const bells: Array<[number, number, number]> = [
      [-172, 16, 82],
      [0, 18, 88],
      [172, 16, 82],
      [-296, -6, 38],
      [296, -6, 38],
      [-88, -26, 34],
      [88, -26, 34],
    ];
    const ringGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true);
    ringGeo.rotateX(Math.PI / 2);
    bells.forEach(([x, y, radius], i) => {
      const housing = new THREE.Mesh(ringGeo.clone(), M.imperialTrim);
      housing.scale.set(radius * 1.08, radius * 1.08, 34);
      housing.position.set(x, y, -18);
      engineGroup.add(housing);

      const disc = glowDisc(0xb9e4ff, radius * 2.1);
      disc.position.set(x, y, 2);
      engineGroup.add(disc);
      this.glows.push(disc);

      const plume = enginePlume(radius * 0.55, radius * 5.5, 0xe8f6ff, 0x4fb0ff);
      plume.mesh.position.set(x, y, 4);
      engineGroup.add(plume.mesh);
      this.plumes.push(plume);

      if (i < 3) {
        const light = new THREE.PointLight(0x8fc9ff, 0, 1400, 2);
        light.position.set(x, y, 60);
        engineGroup.add(light);
        this.engineLights.push(light);
      }
    });
    ringGeo.dispose();

    // ------------------------------------------------------------- hangar
    // The hangar mouth reads from below as a lit rectangle inside a raised
    // frame; it is the one warm accent on an otherwise grey underside.
    const hangarT = 0.86;
    const hangarZ = zAt(hangarT);
    const hangarY = botY(hangarT);
    const hangarFrame = new THREE.Mesh(
      mergeParts([
        boxAt(230, 12, 26, 0, hangarY - 4, hangarZ - 88),
        boxAt(230, 12, 26, 0, hangarY - 4, hangarZ + 88),
        boxAt(26, 12, 200, -114, hangarY - 4, hangarZ),
        boxAt(26, 12, 200, 114, hangarY - 4, hangarZ),
      ]),
      M.imperialTrim,
    );
    this.root.add(hangarFrame);
    const hangarWell = new THREE.Mesh(new THREE.BoxGeometry(204, 30, 178), M.imperialDeep);
    hangarWell.position.set(0, hangarY + 16, hangarZ);
    this.root.add(hangarWell);
    const hangarGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(196, 168),
      new THREE.MeshBasicMaterial({ color: 0xd97a2a, toneMapped: false }),
    );
    hangarGlow.rotation.x = Math.PI / 2;
    hangarGlow.position.set(0, hangarY + 0.4, hangarZ);
    hangarGlow.name = 'hangarGlow';
    this.root.add(hangarGlow);
    // Ventral trenches so the underside is not a bare plane in the reveal.
    const ventralDetail: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 22; i++) {
      const t = 0.2 + (i / 22) * 0.62;
      const w = halfWidth(t) * 0.72;
      for (const side of [-1, 1]) {
        ventralDetail.push(boxAt(w * 0.16, 6, LENGTH * 0.03, side * w * 0.5, botY(t) + 2, zAt(t)));
      }
      ventralDetail.push(boxAt(w * 0.2, 5, LENGTH * 0.026, 0, botY(t) - 2, zAt(t)));
    }
    this.root.add(new THREE.Mesh(mergeParts(ventralDetail), M.imperialDeep));
    this.hangarLight = new THREE.PointLight(0xffa64a, 0, 320, 2);
    this.hangarLight.position.set(0, hangarY + 6, hangarZ);
    this.root.add(this.hangarLight);
    this.anchors.hangar = anchor(this.root, 'hangar', 0, hangarY - 6, hangarZ);

    // ------------------------------------------------------------ windows
    this.windowMat = new THREE.MeshBasicMaterial({ color: 0xbfe4ff, toneMapped: false });
    const winPos: THREE.Vector3[] = [];
    for (let i = 0; i < 90; i++) {
      const t = 0.4 + r.next() * 0.55;
      const w = halfWidth(t);
      const side = r.bool() ? 1 : -1;
      winPos.push(new THREE.Vector3(side * (w * 0.86 + 1), topY(t) - r.range(6, 34), zAt(t)));
    }
    const winL = windowStrip(
      winPos.filter((p) => p.x < 0),
      new THREE.Vector2(5, 1.4),
      this.windowMat,
      new THREE.Vector3(-1, 0, 0),
    );
    const winR = windowStrip(
      winPos.filter((p) => p.x > 0),
      new THREE.Vector2(5, 1.4),
      this.windowMat,
      new THREE.Vector3(1, 0, 0),
    );
    this.root.add(winL, winR);

    // ----------------------------------------------------------- greebles
    const count = Math.round(760 * quality.greebleScale);
    const dorsalGreeble = scatterOnPlane(r.fork('dorsal'), {
      count,
      map: (u, v) => {
        const t = 0.08 + (v * 0.5 + 0.5) * 0.84;
        const w = halfWidth(t);
        const x = u * w * 0.94;
        // Keep the superstructure footprint and the central spine clear.
        if (t > 0.68 && Math.abs(x) < 210 && t < 0.95) return null;
        if (Math.abs(x) < w * 0.18) return null;
        return new THREE.Vector3(x, topY(t) + 0.6, zAt(t));
      },
      normal: new THREE.Vector3(0, 1, 0),
      sizeRange: [3, 16],
      heightRange: [0.8, 4.2],
      elongation: 2.2,
    });
    this.root.add(greebleInstances(dorsalGreeble, M.imperialHullDark, 'destroyerGreeble'));

    const ventralGreeble = scatterOnPlane(r.fork('ventral'), {
      count: Math.round(count * 0.5),
      map: (u, v) => {
        const t = 0.14 + (v * 0.5 + 0.5) * 0.78;
        const w = halfWidth(t) * 0.72;
        const x = u * w * 0.92;
        if (t > 0.78 && Math.abs(x) < 110) return null;
        return new THREE.Vector3(x, botY(t) - 0.6, zAt(t));
      },
      normal: new THREE.Vector3(0, -1, 0),
      sizeRange: [4, 18],
      heightRange: [0.4, 1.7],
      elongation: 2.4,
    });
    this.root.add(greebleInstances(ventralGreeble, M.imperialHullDark, 'destroyerVentralGreeble'));

    // ------------------------------------------------------------ turrets
    const turretSpots: Array<[number, number]> = [
      [0.42, 0.66],
      [0.52, 0.74],
      [0.62, 0.58],
      [0.36, 0.5],
      [0.7, 0.8],
    ];
    for (const [t, lateral] of turretSpots) {
      for (const side of [-1, 1]) {
        const w = halfWidth(t);
        const turret = this.buildTurret(M, side);
        turret.root.position.set(side * w * lateral, topY(t) + 1.5, zAt(t));
        this.root.add(turret.root);
        this.turrets.push(turret);
      }
    }

    // Ventral batteries — these are the ones that can actually bear on a ship
    // running below the wedge, so the chase fires from here.
    const ventralSpots: Array<[number, number]> = [
      [0.34, 0.42],
      [0.5, 0.55],
      [0.66, 0.4],
    ];
    for (const [t, lateral] of ventralSpots) {
      for (const side of [-1, 1]) {
        const w = halfWidth(t) * 0.72;
        const turret = this.buildTurret(M, side);
        turret.root.position.set(side * w * lateral, botY(t) - 1.5, zAt(t));
        turret.root.rotation.z = Math.PI; // hang the mount upside down
        this.root.add(turret.root);
        this.turrets.push(turret);
        this.ventralTurrets.push(turret);
      }
    }

    // ------------------------------------------------------ running lights
    const navPositions: THREE.Vector3[] = [];
    const navColors: THREE.Color[] = [];
    for (let i = 0; i < 16; i++) {
      const t = 0.16 + (i / 16) * 0.8;
      const w = halfWidth(t);
      navPositions.push(new THREE.Vector3(-w - 2, topY(t) - 4, zAt(t)));
      navColors.push(new THREE.Color(0xff4a3a));
      navPositions.push(new THREE.Vector3(w + 2, topY(t) - 4, zAt(t)));
      navColors.push(new THREE.Color(0x54ff86));
    }
    this.navLights = new RunningLights(navPositions, navColors, 9);
    this.root.add(this.navLights.points);

    // -------------------------------------------------------- tractor beam
    this.tractorMat = new THREE.ShaderMaterial({
      uniforms: {
        intensity: { value: 0 },
        time: { value: 0 },
        color: { value: new THREE.Color(0x9fd0ff) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float intensity; uniform float time; uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float radial = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.4);
          float bands = 0.65 + 0.35 * sin(vUv.y * 60.0 - time * 6.0);
          float fade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - vUv.y * 0.35);
          float a = radial * bands * fade * intensity * 0.5;
          gl_FragColor = vec4(color * a * 1.6, a);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const coneGeo = new THREE.CylinderGeometry(26, 90, 1, 20, 1, true);
    coneGeo.translate(0, -0.5, 0);
    this.tractorCone = new THREE.Mesh(coneGeo, this.tractorMat);
    this.tractorCone.position.set(0, botY(0.8) - 2, zAt(0.8));
    this.tractorCone.visible = false;
    this.tractorCone.frustumCulled = false;
    this.root.add(this.tractorCone);
    this.anchors.tractorEmitter = anchor(this.root, 'tractorEmitter', 0, botY(0.8) - 2, zAt(0.8));

    // ------------------------------------------------------------ anchors
    this.anchors.nose = anchor(this.root, 'nose', 0, 0, -HALF_LEN - 8);
    this.anchors.stern = anchor(this.root, 'stern', 0, 20, HALF_LEN + 40);
    this.anchors.dorsalMid = anchor(this.root, 'dorsalMid', 0, topY(0.5) + 30, zAt(0.5));
    this.anchors.underNose = anchor(this.root, 'underNose', 0, botY(0.18) - 40, zAt(0.18));
    this.anchors.portFlank = anchor(this.root, 'portFlank', -halfWidth(0.6) - 60, 0, zAt(0.6));
    this.anchors.starboardFlank = anchor(
      this.root,
      'starboardFlank',
      halfWidth(0.6) + 60,
      0,
      zAt(0.6),
    );
  }

  private buildTurret(M: ReturnType<typeof getMaterials>, side: number): Turret {
    const root = new THREE.Group();
    root.name = 'turret';
    const base = new THREE.Mesh(new THREE.CylinderGeometry(11, 13, 5, 12), M.imperialTrim);
    root.add(base);

    const yoke = new THREE.Group();
    yoke.position.y = 3;
    root.add(yoke);

    const housing = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 18), M.imperialHullDark);
    housing.position.y = 3.4;
    yoke.add(housing);

    const barrels = new THREE.Group();
    barrels.position.set(0, 4.6, -6);
    yoke.add(barrels);

    const muzzles: THREE.Object3D[] = [];
    const barrelGeo = new THREE.CylinderGeometry(1.5, 1.9, 26, 8);
    barrelGeo.rotateX(-Math.PI / 2);
    barrelGeo.translate(0, 0, -13);
    for (const dx of [-4.2, 4.2]) {
      const b = new THREE.Mesh(barrelGeo.clone(), M.imperialTrim);
      b.position.x = dx;
      barrels.add(b);
      const muzzle = new THREE.Object3D();
      muzzle.position.set(dx, 0, -26);
      barrels.add(muzzle);
      muzzles.push(muzzle);
    }
    barrelGeo.dispose();

    return { root, yoke, barrels, muzzles, side };
  }

  /** Smoothly slew every turret toward a world-space target. */
  aimTurretsAt(worldTarget: THREE.Vector3, dt: number, snap = false): void {
    const local = new THREE.Vector3();
    for (const turret of this.turrets) {
      local.copy(worldTarget);
      turret.root.worldToLocal(local);
      const yaw = Math.atan2(local.x, -local.z);
      const pitch = clamp(Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.28, 1.15);
      if (snap) {
        turret.yoke.rotation.y = yaw;
        turret.barrels.rotation.x = pitch;
      } else {
        turret.yoke.rotation.y = damp(turret.yoke.rotation.y, yaw, 2.6, dt);
        turret.barrels.rotation.x = damp(turret.barrels.rotation.x, pitch, 2.6, dt);
      }
    }
  }

  update(t: number, dt: number): void {
    const power = clamp(this.enginePower, 0, 1.4);
    this.plumes.forEach((p, i) => {
      p.material.uniforms.intensity.value = power * 0.55;
      p.material.uniforms.time.value = t + i * 0.21;
      p.mesh.scale.z = 0.5 + power * 0.7;
    });
    this.glows.forEach((g, i) => {
      const base = g.userData.baseScale ?? (g.userData.baseScale = g.scale.x);
      g.scale.setScalar(base * (0.5 + power * 0.6) * (1 + 0.02 * Math.sin(t * 9 + i)));
      (g.material as THREE.MeshBasicMaterial).opacity = clamp(0.3 + power, 0, 1);
    });
    this.engineLights.forEach((l) => (l.intensity = power * 260000));
    this.hangarLight.intensity = 40000;
    this.navLights.update(t);
    this.windowMat.color.setRGB(0.72, 0.88, 1);

    this.tractorMat.uniforms.intensity.value = damp(
      this.tractorMat.uniforms.intensity.value as number,
      this.tractorBeam,
      3,
      dt,
    );
    this.tractorMat.uniforms.time.value = t;
    this.tractorCone.visible = (this.tractorMat.uniforms.intensity.value as number) > 0.01;
  }

  /** Stretch the tractor cone so it lands on a world point. */
  aimTractor(worldTarget: THREE.Vector3): void {
    const local = this.root.worldToLocal(worldTarget.clone());
    const origin = this.tractorCone.position;
    const dir = local.clone().sub(origin);
    const len = Math.max(1, dir.length());
    this.tractorCone.scale.set(1, len, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      dir.clone().normalize(),
    );
    this.tractorCone.quaternion.copy(q);
  }
}
