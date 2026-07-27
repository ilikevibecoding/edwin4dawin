import * as THREE from 'three';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import { rand, randRange } from '../core/rand.js';

/**
 * SoldierFactory — loads soldier.glb once and stamps out per-enemy instances:
 *   clone (SkeletonUtils) + per-instance materials (tint variants + corpse fade)
 *   + gear attached to bones (helmet, plate carrier, rifle) + hitbox proxies.
 *
 * The armature root inside the GLB carries a 0.01 scale (cm rig), so anything
 * parented to a bone is authored in metres and scaled by BONE_SCALE.
 */
const BONE_SCALE = 100;

/** Enemy faction palettes — VALUE-SEPARATED zones so the soldier "blocks" read
 * at distance (COD rule: vest LIGHTER than uniform, helmet darker, gun black):
 *   body   — uniform multiply tint, mid-dark olive/khaki
 *   helmet — darker olive, slight sheen
 *   vest   — light warm coyote/khaki (the anchor zone, clearly lighter)
 *   accent — pouches/straps/belt, mid-dark (dark-on-light against the vest)
 *   boot   — near-dark leather
 */
const VARIANTS = [
  // uniform sits mid-dark and GREEN-shifted so the figure separates by hue+value
  // from the warm tan environment (round-2: warm-khaki body camouflaged into it).
  // vest: mid-value coyote/ranger green (~0.25-0.30 linear albedo) — round-3
  // verdict: pale vest read as hi-vis laundry. Still LIGHTER than the uniform.
  // pouch: near-vest with slight variation; dirt: vest darkened for the bottom band.
  { body: 0x6f7458, visor: 0x232720, helmet: 0x3d452c, vest: 0x8a7a58, pouch: 0x796a49, dirt: 0x62573c, accent: 0x4e4a3a, boot: 0x211d17 },
  { body: 0x777263, visor: 0x252420, helmet: 0x46432f, vest: 0x92815e, pouch: 0x80714e, dirt: 0x685d43, accent: 0x554f40, boot: 0x231f15 },
  { body: 0x62705e, visor: 0x212620, helmet: 0x39452f, vest: 0x787b58, pouch: 0x6a6d4d, dirt: 0x555940, accent: 0x475140, boot: 0x1d211b },
];

/** Rifle silhouette must read at 40m: pure near-black, shared by all variants. */
const GUN_METAL = 0x121316;
const GUN_FURN = 0x1b1c1e;

/** Warm low emissive fill so shadow sides never crush to black (rim/fill feel).
 * Kept <= 0.02 — higher values + flash lights cooked the body into a gold bloom
 * (round-2 verdict). Same reason envMapIntensity is capped at 0.55. */
const FILL_EMISSIVE = 0xffa268;
const FILL_INTENSITY = 0.018;
const ENV_INTENSITY = 0.55;

export class SoldierFactory {
  constructor(game) {
    this.game = game;
    this.ready = false;   // model loaded ok
    this.failed = false;  // fall back to primitive dummies
  }

  async load() {
    this._buildShared();
    try {
      const gltf = await this.game.assets.gltf('/assets/models/soldier.glb');
      this.proto = gltf.scene;
      this.clips = {
        idle: THREE.AnimationClip.findByName(gltf.animations, 'Idle'),
        walk: THREE.AnimationClip.findByName(gltf.animations, 'Walk'),
        run: THREE.AnimationClip.findByName(gltf.animations, 'Run'),
      };
      if (!this.clips.idle || !this.clips.walk || !this.clips.run) throw new Error('missing animation clips');
      this.proto.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.ready = true;
    } catch (e) {
      console.warn('[ai] soldier.glb unavailable — using primitive fallback', e);
      this.failed = true;
    }
  }

