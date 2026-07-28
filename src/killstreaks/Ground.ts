import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import { FIRE_FRAG, FIRE_VERT, HAZE_FRAG, HAZE_VERT } from '../shaders/killstreak/fire.glsl';
import { SMOKE_FRAG, SMOKE_VERT } from '../shaders/killstreak/smoke.glsl';

/**
 * What is left on the ground afterwards.
 *
 * The aftermath is the half of an airstrike that most games skip, and skipping
 * it is what makes a strike feel like a firework: a street that is back to
 * normal four seconds after a 2000 lb bomb went off in it tells the player that
 * nothing they did mattered. Three systems cover it, all instanced quads with a
 * soft depth fade so nothing cuts a hard line into the road.
 *
 *  - `SmokeColumns` — the thing you can see from the other side of the map.
 *    A source is planted on each crater and pumps rising puffs for half a
 *    minute; the puffs outlive their source, so a column that stops being fed
 *    drifts away and thins rather than switching off.
 *  - `GroundFire` — burning ground, which for napalm is the whole weapon. A
 *    patch is seeded, burns for the best part of a minute, and while it burns
 *    it seeds neighbours: fire spreads, and the spread is what makes a wall of
 *    it read as a fire rather than as a row of flame sprites.
 *  - `DustHaze` — the fines. Everything a blast shakes loose off a hundred
 *    surfaces takes half a minute to settle, and until it does the whole area
 *    is a stop darker and the colour of the ground it came off.
 */

