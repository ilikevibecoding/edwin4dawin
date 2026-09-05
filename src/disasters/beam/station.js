// Battle station for the beam disaster: an original, Death-Star-inspired sphere built from blocks. The hull is
// a greedy-meshed voxel sphere (stationGeometry.js) with an equatorial trench (dark floor, running lights,
// lighter protruding lips), a large concave superlaser crater in the upper hemisphere (raised rim, dark
// panelled bowl, a green centre emitter and eight rim emitter nodes) and faint hemisphere seams. The shader
// (stationShaders.js) textures every voxel face per block: staggered panel plates with grooves, scattered
// window specks that glow at night, a quantised sun-side lambert with Minecraft face tones, and capped fog.
//
// Two draw calls: the body (one indexed geometry, one ShaderMaterial) and the additive emitter halos.
//
// Model frame: origin at the centre, +Y = station north (trench in the XZ plane), dish axis in the YZ plane
// DISH_LAT above the equator. set() rotates the model so the dish axis points along the aim direction and
// rolls it so the station's north stays in the vertical plane through the aim (trench level, not tilted).
import * as THREE from 'three';
import { SHARED } from '../../entityMaterial.js';
import { stationLayout, buildBodyGeometry, buildHaloGeometry, ringPoint } from './stationGeometry.js';
import { BODY_VERT, BODY_FRAG, HALO_VERT, HALO_FRAG } from './stationShaders.js';

export const STATION_RADIUS = 64;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _m4 = new THREE.Matrix4(), _m4b = new THREE.Matrix4();
const FALLBACK_SUN = new THREE.Vector3(0.45, 0.8, -0.4).normalize();

export class BattleStation {
  // opts: radius (blocks, default 64), voxel (block size of one voxel; auto: 1 up to R 80, else 2),
  //       sky (object with sunDir, default window.game.sky), sunDir (Vector3 overriding sky)
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.radius = opts.radius ?? STATION_RADIUS;
    const voxel = opts.voxel ?? (this.radius > 80 ? 2 : 1);
    this.layout = stationLayout(this.radius, voxel);
    this.sky = opts.sky ?? (typeof window !== 'undefined' && window.game ? window.game.sky : null);
    this.sunDir = opts.sunDir ?? null;

