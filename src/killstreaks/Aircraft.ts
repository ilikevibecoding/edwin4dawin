import * as THREE from 'three';
import { TAU, clamp, lerp } from '../core/MathX';

/**
 * Aircraft.ts — a procedural fast-jet strike aircraft plus the flight math that
 * flies it down a bomb-run.
 *
 * Silhouette first: a swept delta with twin canted tails, two engine nacelles
 * with glowing afterburners, a glossy canopy and underwing stores. It is only
 * ever seen at distance and against the sky, so the read that matters is the
 * planform and the twin burner glow — both of which are exaggerated a touch.
 *
 * Geometry is built once from small shared primitives and fully disposed. The
 * afterburner plume + wingtip vapour trails are self-contained additive pools
 * so the jet is spectacular without leaning on the VFX budget.
 */

export interface JetMaterials {
  skin: THREE.Material;
  skinDark: THREE.Material;
  canopy: THREE.Material;
  burner: THREE.Material;
  vapour: THREE.Material;
}

/** Definition of a straight, banking bomb-run pass. */
export interface RunDef {
  /** Point the aircraft passes directly over. */
  pass: THREE.Vector3;
  /** Unit XZ direction of travel. */
  heading: THREE.Vector3;
  /** Metres per second. */
  speed: number;
  /** Cruise altitude AGL blended toward the ground under `pass`. */
  altitude: number;
  /** Bank angle in radians (rolled into the turn). */
  bank: number;
  /** Lateral + longitudinal offset within a formation. */
  lateral: number;
  along0: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _t = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _side = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export class StrikeJet {
  readonly group = new THREE.Group();

  private burnerL: THREE.Mesh;
  private burnerR: THREE.Mesh;
  private burnGlow: THREE.Sprite[] = [];
  private burnTex: THREE.Texture;
  private tipL = new THREE.Object3D();
  private tipR = new THREE.Object3D();

  // Wingtip vapour ribbon: a short additive quad pool laid down along the path.
  private vapourPool: THREE.Sprite[] = [];
  private vapourAge: number[] = [];
  private vapourCursor = 0;
  private vapourTex: THREE.Texture;
  private lastTipL = new THREE.Vector3();
  private lastTipR = new THREE.Vector3();
  private laid = false;

  private flick = Math.random() * TAU;

  constructor(
    private mats: JetMaterials,
    private run: RunDef,
    scene: THREE.Scene,
    private ownGeo: THREE.BufferGeometry[]
  ) {
    this.build();
    this.vapourTex = makeVapourTexture();
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.vapourTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.NormalBlending,
        })
      );
      s.scale.setScalar(0.01);
      s.visible = false;
      this.vapourPool.push(s);
      this.vapourAge.push(-1);
      scene.add(s);
    }
    this.burnerL = this.group.getObjectByName('burnerL') as THREE.Mesh;
    this.burnerR = this.group.getObjectByName('burnerR') as THREE.Mesh;

    // Bright additive nozzle glow (bloom bait) at each engine.
    this.burnTex = makeBurnerTexture();
    for (const b of [this.burnerL, this.burnerR]) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.burnTex, color: 0xffdca0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      s.scale.set(2.4, 2.4, 1);
      s.position.set(0, 0, 0.9);
      b.add(s);
      this.burnGlow.push(s);
    }

    // A high-altitude jet reads bigger in silhouette; scale the whole airframe.
    this.group.scale.setScalar(1.4);
    scene.add(this.group);
  }

  private g<T extends THREE.BufferGeometry>(geo: T): T {
    this.ownGeo.push(geo);
    return geo;
  }

  private build() {
    const skin = this.mats.skin;
    const dark = this.mats.skinDark;

    // --- Fuselage: tapered body from a scaled cylinder + nose cone ---------
    const body = new THREE.Mesh(
      this.g(new THREE.CylinderGeometry(0.62, 0.5, 7.2, 12)),
      skin
    );
    body.rotation.x = Math.PI / 2; // long axis along Z (nose -Z)
    body.scale.set(1, 0.72, 1); // flatten belly slightly
    this.group.add(body);

    const nose = new THREE.Mesh(this.g(new THREE.ConeGeometry(0.5, 3.0, 12)), skin);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -5.1;
    nose.scale.set(1, 0.72, 1);
    this.group.add(nose);

    const tailCone = new THREE.Mesh(this.g(new THREE.CylinderGeometry(0.5, 0.34, 1.4, 12)), dark);
    tailCone.rotation.x = Math.PI / 2;
    tailCone.position.z = 4.3;
    tailCone.scale.set(1, 0.72, 1);
    this.group.add(tailCone);

    // --- Canopy: glossy stretched dome just aft of the nose ----------------
    const canopy = new THREE.Mesh(this.g(new THREE.SphereGeometry(0.42, 14, 10)), this.mats.canopy);
    canopy.scale.set(0.8, 0.62, 1.9);
    canopy.position.set(0, 0.42, -2.4);
    this.group.add(canopy);

    // --- Delta wings: thin swept extruded triangles ------------------------
    const wing = this.g(buildDeltaWing());
    const wingL = new THREE.Mesh(wing, skin);
    wingL.position.set(0, -0.05, 0.7);
    this.group.add(wingL);
    const wingR = new THREE.Mesh(wing, skin);
    wingR.position.set(0, -0.05, 0.7);
    wingR.scale.x = -1;
    this.group.add(wingR);

    // Wingtip anchors for the vapour ribbon.
    this.tipL.position.set(4.5, -0.02, 1.2);
    this.tipR.position.set(-4.5, -0.02, 1.2);
    this.group.add(this.tipL, this.tipR);

    // --- Twin canted tails -------------------------------------------------
    const finGeo = this.g(buildFin());
    for (const s of [1, -1]) {
      const fin = new THREE.Mesh(finGeo, dark);
      fin.position.set(s * 0.75, 0.35, 3.6);
      fin.rotation.z = s * 0.32; // cant outward
      this.group.add(fin);
    }
    // Horizontal stabilators.
    const stabGeo = this.g(buildStab());
    for (const s of [1, -1]) {
      const stab = new THREE.Mesh(stabGeo, skin);
      stab.position.set(0, -0.05, 3.7);
      stab.scale.x = s;
      this.group.add(stab);
    }

    // --- Engine nacelles + afterburners ------------------------------------
    const nacGeo = this.g(new THREE.CylinderGeometry(0.34, 0.3, 2.6, 10));
    const burnGeo = this.g(new THREE.ConeGeometry(0.3, 3.4, 12, 1, true));
    for (const [s, name] of [
      [0.55, 'burnerR'],
      [-0.55, 'burnerL'],
    ] as [number, string][]) {
      const nac = new THREE.Mesh(nacGeo, dark);
      nac.rotation.x = Math.PI / 2;
      nac.position.set(s, -0.12, 3.3);
      this.group.add(nac);

      const burn = new THREE.Mesh(burnGeo, this.mats.burner);
      burn.name = name;
      burn.rotation.x = -Math.PI / 2; // plume points +Z (aft)
      burn.position.set(s, -0.12, 5.2);
      this.group.add(burn);
    }

    // --- Underwing stores (pylons + bombs) ---------------------------------
    const pylonGeo = this.g(new THREE.BoxGeometry(0.14, 0.28, 0.6));
    const storeGeo = this.g(new THREE.CapsuleGeometry(0.16, 0.9, 4, 8));
    for (const s of [1.6, 2.8, -1.6, -2.8]) {
      const pylon = new THREE.Mesh(pylonGeo, dark);
      pylon.position.set(s, -0.32, 0.9);
      this.group.add(pylon);
      const store = new THREE.Mesh(storeGeo, dark);
      store.rotation.x = Math.PI / 2;
      store.position.set(s, -0.55, 0.9);
      this.group.add(store);
    }

    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = false;
    });
  }

  /** Along-track distance from the pass point (negative = still inbound). */
  along(clock: number): number {
    return this.run.along0 + this.run.speed * clock;
  }

  update(dt: number, clock: number) {
    const run = this.run;
    const along = this.along(clock);

    // Position along the straight run, offset laterally for formation.
    _fwd.copy(run.heading);
    _side.crossVectors(_up, _fwd).normalize();
    _t.copy(run.pass)
      .addScaledVector(_fwd, along)
      .addScaledVector(_side, run.lateral);
    _t.y = run.altitude;
    this.group.position.copy(_t);

    // Orient: nose (-Z) toward travel, then roll into the bank.
    _m.lookAt(_t, _t.clone().add(_fwd), _up);
    _q.setFromRotationMatrix(_m);
    this.group.quaternion.copy(_q);
    this.group.rotateZ(run.bank);

    // Afterburner flicker (bloom picks up the additive plume).
    this.flick += dt * 40;
    const puff = 0.85 + Math.sin(this.flick) * 0.12 + Math.sin(this.flick * 2.3) * 0.05;
    for (const b of [this.burnerL, this.burnerR]) {
      if (!b) continue;
      b.scale.set(puff, puff, 0.9 + puff * 0.5);
      (b.material as THREE.Material).opacity = 0.9;
    }

    this.layVapour(dt);
  }

  private layVapour(dt: number) {
    this.tipL.getWorldPosition(_t);
    const nowL = _t.clone();
    this.tipR.getWorldPosition(_t);
    const nowR = _t.clone();

    if (this.laid) {
      // Emit a couple of puffs between the previous and current tip positions.
      for (let k = 0; k < 2; k++) {
        const f = (k + 1) / 2;
        this.spawnVapour(this.lastTipL.clone().lerp(nowL, f));
        this.spawnVapour(this.lastTipR.clone().lerp(nowR, f));
      }
    }
    this.lastTipL.copy(nowL);
    this.lastTipR.copy(nowR);
    this.laid = true;

    for (let i = 0; i < this.vapourPool.length; i++) {
      if (this.vapourAge[i] < 0) continue;
      this.vapourAge[i] += dt;
      const a = this.vapourAge[i];
      const life = 2.6;
      const s = this.vapourPool[i];
      if (a >= life) {
        s.visible = false;
        this.vapourAge[i] = -1;
        continue;
      }
      const t = a / life;
      s.scale.setScalar(lerp(1.1, 6.5, t));
      (s.material as THREE.SpriteMaterial).opacity = Math.sin(Math.min(1, t * 3) * Math.PI * 0.5) * (1 - t) * 0.55;
      s.position.y += dt * 0.4; // slow rise/expansion
    }
  }

  private spawnVapour(pos: THREE.Vector3) {
    const i = this.vapourCursor;
    this.vapourCursor = (this.vapourCursor + 1) % this.vapourPool.length;
    const s = this.vapourPool[i];
    s.position.copy(pos);
    s.visible = true;
    this.vapourAge[i] = 0;
    s.scale.setScalar(1.1);
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  worldPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.group.position);
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this.group);
    for (const s of this.vapourPool) {
      scene.remove(s);
      (s.material as THREE.Material).dispose();
    }
    for (const s of this.burnGlow) (s.material as THREE.Material).dispose();
    this.vapourTex.dispose();
    this.burnTex.dispose();
  }
}