const QUAD_POSITIONS = new Float32Array([
  -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

function quadGeometry(capacity: number): THREE.InstancedBufferGeometry {
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(QUAD_POSITIONS.slice(), 3));
  geo.setIndex(new THREE.BufferAttribute(QUAD_INDEX.slice(), 1));
  geo.instanceCount = 0;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  void capacity;
  return geo;
}

/* ------------------------------- columns --------------------------------- */

interface Puff {
  x: number;
  y: number;
  z: number;
  radius: number;
  growth: number;
  rise: number;
  age: number;
  life: number;
  peak: number;
  spin: number;
  seed: number;
  active: boolean;
}

/** A crater that is still producing smoke. */
interface Vent {
  x: number;
  y: number;
  z: number;
  /** Radius of the puffs this vent makes. */
  scale: number;
  /** Seconds between puffs. */
  interval: number;
  next: number;
  left: number;
  active: boolean;
}

/**
 * The smoke columns.
 *
 * Deliberately split into vents and puffs. A vent is a hole in the ground that
 * is burning and it is bookkeeping — twelve floats, no geometry. A puff is a
 * lump of smoke that has already left and no longer cares whether the fire
 * under it is still going. Keeping them separate is what makes the column
 * behave: it builds from the ground up over the first few seconds rather than
 * appearing at full height, it leans downwind with altitude because each puff
 * has been drifting for longer than the one below it, and when the vent finally
 * gives out the column detaches and drifts off intact instead of vanishing.
 *
 * The pool is fixed and a new puff evicts the oldest live one, so a strike that
 * plants twelve vents in a small area degrades by thinning every column rather
 * than by dropping the last four entirely.
 */
export class SmokeColumns {
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly puffAttr: THREE.InstancedBufferAttribute;
  private readonly paramAttr: THREE.InstancedBufferAttribute;
  private readonly puffs: Puff[] = [];
  private readonly vents: Vent[] = [];
  private readonly capacity: number;
  private readonly order: number[] = [];
  private seedCursor = 3;
  private readonly wind = new THREE.Vector3(0.6, 0, 0.25);

  constructor(scene: THREE.Object3D, capacity: number, vents = 14) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      this.puffs.push({
        x: 0, y: 0, z: 0, radius: 1, growth: 1, rise: 1, age: 0,
        life: 1, peak: 1, spin: 0, seed: 0, active: false,
      });
      this.order.push(i);
    }
    for (let i = 0; i < vents; i++) {
      this.vents.push({ x: 0, y: 0, z: 0, scale: 1, interval: 1, next: 0, left: 0, active: false });
    }

    this.geometry = quadGeometry(capacity);
    this.puffAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.paramAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.puffAttr.setUsage(THREE.DynamicDrawUsage);
    this.paramAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aPuff', this.puffAttr);
    this.geometry.setAttribute('aParam', this.paramAttr);

    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.smokecolumn',
      vertexShader: SMOKE_VERT,
      fragmentShader: SMOKE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uSunColor: { value: new THREE.Color(2.4, 1.4, 0.7) },
        uSunDir: { value: new THREE.Vector3(0.3, 0.4, 0.85) },
        uSkyColor: { value: new THREE.Color(0.35, 0.42, 0.55) },
        uDepthTexture: { value: null },
        uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
        uHasDepth: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      premultipliedAlpha: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'killstreak.smoke';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    // Behind the dust, in front of the fire: a column stands *in* the haze.
    this.mesh.renderOrder = 10;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  setDepth(texture: THREE.Texture | null, near: number, far: number, w: number, h: number): void {
    this.material.uniforms.uDepthTexture.value = texture;
    this.material.uniforms.uHasDepth.value = texture ? 1 : 0;
    (this.material.uniforms.uDepthParams.value as THREE.Vector4).set(
      near,
      far,
      1 / Math.max(1, w),
      1 / Math.max(1, h),
    );
  }

  setLighting(sunDir: THREE.Vector3, sunColor: THREE.Color, skyColor: THREE.Color): void {
    (this.material.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir);
    (this.material.uniforms.uSunColor.value as THREE.Color).copy(sunColor);
    (this.material.uniforms.uSkyColor.value as THREE.Color).copy(skyColor);
  }

  setWind(x: number, z: number): void {
    this.wind.set(x, 0, z);
  }

  /**
   * Plants a column on a crater.
   *
   * `scale` is the radius of the puffs, so a 2000 lb crater makes a fatter
   * column than a bomblet; `duration` is how long the hole keeps producing.
   */
  plant(x: number, y: number, z: number, scale: number, duration: number, rate = 5): void {
    let slot: Vent | null = null;
    let least = Infinity;
    for (const vent of this.vents) {
      if (!vent.active) {
        slot = vent;
        break;
      }
      if (vent.left < least) {
        least = vent.left;
        slot = vent;
      }
    }
    if (!slot) return;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.scale = scale;
    slot.interval = 1 / Math.max(0.5, rate);
    // Fire the first puff immediately: a column that takes a fifth of a second
    // to start is a column that is not there in the frame after the blast.
    slot.next = 0;
    slot.left = duration;
  }

  /** One puff, from a vent or from anything else that wants to make smoke. */
  emit(x: number, y: number, z: number, radius: number, life: number, peak: number): void {
    let index = -1;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.puffs[i].active) {
        index = i;
        break;
      }
    }
    if (index < 0) {
      // Evict the puff nearest the end of its life. Oldest-first keeps the
      // *shape* of every column: the crowns thin, the roots stay dense.
      let worst = -1;
      for (let i = 0; i < this.capacity; i++) {
        const p = this.puffs[i];
        const u = p.age / Math.max(0.1, p.life);
        if (u > worst) {
          worst = u;
          index = i;
        }
      }
    }
    const puff = this.puffs[index];
    const seed = (this.seedCursor = (this.seedCursor * 16807) % 2147483647);
    puff.active = true;
    puff.x = x;
    puff.y = y;
    puff.z = z;
    puff.radius = radius;
    puff.growth = radius * 0.11;
    // Hot gas leaves fast and slows as it mixes; the decay is in `update`.
    //
    // Thirteen metres a second, not five. A column is the one part of the
    // aftermath that has to be visible from anywhere on the map, and that means
    // it has to stand well clear of an eighteen-metre roofline — at five metres
    // a second and the decay below, a puff tops out at ten metres and the whole
    // effect photographs as a smudge on the pavement rather than as a plume.
    puff.rise = 13 + (seed % 23) * 0.14;
    puff.age = 0;
    puff.life = life;
    puff.peak = peak;
    puff.spin = (seed % 628) * 0.01;
    puff.seed = seed % 811;
  }

  update(dt: number, time: number): void {
    this.material.uniforms.uTime.value = time;

    for (const vent of this.vents) {
      if (!vent.active) continue;
      vent.left -= dt;
      if (vent.left <= 0) {
        vent.active = false;
        continue;
      }
      vent.next -= dt;
      if (vent.next > 0) continue;
      vent.next += vent.interval;
      // The vent slows down as the fire under it burns out, so the column
      // thins from the bottom instead of being cut off at full density.
      const vigour = Math.min(1, vent.left * 0.09);
      // Jittered off the same deterministic sequence the puffs are seeded
      // from, never off `Math.random`: two runs of the showcase have to
      // produce the same column or the screenshots are not comparable.
      const j = (this.seedCursor % 1000) / 1000 - 0.5;
      const k = ((this.seedCursor >> 7) % 1000) / 1000 - 0.5;
      this.emit(
        vent.x + j * vent.scale * 0.5,
        vent.y + vent.scale * 0.4,
        vent.z + k * vent.scale * 0.5,
        vent.scale * (0.75 + vigour * 0.4),
        15,
        0.74 * (0.45 + vigour * 0.55),
      );
    }

    const a = this.puffAttr.array as Float32Array;
    const p = this.paramAttr.array as Float32Array;
    let live = 0;

    for (let i = 0; i < this.capacity; i++) {
      const puff = this.puffs[i];
      if (!puff.active) continue;
      puff.age += dt;
      if (puff.age >= puff.life) {
        puff.active = false;
        continue;
      }

      puff.y += puff.rise * dt;
      // Buoyancy bleeds off as the gas mixes, but it never goes to nothing:
      // the residual is what keeps the crown climbing for the whole life of
      // the puff and gives the column its taper.
      puff.rise *= 1 - dt * 0.32;
      puff.rise = Math.max(puff.rise, 2.2);
      // Wind bites harder with height, which is what leans a column over.
      const shear = 0.5 + Math.min(2.2, (puff.y - 0) * 0.004) + puff.age * 0.05;
      puff.x += this.wind.x * dt * shear;
      puff.z += this.wind.z * dt * shear;
      puff.radius += puff.growth * dt;
      puff.spin += dt * 0.12;

      const u = puff.age / puff.life;
      // Rolls open in half a second, holds, then dilutes away over the tail.
      const density = Math.min(1, puff.age * 2.2) * (1 - u) * (1 - u * 0.4) * puff.peak;
      // Soot burns off with age: black at the root, pale brown at the crown.
      const soot = Math.min(1, u * 1.35);

      const o = live * 4;
      a[o] = puff.x;
      a[o + 1] = puff.y;
      a[o + 2] = puff.z;
      a[o + 3] = puff.radius;
      p[o] = density;
      p[o + 1] = puff.seed;
      p[o + 2] = soot;
      p[o + 3] = puff.spin;
      live++;
    }

    this.geometry.instanceCount = live;
    this.mesh.visible = live > 0;
    if (live > 0) {
      this.puffAttr.needsUpdate = true;
      this.paramAttr.needsUpdate = true;
    }
  }

  get count(): number {
    return this.geometry.instanceCount;
  }

  clear(): void {
    for (const puff of this.puffs) puff.active = false;
    for (const vent of this.vents) vent.active = false;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}

