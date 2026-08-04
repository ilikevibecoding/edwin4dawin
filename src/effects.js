import * as THREE from 'three';
import { puffTexture } from './textures.js';
import { waveHeight } from './waves.js';

/**
 * Sprite-based effects: the wake and spray the hull throws off, powder smoke,
 * the shot itself, and a few gulls to give the scene some scale.
 */

const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
attribute float aRotation;
varying float vAlpha;
varying vec3 vColor;
varying float vRotation;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vRotation = aRotation;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * 420.0 / max(-mvPosition.z, 0.1);
  gl_Position = projectionMatrix * mvPosition;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vColor;
varying float vRotation;
void main() {
  if (vAlpha <= 0.002) discard;
  vec2 uv = gl_PointCoord - 0.5;
  float s = sin(vRotation);
  float c = cos(vRotation);
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c) + 0.5;
  vec4 texel = texture2D(uMap, uv);
  gl_FragColor = vec4(vColor, texel.a * vAlpha);
  #include <colorspace_fragment>
}`;

class Particles {
  constructor(texture, capacity, { blending = THREE.NormalBlending, depthWrite = false } = {}) {
    this.capacity = capacity;
    this.cursor = 0;

    const positions = new Float32Array(capacity * 3);
    const colors = new Float32Array(capacity * 3);
    const sizes = new Float32Array(capacity);
    const alphas = new Float32Array(capacity);
    const rotations = new Float32Array(capacity);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));

    this.geometry = geometry;
    this.points = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: texture } },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite,
        blending,
      }),
    );
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;

    this.velocity = new Float32Array(capacity * 3);
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.growth = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.spin = new Float32Array(capacity);
    this.peak = new Float32Array(capacity);
    this.float = new Float32Array(capacity); // >0: ride the water surface
  }

  spawn({
    position,
    velocity = { x: 0, y: 0, z: 0 },
    size = 1,
    growth = 1,
    life = 1,
    color = [1, 1, 1],
    opacity = 1,
    drag = 0.6,
    gravity = 0,
    spin = 0,
    floats = 0,
  }) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;

    const attributes = this.geometry.attributes;
    attributes.position.setXYZ(i, position.x, position.y, position.z);
    attributes.aColor.setXYZ(i, color[0], color[1], color[2]);
    attributes.aSize.setX(i, size);
    attributes.aAlpha.setX(i, opacity);
    attributes.aRotation.setX(i, Math.random() * Math.PI * 2);

    this.velocity[i * 3] = velocity.x;
    this.velocity[i * 3 + 1] = velocity.y;
    this.velocity[i * 3 + 2] = velocity.z;
    this.age[i] = 0;
    this.life[i] = life;
    this.growth[i] = growth;
    this.drag[i] = drag;
    this.gravity[i] = gravity;
    this.spin[i] = spin;
    this.peak[i] = opacity;
    this.float[i] = floats;
  }

  update(dt, elapsed) {
    const attributes = this.geometry.attributes;
    const position = attributes.position.array;
    const size = attributes.aSize.array;
    const alpha = attributes.aAlpha.array;
    const rotation = attributes.aRotation.array;
    let alive = false;

    for (let i = 0; i < this.capacity; i++) {
      if (this.age[i] >= this.life[i]) {
        if (alpha[i] !== 0) alpha[i] = 0;
        continue;
      }
      alive = true;
      this.age[i] += dt;
      const t = Math.min(this.age[i] / this.life[i], 1);

      const damping = Math.max(0, 1 - this.drag[i] * dt);
      this.velocity[i * 3] *= damping;
      this.velocity[i * 3 + 1] = this.velocity[i * 3 + 1] * damping + this.gravity[i] * dt;
      this.velocity[i * 3 + 2] *= damping;

      position[i * 3] += this.velocity[i * 3] * dt;
      position[i * 3 + 1] += this.velocity[i * 3 + 1] * dt;
      position[i * 3 + 2] += this.velocity[i * 3 + 2] * dt;
      if (this.float[i] > 0) {
        position[i * 3 + 1] = waveHeight(position[i * 3], position[i * 3 + 2], elapsed) + this.float[i];
      }

      size[i] += this.growth[i] * dt;
      rotation[i] += this.spin[i] * dt;
      alpha[i] = this.peak[i] * (1 - t) * Math.min(1, t * 8);
    }

    if (alive || attributes.position.needsUpdate) {
      attributes.position.needsUpdate = true;
      attributes.aSize.needsUpdate = true;
      attributes.aAlpha.needsUpdate = true;
      attributes.aRotation.needsUpdate = true;
      attributes.aColor.needsUpdate = true;
    }
  }
}

/** Flying shot: simple ballistic spheres that splash when they hit the sea. */
class Cannonballs {
  constructor(scene, splash) {
    this.splash = splash;
    this.pool = [];
    this.active = [];
    const geometry = new THREE.SphereGeometry(0.16, 10, 8);
    const material = new THREE.MeshStandardMaterial({ color: '#1d1d21', roughness: 0.6, metalness: 0.6 });
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.castShadow = true;
      scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  launch(position, direction) {
    const mesh = this.pool.pop();
    if (!mesh) return;
    mesh.position.copy(position);
    mesh.visible = true;
    this.active.push({
      mesh,
      velocity: direction.clone().multiplyScalar(58).add(new THREE.Vector3(0, 5.5, 0)),
    });
  }

  update(dt, elapsed) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const shot = this.active[i];
      shot.velocity.y -= 9.81 * dt;
      shot.mesh.position.addScaledVector(shot.velocity, dt);

      const surface = waveHeight(shot.mesh.position.x, shot.mesh.position.z, elapsed);
      if (shot.mesh.position.y <= surface) {
        this.splash(shot.mesh.position.clone().setY(surface));
        shot.mesh.visible = false;
        this.pool.push(shot.mesh);
        this.active.splice(i, 1);
      }
    }
  }
}

/** Circling gulls, wings flapping. */
function createBirds(count = 5) {
  const group = new THREE.Group();
  group.name = 'gulls';
  const body = new THREE.SphereGeometry(0.22, 8, 6);
  const wing = new THREE.PlaneGeometry(1.5, 0.42);
  const material = new THREE.MeshStandardMaterial({
    color: '#f4f6f8',
    roughness: 0.85,
    side: THREE.DoubleSide,
  });

  const birds = [];
  for (let i = 0; i < count; i++) {
    const bird = new THREE.Group();
    const torso = new THREE.Mesh(body, material);
    torso.scale.set(1, 0.8, 2.1);
    bird.add(torso);
    const wings = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      const mesh = new THREE.Mesh(wing, material);
      mesh.position.x = (side * 1.5) / 2;
      mesh.rotation.y = side * 0.12;
      pivot.add(mesh);
      bird.add(pivot);
      wings.push({ pivot, side });
    }
    bird.userData = {
      wings,
      radius: 26 + i * 7,
      height: 17 + i * 3.5,
      speed: 0.16 + i * 0.024,
      phase: i * 1.7,
      flap: 4.5 + i * 0.6,
    };
    group.add(bird);
    birds.push(bird);
  }

  group.userData.update = (elapsed, center) => {
    for (const bird of birds) {
      const { radius, height, speed, phase, flap, wings } = bird.userData;
      const angle = elapsed * speed + phase;
      bird.position.set(
        center.x + Math.cos(angle) * radius,
        center.y + height + Math.sin(elapsed * 0.6 + phase) * 1.6,
        center.z + Math.sin(angle) * radius * 0.8,
      );
      bird.rotation.y = -angle + Math.PI / 2;
      bird.rotation.z = Math.sin(elapsed * 0.6 + phase) * 0.2;
      const beat = Math.sin(elapsed * flap + phase);
      for (const { pivot, side } of wings) pivot.rotation.z = -side * (beat * 0.55 + 0.1);
    }
  };

  return group;
}

export function createEffects(scene) {
  const softPuff = puffTexture({ erode: 14, core: 0.3 });
  const billowPuff = puffTexture({ erode: 26, core: 0.4, seed: 23 });

  const foam = new Particles(softPuff, 900);
  const spray = new Particles(softPuff, 400);
  const smoke = new Particles(billowPuff, 500);
  scene.add(foam.points, spray.points, smoke.points);

  const birds = createBirds();
  scene.add(birds);

  const flash = new THREE.PointLight('#ffb15e', 0, 45, 2);
  scene.add(flash);
  let flashTimer = 0;

  function splash(position) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      spray.spawn({
        position,
        velocity: {
          x: Math.cos(angle) * speed * 0.5,
          y: 4 + Math.random() * 7,
          z: Math.sin(angle) * speed * 0.5,
        },
        size: 0.5 + Math.random() * 0.9,
        growth: 0.8,
        life: 0.9 + Math.random() * 0.5,
        color: [0.94, 0.98, 1.0],
        opacity: 0.95,
        drag: 0.5,
        gravity: -12,
      });
    }
    foam.spawn({
      position,
      size: 1.6,
      growth: 2.6,
      life: 2.4,
      color: [0.95, 0.99, 1.0],
      opacity: 0.8,
      drag: 1,
      floats: 0.1,
    });
  }

  function cannonSmoke(position, direction) {
    flashTimer = 0.12;
    flash.position.copy(position);
    // Along-ship axis, so the puffs from neighbouring guns run into each other
    // and read as one rolling bank of smoke instead of a row of balls.
    const alongX = -direction.z;
    const alongZ = direction.x;
    const puff = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 26; i++) {
      const along = (Math.random() - 0.5) * 4.2;
      puff.x = position.x + alongX * along + (Math.random() - 0.5) * 0.8;
      puff.y = position.y + (Math.random() - 0.5) * 1.3;
      puff.z = position.z + alongZ * along + (Math.random() - 0.5) * 0.8;
      const push = 4 + Math.random() * 12;
      smoke.spawn({
        position: puff,
        velocity: {
          x: direction.x * push + (Math.random() - 0.5) * 1.6,
          y: 0.9 + Math.random() * 1.9,
          z: direction.z * push + (Math.random() - 0.5) * 1.6,
        },
        size: 1.1 + Math.random() * 1.5,
        growth: 3.4 + Math.random() * 2.6,
        life: 3.8 + Math.random() * 2.4,
        color: [0.44, 0.44, 0.47],
        opacity: 0.4,
        drag: 1.5,
        gravity: 0.4,
        spin: (Math.random() - 0.5) * 1.4,
      });
    }
    for (let i = 0; i < 5; i++) {
      smoke.spawn({
        position,
        velocity: {
          x: direction.x * (14 + Math.random() * 10),
          y: 1.2,
          z: direction.z * (14 + Math.random() * 10),
        },
        size: 0.9,
        growth: 3.2,
        life: 0.34,
        color: [1.0, 0.84, 0.45],
        opacity: 0.95,
        drag: 2.4,
      });
    }
  }

  const cannonballs = new Cannonballs(scene, splash);

  /** Foam boiling off the hull, scaled by how fast the ship is moving. */
  let wakeCredit = 0;

  function trailWake(ship, dt, elapsed) {
    const speed = Math.abs(ship.state.speed);
    if (speed < 0.35) return;

    const sin = Math.sin(ship.state.heading);
    const cos = Math.cos(ship.state.heading);
    const origin = ship.root.position;
    // Ship axes in world space.
    const forwardX = sin;
    const forwardZ = cos;
    const rightX = cos;
    const rightZ = -sin;

    wakeCredit += speed * 9 * dt;
    const count = Math.min(14, Math.floor(wakeCredit));
    wakeCredit -= count;

    const emit = (localX, localZ, options) => {
      const x = origin.x + rightX * localX + forwardX * localZ;
      const z = origin.z + rightZ * localX + forwardZ * localZ;
      const spread = options.spread || 0;
      foam.spawn({
        position: { x, y: 0, z },
        velocity: {
          x: rightX * spread + forwardX * (options.push || 0),
          y: 0,
          z: rightZ * spread + forwardZ * (options.push || 0),
        },
        size: options.size,
        growth: options.growth,
        life: options.life,
        color: [0.93, 0.97, 1.0],
        opacity: options.opacity,
        drag: 0.35,
        floats: 0.14,
      });
    };

    for (let i = 0; i < count; i++) {
      // Churned water directly astern.
      emit(-1.8 + Math.random() * 3.6, -14.6 - Math.random() * 2.5, {
        size: 0.8 + Math.random() * 0.9,
        growth: 0.75,
        life: 5 + Math.random() * 3,
        opacity: 0.2 + Math.min(speed / 14, 0.32),
        spread: (Math.random() - 0.5) * 2.6,
        push: -1.2 - Math.random(),
      });

      // Bow waves peeling away on both sides.
      for (const side of [-1, 1]) {
        const along = 6 + Math.random() * 8;
        emit(side * (2.4 + along * 0.16), along, {
          size: 0.5 + Math.random() * 0.7,
          growth: 0.55 + speed * 0.05,
          life: 4.5 + Math.random() * 3,
          opacity: 0.16 + Math.min(speed / 16, 0.3),
          spread: side * (0.9 + Math.random() * 1.1),
          push: -0.4,
        });
      }
    }

    // Bow spray once she is really moving.
    if (speed > 4.2 && Math.random() < speed * dt * 2.4) {
      const bowX = origin.x + forwardX * 15;
      const bowZ = origin.z + forwardZ * 15;
      for (let i = 0; i < 5; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        spray.spawn({
          position: { x: bowX, y: waveHeight(bowX, bowZ, elapsed) + 0.5, z: bowZ },
          velocity: {
            x: forwardX * speed * 0.45 + rightX * side * (2 + Math.random() * 3),
            y: 3 + Math.random() * 4,
            z: forwardZ * speed * 0.45 + rightZ * side * (2 + Math.random() * 3),
          },
          size: 0.45 + Math.random() * 0.6,
          growth: 1.2,
          life: 1.0 + Math.random() * 0.7,
          color: [0.95, 0.99, 1.0],
          opacity: 0.7,
          drag: 0.9,
          gravity: -11,
        });
      }
    }
  }

  function update(dt, elapsed, ship) {
    trailWake(ship, dt, elapsed);
    foam.update(dt, elapsed);
    spray.update(dt, elapsed);
    smoke.update(dt, elapsed);
    cannonballs.update(dt, elapsed);
    birds.userData.update(elapsed, ship.root.position);

    if (flashTimer > 0) {
      flashTimer -= dt;
      flash.intensity = Math.max(0, flashTimer / 0.12) * 1400;
    } else if (flash.intensity !== 0) {
      flash.intensity = 0;
    }
  }

  return {
    update,
    onCannonFire(position, direction) {
      cannonSmoke(position, direction);
      cannonballs.launch(position.clone().addScaledVector(direction, 0.4), direction);
    },
  };
}