  _buildShared() {
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.unitSphere = new THREE.SphereGeometry(1, 10, 8);
    this.hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitboxDebugMat = new THREE.MeshBasicMaterial({ color: 0x40ff70, wireframe: true, transparent: true, opacity: 0.8, depthTest: false });

    // blood pool decal
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(46,3,3,0.96)');
    grad.addColorStop(0.55, 'rgba(38,2,3,0.85)');
    grad.addColorStop(0.82, 'rgba(30,2,3,0.4)');
    grad.addColorStop(1, 'rgba(28,2,3,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    // irregular rim blobs
    for (let i = 0; i < 10; i++) {
      const a = rand() * Math.PI * 2, r = 40 + rand() * 16;
      const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r;
      const rr = 6 + rand() * 12;
      const bg = g.createRadialGradient(x, y, 0, x, y, rr);
      bg.addColorStop(0, 'rgba(36,2,3,0.75)');
      bg.addColorStop(1, 'rgba(36,2,3,0)');
      g.fillStyle = bg;
      g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    const poolTex = new THREE.CanvasTexture(c);
    poolTex.colorSpace = THREE.SRGBColorSpace;
    this.bloodPoolTex = poolTex;
    this.bloodPoolGeo = new THREE.CircleGeometry(1, 20);

    // contact-shadow blob: soft dark radial decal that follows each enemy/corpse
    const bc = document.createElement('canvas');
    bc.width = bc.height = 64;
    const bg2 = bc.getContext('2d');
    const bgrad = bg2.createRadialGradient(32, 32, 2, 32, 32, 31);
    bgrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    bgrad.addColorStop(0.45, 'rgba(0,0,0,0.62)');
    bgrad.addColorStop(0.75, 'rgba(0,0,0,0.25)');
    bgrad.addColorStop(1, 'rgba(0,0,0,0)');
    bg2.fillStyle = bgrad;
    bg2.fillRect(0, 0, 64, 64);
    this.blobTex = new THREE.CanvasTexture(bc);
    this.blobGeo = new THREE.CircleGeometry(1, 18);

    // boots: chunky dark overlays that encase the GLB's blob feet
    this.bootGeo = new THREE.BoxGeometry(0.105, 0.21, 0.1);

    // AI-thrown grenade
    this.grenadeGeo = new THREE.SphereGeometry(0.05, 10, 8);
    this.grenadeMat = new THREE.MeshStandardMaterial({ color: 0x3a4030, roughness: 0.6, metalness: 0.3 });

    this._buildRifleProto();
    this._buildHelmetProto();
    this._buildVestProto();
  }

  /** Compact AR carbine, authored in metres, muzzle along +Z, grip at origin.
   * Slightly oversized so it reads at gameplay distances. */
  _buildRifleProto() {
    const rifle = new THREE.Group();
    const add = (geo, slot, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const m = new THREE.Mesh(geo, null);
      m.userData.matSlot = slot;
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      rifle.add(m);
      return m;
    };
    add(new THREE.BoxGeometry(0.066, 0.09, 0.3), 'gun', 0, 0.035, 0.05);             // receiver
    add(new THREE.BoxGeometry(0.058, 0.066, 0.26), 'gun2', 0, 0.032, 0.32);          // handguard
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), 'gun', 0, 0.045, 0.52, Math.PI / 2, 0, 0); // barrel
    add(new THREE.BoxGeometry(0.035, 0.035, 0.07), 'gun', 0, 0.045, 0.62);           // muzzle device
    add(new THREE.BoxGeometry(0.04, 0.16, 0.08), 'gun2', 0, -0.07, 0.11, 0.32, 0, 0);   // magazine (raked)
    add(new THREE.BoxGeometry(0.036, 0.1, 0.046), 'gun2', 0, -0.052, -0.02, -0.28, 0, 0); // pistol grip
    add(new THREE.BoxGeometry(0.04, 0.062, 0.2), 'gun', 0, 0.028, -0.18);            // stock tube
    add(new THREE.BoxGeometry(0.048, 0.115, 0.045), 'gun2', 0, 0.006, -0.29);        // butt pad
    add(new THREE.BoxGeometry(0.034, 0.05, 0.1), 'gun', 0, 0.105, 0.03);             // optic body
    add(new THREE.BoxGeometry(0.016, 0.03, 0.016), 'gun', 0, 0.095, 0.43);           // front post
    add(new THREE.BoxGeometry(0.03, 0.06, 0.035), 'gun2', 0, -0.012, 0.36, -0.15, 0, 0); // foregrip
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzleTip';
    muzzle.position.set(0, 0.045, 0.66);
    rifle.add(muzzle);
    this.rifleProto = rifle;
  }