/* -------------------------------- fire ---------------------------------- */

interface FirePatch {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
  /** Seconds since ignition. */
  age: number;
  life: number;
  intensity: number;
  seed: number;
  /** Seconds until this patch tries to seed a neighbour; -1 when spent. */
  spreadIn: number;
  /** Generations left, so a fire cannot spread across the entire map. */
  generation: number;
  active: boolean;
}

export class GroundFire {
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly fireAttr: THREE.InstancedBufferAttribute;
  private readonly paramAttr: THREE.InstancedBufferAttribute;
  private readonly patches: FirePatch[] = [];
  private readonly capacity: number;
  private seedCursor = 1;
  private liveCount = 0;
  /** Filled by the owner so a spreading fire follows the ground. */
  groundAt: (x: number, z: number) => number = () => 0;

  constructor(scene: THREE.Object3D, capacity: number) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      this.patches.push({
        x: 0, y: 0, z: 0, radius: 1, height: 1, age: 0, life: 1,
        intensity: 1, seed: 0, spreadIn: -1, generation: 0, active: false,
      });
    }

    this.geometry = quadGeometry(capacity);
    this.fireAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.paramAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.fireAttr.setUsage(THREE.DynamicDrawUsage);
    this.paramAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aFire', this.fireAttr);
    this.geometry.setAttribute('aParam', this.paramAttr);

    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.groundfire',
      vertexShader: FIRE_VERT,
      fragmentShader: FIRE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uDepthTexture: { value: null },
        uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
        uHasDepth: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'killstreak.fire';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = 9;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  setDepth(texture: THREE.Texture | null, near: number, far: number, w: number, h: number): void {
    this.material.uniforms.uDepthTexture.value = texture;
    this.material.uniforms.uHasDepth.value = texture ? 1 : 0;
    (this.material.uniforms.uDepthParams.value as THREE.Vector4).set(
      near,
      far,
      1 / Math.max(1, w),
      1 / Math.max(1, h),
    );
  }

  /**
   * Lights a patch. `generation` is how many times it may spread; a napalm
   * strike seeds a line at generation three and lets it find its own shape.
   */
  ignite(
    x: number,
    z: number,
    radius: number,
    life: number,
    intensity: number,
    generation: number,
  ): void {
    let slot: FirePatch | null = null;
    let oldest = -1;
    for (const patch of this.patches) {
      if (!patch.active) {
        slot = patch;
        break;
      }
      const progress = patch.age / Math.max(0.1, patch.life);
      if (progress > oldest) {
        oldest = progress;
        slot = patch;
      }
    }
    if (!slot) return;
    slot.active = true;
    slot.x = x;
    slot.z = z;
    slot.y = this.groundAt(x, z);
    slot.radius = radius;
    slot.height = radius * 1.9;
    slot.age = 0;
    slot.life = life;
    slot.intensity = intensity;
    slot.seed = (this.seedCursor = (this.seedCursor * 16807) % 2147483647) % 997;
    slot.generation = generation;
    slot.spreadIn = generation > 0 ? 0.35 + (slot.seed % 40) * 0.02 : -1;
  }

  update(dt: number, time: number): void {
    this.material.uniforms.uTime.value = time;
    const f = this.fireAttr.array as Float32Array;
    const p = this.paramAttr.array as Float32Array;
    let live = 0;

    for (let i = 0; i < this.capacity; i++) {
      const patch = this.patches[i];
      if (!patch.active) continue;
      patch.age += dt;
      if (patch.age >= patch.life) {
        patch.active = false;
        continue;
      }

      if (patch.spreadIn >= 0) {
        patch.spreadIn -= dt;
        if (patch.spreadIn <= 0) {
          patch.spreadIn = -1;
          this.spread(patch);
        }
      }

      // Fire flares up as the fuel catches, holds, then gutters out.
      const u = patch.age / patch.life;
      const vigour = Math.min(1, patch.age * 3.2) * (1 - u * u * u);
      const grow = 0.7 + 0.3 * Math.min(1, patch.age * 0.8);

      const o = live * 4;
      f[o] = patch.x;
      f[o + 1] = patch.y;
      f[o + 2] = patch.z;
      f[o + 3] = patch.radius * grow;
      p[o] = u;
      p[o + 1] = patch.intensity * vigour;
      p[o + 2] = patch.seed;
      p[o + 3] = patch.height * (0.5 + 0.5 * vigour);
      live++;
    }

    this.liveCount = live;
    this.geometry.instanceCount = live;
    this.mesh.visible = live > 0;
    if (live > 0) {
      this.fireAttr.needsUpdate = true;
      this.paramAttr.needsUpdate = true;
    }
  }

  private spread(from: FirePatch): void {
    const a = (from.seed * 2.399963) % (Math.PI * 2);
    for (let k = 0; k < 2; k++) {
      const angle = a + k * 2.2 + from.age;
      const step = from.radius * (1.0 + (from.seed % 7) * 0.06);
      this.ignite(
        from.x + Math.cos(angle) * step,
        from.z + Math.sin(angle) * step,
        from.radius * 0.88,
        from.life * 0.85,
        from.intensity * 0.9,
        from.generation - 1,
      );
    }
  }

  /** Live patch centres, so the owner can hang heat haze and smoke off them. */
  forEach(fn: (x: number, y: number, z: number, radius: number, vigour: number) => void): void {
    for (const patch of this.patches) {
      if (!patch.active) continue;
      const u = patch.age / patch.life;
      fn(patch.x, patch.y, patch.z, patch.radius, Math.min(1, patch.age * 3) * (1 - u * u));
    }
  }

  get count(): number {
    return this.liveCount;
  }

  clear(): void {
    for (const patch of this.patches) patch.active = false;
    this.liveCount = 0;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}

