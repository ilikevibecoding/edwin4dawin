import * as THREE from 'three';
import { EYE, EYE_LIDS, KINDS } from './spec.js';
import { buildSkeleton } from './rig.js';
import { buildLionGeometry, DETAIL, SkinBuilder } from './geometry.js';
import { alphaAtlas, coatAtlas, coatNormal, farCard, fuzzStrands, maneStrands, ATLAS } from './textures.js';
import { Poser, STAND } from './pose.js';
import { Feet } from './feet.js';
import { Brain } from './behaviour.js';
import { ContactShadows, contactMaterial } from './contact.js';

// ---------------------------------------------------------------------------
// One lion: skeleton, three skinned detail tiers and a far card, materials,
// and the per-frame pipeline brain -> feet -> poser -> bones.
//
// Tiers share one skeleton and one set of materials, so switching tier is a
// visibility flip. Animation is decimated with distance: the close tier is
// solved every frame, the far ones every second or fourth.
// ---------------------------------------------------------------------------

const TIER_DIST = {
  fast: [9, 26, 80],
  high: [14, 40, 110],
  ultra: [18, 50, 140],
};
const TIER_EVERY = [1, 2, 4, 6];

const WIND = new THREE.Vector3(0.82, 0, 0.57).normalize();

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

/**
 * Shell material: alpha-tested per shell with an `aShell` attribute, darkened
 * toward the root, and blown about by the wind in proportion to its height.
 * One merged geometry carries every shell, so a mane is one draw.
 */