    const built = buildBodyGeometry(this.layout);
    this.quads = built.quads;
    this.bodyGeometry = built.geometry;
    this.haloGeometry = buildHaloGeometry(this.layout);
    const lay = this.layout;
    const common = {
      uPower: { value: 0 }, uHeat: { value: 0 }, uCharge: { value: 0 }, uFiring: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 },
      uFogFar: SHARED.uFogFar,
    };
    this.bodyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...common,
        uRot: { value: new THREE.Matrix3() }, uLightDir: { value: FALLBACK_SUN.clone() },
        uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFlash: SHARED.uFlash,
        uRadius: { value: this.radius }, uTrenchR: { value: this.radius - lay.trenchDepth },
        uDish: { value: lay.D.clone() }, uDishU: { value: lay.U.clone() }, uDishV: { value: lay.V.clone() }, uDishC: { value: lay.C.clone() },
      },
      vertexShader: BODY_VERT, fragmentShader: BODY_FRAG, side: THREE.FrontSide, transparent: false, depthWrite: true,
    });
    // the halo material shares the per-frame uniform objects with the body (same values, set once)
    this.haloMaterial = new THREE.ShaderMaterial({
      uniforms: { uCharge: common.uCharge, uFiring: common.uFiring, uAlpha: common.uAlpha, uTime: common.uTime, uFogFar: SHARED.uFogFar },
      vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.u = this.bodyMaterial.uniforms;

    this.group = new THREE.Group();
    this.body = new THREE.Mesh(this.bodyGeometry, this.bodyMaterial);
    this.body.renderOrder = 3;           // below the clouds (5) so they still occlude it while it fades
    this.halo = new THREE.Mesh(this.haloGeometry, this.haloMaterial);
    this.halo.renderOrder = 9;
    this.group.add(this.body, this.halo);
    this.group.visible = false;
    scene.add(this.group);

    // constant model basis (dish axis, north projected perpendicular to it, their cross) - see set()
    this.aim = new THREE.Vector3(0, -1, 0);
    this.quat = new THREE.Quaternion();
    this.pos = new THREE.Vector3();
    this.lastUp = new THREE.Vector3(0, 0, -1);
    const e0 = lay.D.clone();
    const e1 = new THREE.Vector3(0, 1, 0).addScaledVector(e0, -e0.y).normalize();
    const e2 = new THREE.Vector3().crossVectors(e0, e1);
    this.modelBasisT = new THREE.Matrix4().makeBasis(e0, e1, e2).transpose();
    this.set(0, 0, 0, 0, -1, 0, { alpha: 0 });
  }

  // Place the centre at (x,y,z), point the dish along the unit direction (ax,ay,az) and apply the visual state:
  // { power, heat, charge, firing, alpha (0..1 each), time (s) }.
  set(x, y, z, ax, ay, az, state = {}) {
    this.pos.set(x, y, z);
    this.group.position.copy(this.pos);
    const A = this.aim.set(ax, ay, az);
    if (A.lengthSq() < 1e-8) A.set(0, -1, 0); else A.normalize();
    // world basis: aim, world-up projected perpendicular to the aim (keeps the trench level), their cross
    const up = _a.set(0, 1, 0).addScaledVector(A, -A.y);
    if (up.lengthSq() < 1e-6) up.copy(this.lastUp).addScaledVector(A, -this.lastUp.dot(A));
    up.normalize();
    this.lastUp.copy(up);
    const right = _b.crossVectors(A, up);
    _m4.makeBasis(A, up, right).multiply(this.modelBasisT);
    this.quat.setFromRotationMatrix(_m4);
    this.group.quaternion.copy(this.quat);
    this.u.uRot.value.setFromMatrix4(_m4b.makeRotationFromQuaternion(this.quat));

    const u = this.u;
    u.uPower.value = state.power ?? 0; u.uHeat.value = state.heat ?? 0; u.uCharge.value = state.charge ?? 0;
    u.uFiring.value = state.firing ?? 0; u.uTime.value = state.time ?? 0;
    const alpha = Math.min(1, Math.max(0, state.alpha ?? 1));
    u.uAlpha.value = alpha;
    this.group.visible = alpha > 0.004;
    this.bodyMaterial.transparent = alpha < 0.995;   // opaque pass when fully visible (correct cloud occlusion)
    this.updateLight();
  }

  // Sun-side light direction: the sun's azimuth by day, the moon's (opposite) by night, blended through dusk.
  // The elevation is flattened so the terminator crosses the visible (lower) half instead of hiding on top.
  updateLight() {
    const L = this.u.uLightDir.value;
    const s = this.sunDir || (this.sky && this.sky.sunDir) || null;
    if (!s) { L.copy(FALLBACK_SUN); return; }
    const k = smooth(-0.12, 0.12, s.y) * 2 - 1;
    L.set(s.x * k, Math.abs(s.y) * 0.45 + 0.15, s.z * k);
    if (L.lengthSq() < 1e-6) L.set(0, 1, 0); else L.normalize();
  }

  toWorld(model, out) { return out.copy(model).applyQuaternion(this.quat).add(this.pos); }

  // World position of the dish centre (the emitter on the bowl floor, in the aim direction).
  dishWorld(out = new THREE.Vector3()) {
    return this.toWorld(_c.copy(this.layout.D).multiplyScalar(this.layout.emitterR), out);
  }

  // Point `dist` blocks in front of the dish centre along the aim (where the tributary beams converge).
  focusWorld(out = new THREE.Vector3(), dist = this.radius * 0.35) {
    return this.dishWorld(out).addScaledVector(this.aim, dist);
  }

  // n world positions evenly spaced around the dish rim (n = 8 coincides with the rim emitter nodes).
  rimPoints(n, outArray = []) {
    for (let i = 0; i < n; i++) {
      const out = outArray[i] || (outArray[i] = new THREE.Vector3());
      this.toWorld(ringPoint(this.layout, (i / n) * Math.PI * 2, this.layout.nodeR, _c), out);
    }
    outArray.length = n;
    return outArray;
  }

  dispose() {
    this.scene.remove(this.group);
    this.bodyGeometry.dispose();
    this.haloGeometry.dispose();
    this.bodyMaterial.dispose();
    this.haloMaterial.dispose();
  }
}

export { BattleStation as RingStation };

// ---------------------------------------------------------------- compatibility with the current orbitalBeam.js
// The old slim ring station API: set(x, y, z, power, heat, time, alpha, spin). The sphere aims straight down.
export const STATION_RING_RADIUS = STATION_RADIUS + 2;     // where the old code spawns its motes (just outside the hull)
export const STATION_FOCUS_DROP = Math.round((STATION_RADIUS - STATION_RADIUS * 0.15 + 1.5) + STATION_RADIUS * 0.35);

export class StationMesh extends BattleStation {
  set(x, y, z, a, b, c, d) {
    if (d !== null && typeof d === 'object') return super.set(x, y, z, a, b, c, d);   // new signature
    return super.set(x, y, z, 0, -1, 0, { power: a, heat: b, charge: a, firing: b, alpha: d, time: c });
  }
}