/* -------------------------------- haze ----------------------------------- */

interface HazeCell {
  x: number;
  y: number;
  z: number;
  radius: number;
  age: number;
  life: number;
  peak: number;
  rise: number;
  drift: number;
  seed: number;
  active: boolean;
}

export class DustHaze {
  private readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly cellAttr: THREE.InstancedBufferAttribute;
  private readonly paramAttr: THREE.InstancedBufferAttribute;
  private readonly cells: HazeCell[] = [];
  private readonly capacity: number;
  private seedCursor = 7;
  private wind = new THREE.Vector3();

  constructor(scene: THREE.Object3D, capacity: number) {
    this.capacity = capacity;
    for (let i = 0; i < capacity; i++) {
      this.cells.push({
        x: 0, y: 0, z: 0, radius: 10, age: 0, life: 20,
        peak: 0.4, rise: 0.2, drift: 0.01, seed: 0, active: false,
      });
    }

    this.geometry = quadGeometry(capacity);
    this.cellAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.paramAttr = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.cellAttr.setUsage(THREE.DynamicDrawUsage);
    this.paramAttr.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aCell', this.cellAttr);
    this.geometry.setAttribute('aParam', this.paramAttr);

    this.material = new THREE.ShaderMaterial({
      name: 'killstreak.dusthaze',
      vertexShader: HAZE_VERT,
      fragmentShader: HAZE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0.42, 0.37, 0.31) },
        uSunColor: { value: new THREE.Color(2.4, 1.4, 0.7) },
        uSunDir: { value: new THREE.Vector3(0.3, 0.4, 0.85) },
        uDepthTexture: { value: null },
        uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
        uHasDepth: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      premultipliedAlpha: true,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = 'killstreak.dust';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    // After the fire, before nothing: this is the last thing in the frame that
    // has any business writing colour into the strike area.
    this.mesh.renderOrder = 11;
    this.mesh.layers.set(Layers.TRANSPARENT_LATE);
    this.mesh.userData.noPrepass = true;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  setDepth(texture: THREE.Texture | null, near: number, far: number, w: number, h: number): void {
    this.material.uniforms.uDepthTexture.value = texture;
    this.material.uniforms.uHasDepth.value = texture ? 1 : 0;
    (this.material.uniforms.uDepthParams.value as THREE.Vector4).set(
      near,
      far,
      1 / Math.max(1, w),
      1 / Math.max(1, h),
    );
  }

  setLighting(sunDir: THREE.Vector3, sunColor: THREE.Color, dust: THREE.Color): void {
    (this.material.uniforms.uSunDir.value as THREE.Vector3).copy(sunDir);
    (this.material.uniforms.uSunColor.value as THREE.Color).copy(sunColor);
    (this.material.uniforms.uColor.value as THREE.Color).copy(dust);
  }

  setWind(x: number, z: number): void {
    this.wind.set(x, 0, z);
  }

  add(
    x: number,
    y: number,
    z: number,
    radius: number,
    life: number,
    peak: number,
    rise: number,
  ): void {
    let slot: HazeCell | null = null;
    let oldest = -1;
    for (const cell of this.cells) {
      if (!cell.active) {
        slot = cell;
        break;
      }
      const progress = cell.age / Math.max(0.1, cell.life);
      if (progress > oldest) {
        oldest = progress;
        slot = cell;
      }
    }
    if (!slot) return;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.radius = radius;
    slot.age = 0;
    slot.life = life;
    slot.peak = peak;
    slot.rise = rise;
    slot.seed = (this.seedCursor = (this.seedCursor * 48271) % 2147483647) % 613;
    slot.drift = 0.004 + (slot.seed % 11) * 0.0006;
  }

  update(dt: number, time: number): void {
    this.material.uniforms.uTime.value = time;
    const c = this.cellAttr.array as Float32Array;
    const p = this.paramAttr.array as Float32Array;
    let live = 0;

    for (const cell of this.cells) {
      if (!cell.active) continue;
      cell.age += dt;
      if (cell.age >= cell.life) {
        cell.active = false;
        continue;
      }
      // A dust cloud rises while it is buoyant, spreads the whole time, and
      // drifts downwind. All three together are what makes it settle rather
      // than dissolve on the spot.
      cell.y += cell.rise * dt;
      cell.rise *= 1 - dt * 0.55;
      cell.x += this.wind.x * dt * 0.35;
      cell.z += this.wind.z * dt * 0.35;
      cell.radius += dt * 0.55;

      const u = cell.age / cell.life;
      // Slow to establish, far slower to clear.
      //
      // The establish used to take two thirds of a second, and it was wrong in
      // a way that ruined the frame the whole set-piece is built around. A
      // ground burst does throw dust instantly — but that is the ejecta plume
      // and the surge ring, both of which the effects system already draws.
      // What this class is for is the pall that is still lying in the street
      // twenty seconds later, and that takes several seconds to billow out and
      // find its level. Establishing it immediately hung a sixteen-metre
      // half-opaque brown sphere over every second crater at the instant of
      // detonation, and since three of them overlapped, the walking line
      // photographed as one flat slab of dark red with the fire behind it.
      const density = Math.min(1, cell.age * 0.35) * (1 - u) * (1 - u * 0.35);

      const o = live * 4;
      c[o] = cell.x;
      c[o + 1] = cell.y;
      c[o + 2] = cell.z;
      c[o + 3] = cell.radius;
      p[o] = cell.peak * density;
      p[o + 1] = cell.seed;
      p[o + 2] = cell.drift;
      p[o + 3] = 0.62;
      live++;
    }

    this.geometry.instanceCount = live;
    this.mesh.visible = live > 0;
    if (live > 0) {
      this.cellAttr.needsUpdate = true;
      this.paramAttr.needsUpdate = true;
    }
  }

  get count(): number {
    return this.geometry.instanceCount;
  }

  clear(): void {
    for (const cell of this.cells) cell.active = false;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