// ---------------------------------------------------------------------------
// Shared geometry builders
// ---------------------------------------------------------------------------

function buildDeltaWing(): THREE.ExtrudeGeometry {
  // A right-hand swept delta in the XZ plane (root at fuselage, tip at +X).
  const s = new THREE.Shape();
  s.moveTo(0.35, -1.9); // root leading
  s.lineTo(4.6, 1.7); // tip
  s.lineTo(4.6, 2.15);
  s.lineTo(0.35, 2.4); // root trailing
  s.lineTo(0.35, -1.9);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false });
  // Shape is authored in X (span) / Y (chord); rotate so chord lies along Z.
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 0);
  return geo;
}

function buildFin(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0.1, 1.3);
  s.lineTo(0.7, 1.3);
  s.lineTo(1.0, 0);
  s.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
  // author in X(height up) / Y(length) -> we want height along Y, length along Z
  geo.rotateY(Math.PI / 2);
  return geo;
}

function buildStab(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0.2, 0);
  s.lineTo(2.0, 0.9);
  s.lineTo(2.0, 1.25);
  s.lineTo(0.2, 0.75);
  s.lineTo(0.2, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function makeVapourTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(240,245,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A soft, hot afterburner core: white centre → amber → transparent. */
function makeBurnerTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,236,190,0.95)');
  grad.addColorStop(0.5, 'rgba(255,168,72,0.6)');
  grad.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Build the shared jet materials (owned + disposed by the caller). */
export function makeJetMaterials(): JetMaterials & { all: THREE.Material[] } {
  const skin = new THREE.MeshStandardMaterial({ color: 0x54606b, roughness: 0.55, metalness: 0.7 });
  const skinDark = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.6, metalness: 0.75 });
  const canopy = new THREE.MeshStandardMaterial({
    color: 0x0a1622,
    roughness: 0.12,
    metalness: 0.9,
    emissive: 0x122436,
    emissiveIntensity: 0.4,
  });
  const burner = new THREE.MeshBasicMaterial({
    color: 0xffd089,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const vapour = new THREE.MeshBasicMaterial({ visible: false });
  const all = [skin, skinDark, canopy, burner, vapour];
  return { skin, skinDark, canopy, burner, vapour, all };
}

/** Solve for the flat-ground fall time and lead distance of a released store. */
export function ballistic(altitude: number, gravity: number): { fall: number } {
  return { fall: Math.sqrt((2 * Math.max(1, altitude)) / gravity) };
}

/** Clamp helper re-export so dependents don't each import MathX for one call. */
export const clampN = clamp;