function shellMaterial(base, { wind = 0.05, rootShade = 0.45, droop = 0 } = {}) {
  const u = { uTime: { value: 0 }, uWind: { value: WIND.clone().multiplyScalar(wind) }, uRoot: { value: rootShade }, uDroop: { value: droop } };
  base.userData.shell = u;
  base.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aShell;
        varying float vShell;
        uniform float uTime;
        uniform float uDroop;
        uniform vec3 uWind;`,
      )
      .replace(
        '#include <skinning_vertex>',
        `#include <skinning_vertex>
        vShell = aShell;
        // wind is given in world space; the model matrix is a rigid transform
        vec3 windObj = transpose( mat3( modelMatrix ) ) * uWind;
        float ph = dot( transformed.xz, vec2( 3.1, 2.3 ) ) + uTime * 2.1;
        float gust = 0.5 + 0.5 * sin( uTime * 0.7 + transformed.x * 0.5 );
        vec3 flutter = vec3( sin( ph * 1.7 ), 0.3 * sin( ph * 2.3 ), cos( ph * 1.3 ) ) * 0.012;
        // long hair hangs: the outer shells sag toward the ground
        vec3 downObj = transpose( mat3( modelMatrix ) ) * vec3( 0.0, -1.0, 0.0 );
        transformed += ( windObj * ( 0.35 + 0.65 * gust ) * ( 0.5 + 0.5 * sin( ph ) ) + flutter + downObj * uDroop ) * aShell * aShell;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vShell;
        uniform float uRoot;`,
      )
      .replace(
        '#include <alphamap_fragment>',
        `#include <alphamap_fragment>
        if ( diffuseColor.a < vShell * 0.97 + 0.02 ) discard;
        diffuseColor.rgb *= mix( uRoot, 1.0, vShell );`,
      );
  };
  base.customProgramCacheKey = () => 'lionshell|' + base.type + '|' + (base.alphaMap ? 'a' : '');
  return base;
}

export function lionMaterials({ env, quality }) {
  const size = quality === 'fast' ? 512 : 1024;
  const Physical = quality === 'fast' ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial;
  const make = (spots) => {
    const m = new Physical({
      map: coatAtlas({ size, spots }),
      normalMap: coatNormal(256),
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughness: 0.88,
      metalness: 0,
      vertexColors: true,
      envMap: env,
      // fur scatters sky light into its own shadow side; without this the
      // flank away from the sun goes to black against a lit plain
      envMapIntensity: 0.6,
    });
    if (m.isMeshPhysicalMaterial) {
      m.sheen = 0.5;
      m.sheenRoughness = 0.7;
      m.sheenColor = new THREE.Color(0xd8b078);
      m.specularIntensity = 0.35;
    }
    m.name = spots ? 'lion-coat-cub' : 'lion-coat';
    return m;
  };
  const coat = make(false);
  const coatCub = make(true);

  // 512 at fast too: at 256 the four shells resolve each strand as one bright
  // stroke and the mane reads as a straw broom from the front (round 3). One
  // 1 MB texture shared by the base and the shells; not larger at high, because
  // the map is rasterised hair by hair and its cost grows with the cube of the
  // size.
  const maneMap = maneStrands(512);
  const mane = new THREE.MeshStandardMaterial({
    map: maneMap,
    roughness: 0.92,
    metalness: 0,
    envMap: env,
    envMapIntensity: 0.2,
    color: 0x9a8068,
    name: 'lion-mane-base',
  });
  const maneShell = shellMaterial(
    new THREE.MeshStandardMaterial({
      map: maneMap,
      roughness: 0.9,
      metalness: 0,
      envMap: env,
      envMapIntensity: 0.25,
      vertexColors: true,
      side: THREE.DoubleSide,
      name: 'lion-mane-shells',
    }),
    { wind: 0.045, rootShade: 0.55, droop: 0.05 },
  );
  const fuzzTex = fuzzStrands(quality === 'fast' ? 128 : 256);
  fuzzTex.repeat.set(9, 5);
  const fuzz = shellMaterial(
    new THREE.MeshStandardMaterial({
      map: coatAtlas({ size, spots: false }),
      alphaMap: fuzzTex,
      roughness: 0.9,
      metalness: 0,
      envMap: env,
      envMapIntensity: 0.25,
      vertexColors: true,
      side: THREE.DoubleSide,
      name: 'lion-fuzz',
    }),
    { wind: 0.008, rootShade: 0.8 },
  );
  const alpha = new THREE.MeshStandardMaterial({
    map: alphaAtlas(256),
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.75,
    metalness: 0,
    envMap: env,
    envMapIntensity: 0.2,
    name: 'lion-strands',
  });
  const cornea = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    envMap: env,
    envMapIntensity: 1.6,
    specularIntensity: 1.0,
    name: 'lion-cornea',
  });
  const card = (mane) =>
    new THREE.MeshStandardMaterial({ map: farCard(mane), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, metalness: 0, name: 'lion-card' });
  return { coat, coatCub, mane, maneShell, fuzz, alpha, cornea, cardMale: card(true), cardOther: card(false), contact: contactMaterial() };
}

/** Per-lion tint: a copy of a shared material with the colour nudged. */
function tinted(mat, hue, val) {
  const m = mat.clone();
  // tints are multiplicative on the map, so keep them near white and nearly
  // grey: the map already carries the tawny, and a saturated tint turns it
  // fox-red under a warm sun
  m.color = new THREE.Color().setHSL(0.1 + hue * 1.5, 0.3, 0.5 + val);
  m.color.lerp(new THREE.Color(1, 1, 1), 0.7);
  m.onBeforeCompile = mat.onBeforeCompile;
  m.customProgramCacheKey = mat.customProgramCacheKey;
  m.userData = mat.userData;
  return m;
}

export class Lion {
  constructor({ kind, terrain, materials, quality, seed, home, spread, pride, variation = {} }) {
    this.kind = kind;
    this.K = KINDS[kind];
    this.s = this.K.scale;
    this.terrain = terrain;
    this.quality = quality;
    this.root = new THREE.Group();
    this.root.name = `lion-${kind}`;
    this.skel = buildSkeleton(kind);
    this.root.add(this.skel.root);
    this.poser = new Poser(this.skel, this.s, this.K.squat ?? 1, this.K.bulk, this.K.leg);
    // each animal starts its gait at its own point in the cycle, so two that
    // set off together do not walk in lockstep
    this.feet = new Feet(this.skel, this.s, terrain, { phase: ((seed ?? 0) * 0.6180339887) % 1 });
    this.brain = new Brain({ kind, scale: this.s, seed, home, spread, pride });
    this.brain.terrainOk = (x, z) => {
      const e = 0.6;
      const h = terrain.heightAt(x, z);
      const g = Math.hypot(terrain.heightAt(x + e, z) - h, terrain.heightAt(x, z + e) - h) / e;
      return g < 0.32 && terrain.roadDistance(x, z) > 4.5;
    };
    this.tiers = [];
    this.tier = 0;
    this.frame = 0;
    this.stats = { tiers: [], calls: [] };
    this.ground = { hip: 0, chest: 0, init: false };
    this.fit = { hip: 0, chest: 0 };
    this.pose = { ...STAND };
    this.shellUniforms = [];

    const hue = variation.hue ?? 0;
    const val = variation.val ?? 0;
    const coatBase = kind === 'cub' ? materials.coatCub : materials.coat;
    this.coat = tinted(coatBase, hue, val);
    this.maneMat = this.K.mane ? tinted(materials.mane, hue * 2 + (variation.mane ?? 0), val) : null;
    this.maneShellMat = this.K.mane ? tinted(materials.maneShell, hue * 2 + (variation.mane ?? 0), val) : null;
    this.fuzzMat = tinted(materials.fuzz, hue, val);
    if (this.maneShellMat) this.shellUniforms.push(this.maneShellMat.userData.shell);
    this.shellUniforms.push(this.fuzzMat.userData.shell);

    const shells = { fast: 4, high: 8, ultra: 12 }[quality];
    const fuzz = { fast: 0, high: 2, ultra: 3 }[quality];
    for (let t = 0; t < 3; t++) {
      const g = buildLionGeometry(this.skel, kind, t, {
        fuzzShells: t === 0 ? fuzz : 0,
        maneShells: t === 0 ? shells : t === 1 ? Math.max(2, shells >> 1) : 1,
        maneLength: t === 2 ? 0.12 : 0.17,
      });
      const group = new THREE.Group();
      group.name = `lion-tier-${t}`;
      let tris = 0;
      let calls = 0;
      const skin = (geo, mat, name, { shadow = true } = {}) => {
        const m = new THREE.SkinnedMesh(geo, mat);
        m.name = name;
        m.bind(this.skel.skeleton, new THREE.Matrix4());
        m.castShadow = shadow && t < 2;
        m.receiveShadow = true;
        // bones wander well outside the rest bounds when the animal lies down
        m.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.7 * this.s, 0), 2.1 * this.s);
        m.frustumCulled = true;
        group.add(m);
        tris += geo.index.count / 3;
        calls++;
        return m;
      };
      skin(g.body, this.coat, `lion-body-${t}`);
      if (g.mane) skin(g.mane, this.maneMat, `lion-mane-${t}`);
      if (g.maneShells) skin(g.maneShells, this.maneShellMat, `lion-mane-shells-${t}`, { shadow: false });
      if (g.fuzz) skin(g.fuzz, this.fuzzMat, `lion-fuzz-${t}`, { shadow: false });
      if (g.alpha) skin(g.alpha, materials.alpha, `lion-strands-${t}`, { shadow: t === 0 });
      if (DETAIL[t].eyes) skin(this.corneaGeometry(t), materials.cornea, `lion-cornea-${t}`, { shadow: false });
      group.visible = t === 0;
      this.root.add(group);
      this.tiers.push(group);
      this.stats.tiers.push(Math.round(tris));
      this.stats.calls.push(calls);
    }
    // far card
    const cardH = 1.5 * this.s;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(cardH * 1.33, cardH), this.K.mane ? materials.cardMale : materials.cardOther);
    card.name = 'lion-card';
    card.position.y = cardH * 0.45;
    card.visible = false;
    this.card = card;
    this.root.add(card);
    this.tiers.push(card);
    this.stats.tiers.push(2);
    this.stats.calls.push(1);
    // contact shadows under the paws and the lying trunk, for the near tiers
    this.contact = new ContactShadows(this, materials.contact);

    // drop it in place
    this.brain.pos.y = terrain.heightAt(home.x, home.z);
    this.place();
    this.feet.reset({ x: this.brain.pos.x, y: this.brain.pos.y, z: this.brain.pos.z, yaw: this.brain.yaw });
    this.step(1 / 60, { x: 1e4, z: 1e4, speed: 0, throttle: 0 }, true);
  }

  corneaGeometry(t) {
    const b = new SkinBuilder();
    const headIdx = this.skel.index.get('head');
    // the ball head.js builds is EYE.r scaled by EYE_LIDS.scale; the cornea has
    // to sit just outside it or the wet highlight is inside the eye
    const r = EYE.r * EYE_LIDS.scale * this.s * this.K.head * 1.03;
    for (const side of ['lidL', 'lidR']) {
      const lr = this.skel.rest.get(side);
      const g = new THREE.SphereGeometry(r, DETAIL[t].sphere[0], DETAIL[t].sphere[1]);
      b.addGeometry(g, { matrix: new THREE.Matrix4().compose(lr.pos, lr.quat, new THREE.Vector3(1, 1, 1)), uvRect: ATLAS.eye, bones: [[headIdx, 1]] });
    }
    return b.build();
  }

  /** Put the root under the body and turn it to the heading. */
  place() {
    const p = this.brain.pos;
    this.root.position.set(p.x, p.y, p.z);
    this.root.rotation.set(0, this.brain.yaw, 0);
  }

  /** Root-space ground height at a root-space (x, z). */
  groundAt(lx, lz) {
    const c = Math.cos(this.brain.yaw);
    const sn = Math.sin(this.brain.yaw);
    const wx = this.brain.pos.x + lx * c + lz * sn;
    const wz = this.brain.pos.z - lx * sn + lz * c;
    return this.terrain.heightAt(wx, wz) - this.brain.pos.y;
  }

  /** One simulation step: behaviour, movement, feet, pose. */
  step(dt, truck, force = false) {
    const s = this.s;
    const out = this.brain.update(dt, truck);
    const b = this.brain;
    b.pos.y = this.terrain.heightAt(b.pos.x, b.pos.z);
    this.place();

    // ground under the hips and the shoulders, smoothed so a step does not kick the body
    const gh = this.groundAt(0, this.skel.rest.get('pelvis').pos.z);
    const gc = this.groundAt(0, this.skel.rest.get('chest').pos.z);
    if (!this.ground.init || force) {
      this.ground.hip = gh;
      this.ground.chest = gc;
      this.ground.init = true;
    } else {
      const k = 1 - Math.exp(-dt * 5);
      this.ground.hip += (gh - this.ground.hip) * k;
      this.ground.chest += (gc - this.ground.chest) * k;
    }

    // anchors: rest foot plus the pose's offsets
    const P = out.pose;
    const anchors = this.feet.legs.map((l) => {
      const sp = l.spec;
      const dz = (sp.front ? P.frontZ : P.hindZ) * s;
      const dx = (sp.front ? P.frontX : P.hindX) * s * sp.side;
      return _v.set(l.rest.x + dx, 0, l.rest.z + dz).clone();
    });
    this.feet.update(dt, {
      root: { x: b.pos.x, y: b.pos.y, z: b.pos.z, yaw: b.yaw },
      vel: out.vel,
      yawRate: out.yawRate,
      moving: out.moving,
      speed: out.speed,
      anchors,
      stepDur: P.hipH < 0.7 ? 0.55 : 0.42,
    });
    if (force) this.feet.reset({ x: b.pos.x, y: b.pos.y, z: b.pos.z, yaw: b.yaw });
    // the gait period, for the tail and anything else that keeps time with the legs
    b.gaitT = this.feet.T || 1;

    // the pose the poser sees: the state's pose plus the gaze and the gait layers
    const pose = this.pose;
    Object.assign(pose, P);
    pose.neckYaw += out.gaze.yaw * 0.4;
    pose.headYaw += out.gaze.yaw * 0.6;
    pose.headPitch += out.gaze.pitch;
    const walk = out.anim.walkAmt;
    const ph = this.feet.phase * Math.PI * 2;
    // Gait layers. The trunk rises twice a cycle, highest as each diagonal
    // pair passes under the body; the head nods in counter-phase to it (down as
    // the shoulders come up); the shoulders roll toward the planted foreleg;
    // hips and shoulders yaw against one another.
    const bob = Math.sin(ph * 2);
    out.anim.sway = Math.sin(ph) * walk;
    out.anim.roll = Math.sin(ph + 0.6) * 0.04 * walk;
    out.anim.headBob = -bob * 0.07 * walk;
    // body fit: the trunk comes down to whatever its planted feet can reach,
    // quickly, and eases back up once the legs are under it again
    const fit = this.fit;
    const bobHip = 0.024 * s * walk;
    const bobChest = 0.026 * s * walk;
    const ground = {
      hip: this.ground.hip + Math.sin(ph * 2 + 0.5) * bobHip - fit.hip,
      chest: this.ground.chest + bob * bobChest - fit.chest,
    };
    const contacts = this.feet.contacts();
    this.poser.solve(pose, ground, contacts, out.anim);
    const over = this.poser.over;
    const relax = 1 - Math.exp(-dt * 3);
    if (over.hind <= 1e-4) fit.hip *= 1 - relax;
    if (over.front <= 1e-4) fit.chest *= 1 - relax;
    // bring the trunk down to what the feet can reach. Lowering one end pitches
    // the trunk and swings that end's leg roots away from a foot out in front,
    // so a pass recovers only part of the shortfall; overshoot the first and
    // iterate until the residual is under a millimetre
    for (let pass = 0; pass < 4 && (over.hind > 1e-4 || over.front > 1e-4); pass++) {
      const k = pass === 0 ? 1.5 : 1.2;
      fit.hip = Math.min(fit.hip + over.hind * k, 0.3 * s);
      fit.chest = Math.min(fit.chest + over.front * k, 0.3 * s);
      ground.hip = this.ground.hip + Math.sin(ph * 2 + 0.5) * bobHip - fit.hip;
      ground.chest = this.ground.chest + bob * bobChest - fit.chest;
      this.poser.solve(pose, ground, contacts, out.anim);
    }
    if (this.contact.mesh.visible) this.contact.update();
    this.state = out.state;
    this.alarm = out.alarm;
  }

  /**
   * World-space contact points for the vegetation: a Float32Array of
   * (x, z, radius, weight) for each paw and one for the trunk. Grass within
   * `radius` of a point with weight > 0 is standing where a paw or a belly is,
   * and should be culled or pushed aside; weight fades as the paw lifts.
   */
  contactPoints() {
    return this.contact.points;
  }

  /** Choose the tier by camera distance; returns whether this frame animates. */
  lod(camera, dt) {
    const d = camera.position.distanceTo(this.root.position);
    const D = TIER_DIST[this.quality] || TIER_DIST.high;
    const tier = d < D[0] ? 0 : d < D[1] ? 1 : d < D[2] ? 2 : 3;
    if (tier !== this.tier) {
      for (let i = 0; i < this.tiers.length; i++) this.tiers[i].visible = i === tier;
      this.contact.mesh.visible = tier < 2;
      this.tier = tier;
    }
    if (tier === 3) {
      // billboard the card about Y
      _w.copy(camera.position).sub(this.root.position);
      this.card.rotation.y = Math.atan2(_w.x, _w.z) - this.brain.yaw;
      this.card.position.y = (this.brain.pose.hipH < 0.7 ? 0.32 : 0.68) * this.s;
    }
    this.frame++;
    return this.frame % TIER_EVERY[tier] === 0;
  }

  update(dt, t, truck, camera) {
    this.pending = (this.pending || 0) + dt;
    if (camera && !this.lod(camera, dt)) return;
    const step = Math.min(this.pending, 0.25);
    this.pending = 0;
    this.step(step, truck);
    for (const u of this.shellUniforms) u.uTime.value = t;
  }

  /** World position of each pad's contact point, from the bones, and the stored contact. */
  footReport() {
    this.root.updateMatrixWorld(true);
    return this.feet.legs.map((l, i) => {
      const bone = this.skel.boneByName.get(l.spec.paw);
      const pad = i < 2 ? [0, 0.06, 0.036] : [0, 0.06, 0.036];
      const p = _v.set(pad[0] * this.s, pad[1] * this.s, pad[2] * this.s);
      bone.localToWorld(p);
      return { name: l.spec.name, planted: l.planted, x: p.x, y: p.y, z: p.z, cx: l.pos.x, cy: l.pos.y, cz: l.pos.z };
    });
  }
}
