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

/** Enemy faction tints: dark olive / khaki / grey-green.
 * Kept cool + dark — the golden-hour sun pushes everything warm. */
const VARIANTS = [
  { body: 0x4d5443, visor: 0x1d201b, cloth: 0x39402c, cloth2: 0x2f3526, accent: 0x262a20, metal: 0x2c2e33 },
  { body: 0x5c584a, visor: 0x201f1b, cloth: 0x4e4736, cloth2: 0x413b2d, accent: 0x322e25, metal: 0x2a2a2c },
  { body: 0x475049, visor: 0x1b201e, cloth: 0x39423a, cloth2: 0x2e362f, accent: 0x272c27, metal: 0x282b30 },
];

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
    add(new THREE.BoxGeometry(0.066, 0.09, 0.3), 'metal', 0, 0.035, 0.05);           // receiver
    add(new THREE.BoxGeometry(0.058, 0.066, 0.26), 'accent', 0, 0.032, 0.32);        // handguard
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), 'metal', 0, 0.045, 0.52, Math.PI / 2, 0, 0); // barrel
    add(new THREE.BoxGeometry(0.035, 0.035, 0.07), 'metal', 0, 0.045, 0.62);         // muzzle device
    add(new THREE.BoxGeometry(0.04, 0.16, 0.08), 'accent', 0, -0.07, 0.11, 0.32, 0, 0);  // magazine (raked)
    add(new THREE.BoxGeometry(0.036, 0.1, 0.046), 'accent', 0, -0.052, -0.02, -0.28, 0, 0); // pistol grip
    add(new THREE.BoxGeometry(0.04, 0.062, 0.2), 'metal', 0, 0.028, -0.18);          // stock tube
    add(new THREE.BoxGeometry(0.048, 0.115, 0.045), 'accent', 0, 0.006, -0.29);      // butt pad
    add(new THREE.BoxGeometry(0.034, 0.05, 0.1), 'metal', 0, 0.105, 0.03);           // optic body
    add(new THREE.BoxGeometry(0.016, 0.03, 0.016), 'metal', 0, 0.095, 0.43);         // front post
    add(new THREE.BoxGeometry(0.03, 0.06, 0.035), 'accent', 0, -0.012, 0.36, -0.15, 0, 0); // foregrip
    const muzzle = new THREE.Object3D();
    muzzle.name = 'muzzleTip';
    muzzle.position.set(0, 0.045, 0.66);
    rifle.add(muzzle);
    this.rifleProto = rifle;
  }

  /** Combat helmet: fabric-covered dome + rim band + mount stub. */
  _buildHelmetProto() {
    const h = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.132, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), null);
    dome.userData.matSlot = 'cloth';
    dome.scale.set(1.02, 0.92, 1.14);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.134, 0.139, 0.04, 16, 1, true), null);
    band.userData.matSlot = 'accent';
    band.scale.set(1.02, 1, 1.14);
    band.position.y = -0.005;
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.038, 0.02), null);
    mount.userData.matSlot = 'accent';
    mount.position.set(0, 0.045, 0.135);
    h.add(dome, band, mount);
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
    add(new THREE.BoxGeometry(0.345, 0.30, 0.27), 'cloth2', 0, 0.02, 0);              // carrier wrap
    add(new THREE.BoxGeometry(0.10, 0.035, 0.20), 'cloth2', -0.105, 0.185, 0);        // shoulder strap L
    add(new THREE.BoxGeometry(0.10, 0.035, 0.20), 'cloth2', 0.105, 0.185, 0);         // shoulder strap R
    add(new THREE.BoxGeometry(0.075, 0.115, 0.045), 'accent', -0.085, -0.045, 0.155); // mag pouch
    add(new THREE.BoxGeometry(0.075, 0.115, 0.045), 'accent', 0, -0.045, 0.16);       // mag pouch
    add(new THREE.BoxGeometry(0.075, 0.115, 0.045), 'accent', 0.085, -0.045, 0.155);  // mag pouch
    add(new THREE.BoxGeometry(0.06, 0.14, 0.05), 'accent', -0.1, 0.06, -0.15);        // radio (back)
    this.vestProto = v;

    const b = new THREE.Group();
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.27), null);
    belt.userData.matSlot = 'accent';
    const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.1, 0.12), null);
    pouchL.userData.matSlot = 'cloth2';
    pouchL.position.set(-0.185, -0.04, 0.02);
    const pouchR = pouchL.clone();
    pouchR.position.x = 0.185;
    b.add(belt, pouchL, pouchR);
    this.beltProto = b;
  }

  _makeInstanceMats(v) {
    const mk = (color, rough = 0.92, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    return { cloth: mk(v.cloth, 0.96), cloth2: mk(v.cloth2, 0.96), accent: mk(v.accent, 0.85), metal: mk(v.metal, 0.5, 0.7) };
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
        o.material.color.set(o.name === 'vanguard_visor' ? v.visor : v.body);
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

    const rifle = this._gear(this.rifleProto, mats);
    rifle.scale.setScalar(BONE_SCALE);
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
    const bodyMat = new THREE.MeshStandardMaterial({ color: v.cloth, roughness: 0.9 });
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