  /** Combat helmet: fabric-covered dome + rim band + flared brim + mount stub. */
  _buildHelmetProto() {
    const h = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.132, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), null);
    dome.userData.matSlot = 'helmet';
    dome.scale.set(1.02, 0.92, 1.14);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.134, 0.139, 0.04, 16, 1, true), null);
    band.userData.matSlot = 'accent';
    band.scale.set(1.02, 1, 1.14);
    band.position.y = -0.005;
    // extruded lip flaring past the dome edge so the head silhouette reads
    // "helmet with brim" instead of a smooth ball (round-3 verdict)
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.017, 8, 22), null);
    brim.userData.matSlot = 'helmet';
    brim.rotation.x = Math.PI / 2;
    brim.scale.set(1.03, 1.17, 1); // local XY ellipse -> world XZ after the rotation
    brim.position.y = -0.02;
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.038, 0.02), null);
    mount.userData.matSlot = 'accent';
    mount.position.set(0, 0.045, 0.135);
    h.add(dome, band, brim, mount);
    this.helmetProto = h;
  }

  /** Plate carrier: wrap box + mag pouches (front) + radio (back) + belt kit. */
  _buildVestProto() {
    const v = new THREE.Group();
    const add = (geo, slot, x, y, z, ry = 0) => {
      const m = new THREE.Mesh(geo, null);
      m.userData.matSlot = slot;
      m.position.set(x, y, z);
      m.rotation.y = ry;
      v.add(m);
      return m;
    };
    add(new THREE.BoxGeometry(0.345, 0.30, 0.27), 'vest', 0, 0.02, 0);                // carrier wrap (mid coyote)
    add(new THREE.BoxGeometry(0.10, 0.035, 0.20), 'vest', -0.105, 0.185, 0);          // shoulder strap L
    add(new THREE.BoxGeometry(0.10, 0.035, 0.20), 'vest', 0.105, 0.185, 0);           // shoulder strap R
    // dirt-darkened band wrapping the lower edge (grime gradient on the carrier)
    add(new THREE.BoxGeometry(0.352, 0.08, 0.276), 'dirt', 0, -0.105, 0);
    // chunky front mag pouches (proud of the plate so they read in silhouette),
    // slight per-pouch color variation + dark flap lids for breakup
    add(new THREE.BoxGeometry(0.082, 0.125, 0.062), 'pouch', -0.088, -0.028, 0.158);
    add(new THREE.BoxGeometry(0.082, 0.125, 0.062), 'pouch2', 0, -0.028, 0.165);
    add(new THREE.BoxGeometry(0.082, 0.125, 0.062), 'pouch', 0.088, -0.028, 0.158);
    add(new THREE.BoxGeometry(0.086, 0.034, 0.066), 'accent', -0.088, 0.045, 0.158);  // flap L
    add(new THREE.BoxGeometry(0.086, 0.034, 0.066), 'accent', 0, 0.045, 0.165);       // flap C
    add(new THREE.BoxGeometry(0.086, 0.034, 0.066), 'accent', 0.088, 0.045, 0.158);   // flap R
    add(new THREE.BoxGeometry(0.06, 0.14, 0.05), 'accent', -0.1, 0.06, -0.15);        // radio (back)
    this.vestProto = v;

    const b = new THREE.Group();
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.27), null);
    belt.userData.matSlot = 'accent';
    const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.12), null);
    pouchL.userData.matSlot = 'vest';
    pouchL.position.set(-0.185, -0.04, 0.02);
    const pouchR = pouchL.clone();
    pouchR.position.x = 0.185;
    b.add(belt, pouchL, pouchR);
    this.beltProto = b;
  }

  _makeInstanceMats(v) {
    const mk = (color, rough = 0.92, metal = 0, fill = FILL_INTENSITY) => new THREE.MeshStandardMaterial({
      color, roughness: rough, metalness: metal,
      emissive: FILL_EMISSIVE, emissiveIntensity: fill,
      envMapIntensity: ENV_INTENSITY,
    });
    return {
      helmet: mk(v.helmet, 0.55, 0.08),           // darker olive w/ slight sheen
      vest: mk(v.vest, 0.94),                     // mid coyote — lighter than uniform
      pouch: mk(v.pouch, 0.9),                    // mag pouches, slight variation
      pouch2: mk(new THREE.Color(v.pouch).multiplyScalar(1.14), 0.9),
      dirt: mk(v.dirt, 0.96),                     // dirt-darkened vest bottom band
      accent: mk(v.accent, 0.88),                 // straps/flaps/radio: dark breakup
      boot: mk(v.boot, 0.8, 0.05, 0.012),
      gun: mk(GUN_METAL, 0.5, 0.5, 0.008),        // near-black steel
      gun2: mk(GUN_FURN, 0.78, 0.1, 0.008),       // near-black polymer furniture
    };
  }

  /** Clone a gear prototype, wire instance materials + shadows. */
  _gear(proto, mats) {
    const g = proto.clone(true);
    g.traverse((o) => {
      if (o.isMesh) {
        o.material = mats[o.userData.matSlot] || mats.accent;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }

  /** Attach a hitbox proxy primitive to a bone (invisible but raycastable). */
  _hitbox(boneObj, part, kind, size, off, out) {
    const mesh = new THREE.Mesh(kind === 'sphere' ? this.unitSphere : this.unitBox, this.hitboxMat);
    mesh.visible = false;
    if (kind === 'sphere') mesh.scale.setScalar(size[0] * BONE_SCALE);
    else mesh.scale.set(size[0] * BONE_SCALE, size[1] * BONE_SCALE, size[2] * BONE_SCALE);
    mesh.position.set(off[0] * BONE_SCALE, off[1] * BONE_SCALE, off[2] * BONE_SCALE);
    mesh.userData.part = part;
    boneObj.add(mesh);
    out.push(mesh);
    return mesh;
  }

  /**
   * Build one enemy instance.
   * @returns {{root, mixer, actions, bones, rifle, muzzle, hitboxes, fadeMats, variant}}
   */
  create(variantIdx = 0) {
    if (!this.ready) return this._createFallback(variantIdx);
    const v = VARIANTS[((variantIdx % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];
    const mats = this._makeInstanceMats(v);
    const fadeMats = Object.values(mats).slice();

    const root = skeletonClone(this.proto);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false; // skinned bounds don't track animation
        o.material = o.material.clone();
        const isVisor = o.name === 'vanguard_visor';
        o.material.color.set(isVisor ? v.visor : v.body);
        // warm fill so the shadow side never crushes to black + sky IBL fill
        o.material.emissive = new THREE.Color(FILL_EMISSIVE);
        o.material.emissiveIntensity = isVisor ? 0.012 : 0.02;
        o.material.envMapIntensity = isVisor ? 0.7 : ENV_INTENSITY;
        if (isVisor) o.material.roughness = 0.35;
        fadeMats.push(o.material);
      }
    });

    const bone = (n) => root.getObjectByName(n);
    const bones = {
      hips: bone('mixamorigHips'),
      spine: bone('mixamorigSpine'),
      spine1: bone('mixamorigSpine1'),
      spine2: bone('mixamorigSpine2'),
      neck: bone('mixamorigNeck'),
      head: bone('mixamorigHead'),
      rHand: bone('mixamorigRightHand'),
      rArm: bone('mixamorigRightArm'),
      rForeArm: bone('mixamorigRightForeArm'),
      lArm: bone('mixamorigLeftArm'),
      lForeArm: bone('mixamorigLeftForeArm'),
      lUpLeg: bone('mixamorigLeftUpLeg'),
      rUpLeg: bone('mixamorigRightUpLeg'),
      lFoot: bone('mixamorigLeftFoot'),
      rFoot: bone('mixamorigRightFoot'),
    };

    // --- gear ---------------------------------------------------------------
    const helmet = this._gear(this.helmetProto, mats);
    helmet.scale.setScalar(BONE_SCALE);
    helmet.position.set(0, 0.085 * BONE_SCALE, 0.01 * BONE_SCALE);
    bones.head.add(helmet);

    const vest = this._gear(this.vestProto, mats);
    vest.scale.setScalar(BONE_SCALE);
    vest.position.set(0, 0.09 * BONE_SCALE, -0.01 * BONE_SCALE);
    bones.spine1.add(vest);

    const belt = this._gear(this.beltProto, mats);
    belt.scale.setScalar(BONE_SCALE);
    belt.position.set(0, 0.02 * BONE_SCALE, 0);
    bones.hips.add(belt);

    // dark boot overlays: box along the foot bone (ankle → toes)
    for (const fb of [bones.lFoot, bones.rFoot]) {
      if (!fb) continue;
      const boot = new THREE.Mesh(this.bootGeo, mats.boot);
      boot.castShadow = true;
      boot.receiveShadow = true;
      boot.scale.setScalar(BONE_SCALE);
      boot.position.set(0, 0.055 * BONE_SCALE, 0.015 * BONE_SCALE);
      fb.add(boot);
    }

    // 1.1x so the silhouette reads at 40m; near-black gun materials
    const rifle = this._gear(this.rifleProto, { metal: mats.gun, accent: mats.gun2, gun: mats.gun, gun2: mats.gun2 });
    rifle.scale.setScalar(BONE_SCALE * 1.1);
    // position rides the right palm; world orientation is driven per-frame
    // by the enemy (low-ready vs aimed), see Enemy._orientRifle.
    rifle.position.set(0, 0.075 * BONE_SCALE, 0.02 * BONE_SCALE);
    bones.rHand.add(rifle);
    const muzzle = rifle.getObjectByName('muzzleTip');

    // --- hitboxes -------------------------------------------------------------
    const hitboxes = [];
    this._hitbox(bones.head, 'head', 'sphere', [0.145], [0, 0.085, 0.02], hitboxes);
    this._hitbox(bones.spine1, 'body', 'box', [0.40, 0.52, 0.30], [0, 0.12, 0], hitboxes);
    this._hitbox(bones.hips, 'body', 'box', [0.37, 0.32, 0.27], [0, 0, 0], hitboxes);
    this._hitbox(bones.lUpLeg, 'body', 'box', [0.17, 0.48, 0.18], [0, 0.2, 0], hitboxes);
    this._hitbox(bones.rUpLeg, 'body', 'box', [0.17, 0.48, 0.18], [0, 0.2, 0], hitboxes);

    // --- animation -------------------------------------------------------------
    const mixer = new THREE.AnimationMixer(root);
    const mkAction = (clip) => {
      const a = mixer.clipAction(clip);
      a.play();
      a.weight = 0;
      a.time = rand() * clip.duration; // desync clones
      return a;
    };
    const actions = {
      idle: mkAction(this.clips.idle),
      walk: mkAction(this.clips.walk),
      run: mkAction(this.clips.run),
    };
    actions.idle.weight = 1;
    actions.idle.timeScale = randRange(0.92, 1.08);

    return { root, mixer, actions, bones, rifle, muzzle, hitboxes, fadeMats, variant: variantIdx };
  }

  /** Primitive stand-in used only if the GLB fails to load. */
  _createFallback(variantIdx) {
    const v = VARIANTS[((variantIdx % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];
    const root = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: v.body, roughness: 0.9 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x8a7862, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 10), bodyMat);
    body.position.y = 0.85;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), headMat);
    head.position.y = 1.62;
    root.add(body, head);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    const hitboxes = [];
    const hb = (part, kind, size, off) => {
      const mesh = new THREE.Mesh(kind === 'sphere' ? this.unitSphere : this.unitBox, this.hitboxMat);
      mesh.visible = false;
      if (kind === 'sphere') mesh.scale.setScalar(size[0]);
      else mesh.scale.set(size[0], size[1], size[2]);
      mesh.position.set(off[0], off[1], off[2]);
      mesh.userData.part = part;
      root.add(mesh);
      hitboxes.push(mesh);
    };
    hb('head', 'sphere', [0.16], [0, 1.62, 0]);
    hb('body', 'box', [0.55, 1.35, 0.45], [0, 0.75, 0]);

    const muzzle = new THREE.Object3D();
    muzzle.position.set(0.15, 1.38, 0.4);
    root.add(muzzle);
    return { root, mixer: null, actions: null, bones: null, rifle: null, muzzle, hitboxes, fadeMats: [bodyMat, headMat], variant: variantIdx };
  }
}

export { VARIANTS, BONE_SCALE };
