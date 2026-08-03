// Sequence 6 -- leaving. Dust, altitude, and the jump to lightspeed.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { music, vo, sfx } from './kit.js';
import { dunes, skyDome, twinSuns, desertLights } from '../worlds/desert.js';
import { landingPad, rockSpire, crates } from '../models/props.js';
import { freighter } from '../models/civilian.js';
import { planet } from '../worlds/planet.js';
import { starfield, nebulaSky } from '../worlds/space.js';
import { CameraRig } from '../core/camera.js';
import { radialGlow, smokeSprite } from '../gfx/textures.js';
import { clamp, lerp, smoothstep, Ease } from '../util/math.js';
import { RNG } from '../util/rng.js';

const DURATION = 27;
const JUMP_T = 17.6;

export default {
  id: 'departure',
  duration: DURATION,
  fadeIn: 0.7,
  fadeOut: 0.8,
  cues: [
    music('departure', 0.4, { gain: 0.95 }),
    sfx('wind', 0, { dur: 9, vel: 0.55 }),
    vo('n12', 1.0),
    sfx('engineBed', 2.2, { dur: 15, vel: 0.9, freq: 52, cutoff: 260 }),
    sfx('flyby', 8.6, { vel: 0.8, dur: 1.4 }),
    vo('r2', 10.2),
    sfx('hyperjump', JUMP_T - 1.7, { vel: 1.0 }),
    vo('n13', 21.4),
  ],

  build() {
    const { scene, camera } = makeStage({
      background: 0xbfd0e0,
      fog: new THREE.FogExp2(0xc8a882, 0.0006),
      fov: 44, near: 0.3, far: 60000,
    });
    scene.add(camera);

    const sky = skyDome({
      radius: 9000,
      stops: [[0, '#ffd9a8'], [0.12, '#e8b98c'], [0.4, '#7f9dc0'], [1, '#1a2c50']],
    });
    scene.add(sky);
    const suns = twinSuns({ azimuth: -0.5, elevation: 0.14, separation: 0.05, distance: 7200, scale: 1.2, intensity: 1.0 });
    scene.add(suns);
    const lights = desertLights(scene, { azimuth: -0.5, elevation: 0.16, keyColor: 0xffd0a0, keyIntensity: 3.4, skyIntensity: 1.3 });

    const ground = dunes({ size: 5000, segments: 130, seed: 44, amplitude: 30, base: [198, 158, 112] });
    scene.add(ground);
    const h = ground.userData.height;

    const pad = landingPad({ radius: 26, scale: 1 });
    pad.position.set(0, h(0, 0) + 1.4, 0);
    scene.add(pad);
    const cr = crates({ count: 9, seed: 3, scale: 1.4 });
    cr.position.set(-19, h(0, 0) + 1.6, 12);
    scene.add(cr);
    for (let i = 0; i < 5; i++) {
      const r = rockSpire({ scale: 8 + i * 3, seed: 40 + i, tall: 1.9 });
      const a = 0.9 + i * 0.9;
      const d = 220 + i * 90;
      r.position.set(Math.sin(a) * d, h(Math.sin(a) * d, -Math.cos(a) * d) - 6, -Math.cos(a) * d);
      scene.add(r);
    }

    // Space layer, revealed once we climb out of atmosphere.
    const space = new THREE.Group();
    space.visible = false;
    scene.add(space);
    space.add(nebulaSky({ radius: 42000, seed: 91, density: 0.6, hueA: [50, 34, 130], hueB: [150, 50, 70] }));
    space.add(starfield({ count: 2600, radius: 30000 }));
    const world = planet({ radius: 7000, seed: 21, sunDir: [-0.5, 0.3, 0.7], atmosphere: 0x8ec4ff, segments: 48 });
    world.position.set(0, -7300, 0);
    space.add(world);

    const shipFill = new THREE.DirectionalLight(0xcfe0f5, 1.4);
    shipFill.position.set(60, 30, 120);
    scene.add(shipFill);

    const ship = freighter({ scale: 1.0 });
    scene.add(ship);

    // Lift-off dust.
    const dust = [];
    const rr = new RNG(7);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({
        map: smokeSprite(), color: 0xc9a878, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.userData = { a: rr.float(0, Math.PI * 2), sp: rr.float(6, 20), ph: rr.float(0, 1) };
      scene.add(m);
      dust.push(m);
    }

    // Hyperspace: star streaks are line segments that stretch along the axis of
    // travel. (Points would just render as a field of expanding blobs.)
    const streakCount = 700;
    const sr = new RNG(13);
    const streakBase = [];
    const sp = new Float32Array(streakCount * 6);
    for (let i = 0; i < streakCount; i++) {
      const a = sr.float(0, Math.PI * 2);
      const rad = sr.float(3, 46) ** 1.35 + 2;
      streakBase.push([Math.cos(a) * rad, Math.sin(a) * rad, sr.float(0, 2000)]);
    }
    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const streaks = new THREE.LineSegments(streakGeo, new THREE.LineBasicMaterial({
      color: 0xcfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    }));
    streaks.frustumCulled = false;
    streaks.visible = false;
    scene.add(streaks);

    // The tunnel the streaks live in.
    const tunnel = new THREE.Mesh(
      new THREE.CylinderGeometry(150, 150, 1800, 24, 1, true),
      new THREE.MeshBasicMaterial({
        map: radialGlow({ inner: 'rgba(180,215,255,0.55)', mid: 'rgba(90,150,255,0.2)', outer: 'rgba(0,0,0,0)' }),
        color: 0x88b8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        side: THREE.BackSide, depthWrite: false, toneMapped: false,
      }),
    );
    tunnel.rotation.x = Math.PI / 2;
    tunnel.visible = false;
    scene.add(tunnel);

    const rig = new CameraRig(camera);
    rig.handheld = 0.01;

    // Flight: sit on the pad, lift, climb out, jump.
    const shipPos = new THREE.Vector3();
    const flight = (t) => {
      const lift = clamp((t - 2.4) / 4.2);
      const climb = clamp((t - 6.2) / 9);
      // Climb at roughly 35 degrees so the ship keeps a flying attitude
      // instead of standing on its tail.
      shipPos.set(
        Math.sin(climb * 1.2) * 90 * climb,
        h(0, 0) + 4 + Ease.inQuad(lift) * 26 + Ease.inOutQuad(climb) * 1500,
        -Ease.inQuad(climb) * 2600,
      );
      return shipPos;
    };

    rig.setTrack([
      // Shot 1: low, past the crates, as she lifts off.
      { t: 0, pos: [40, h(40, 44) + 3.4, 44], look: () => new THREE.Vector3(0, h(0, 0) + 8, 0), fov: 44 },
      { t: 8.4, pos: [30, h(30, 38) + 6.5, 38], look: (t) => flight(t), fov: 42, ease: Ease.inOutQuad },
      // Shot 2: chase, climbing away from the desert.
      { t: 8.401, cut: true, pos: (t) => flight(t).clone().add(new THREE.Vector3(-66, 26, 148)), look: (t) => flight(t), fov: 40 },
      { t: 15.6, pos: (t) => flight(t).clone().add(new THREE.Vector3(-40, 16, 112)), look: (t) => flight(t), fov: 38, ease: Ease.linear },
      // Shot 3: behind the engine as it goes to lightspeed.
      { t: 15.601, cut: true, pos: (t) => flight(t).clone().add(new THREE.Vector3(-34, 15, 88)), look: (t) => flight(t), fov: 44 },
      { t: DURATION, pos: (t) => flight(t).clone().add(new THREE.Vector3(-26, 12, 78)), look: (t) => flight(t), fov: 48, ease: Ease.inQuad },
    ]);

    const forward = new THREE.Vector3();
    let prev = flight(0).clone();

    return {
      scene,
      camera,
      bloom: 0.85,

      update(t, dt) {
        const p = flight(t);
        ship.position.copy(p);
        forward.subVectors(p, prev);
        if (forward.lengthSq() > 1e-5) ship.lookAt(p.clone().add(forward));
        prev.copy(p);
        ship.rotation.z = Math.sin(t * 0.7) * 0.06;

        ship.userData.setGear(t < 3.4);
        const throttle = clamp((t - 2.0) / 3) * 0.7 + smoothstep(12, JUMP_T, t) * 0.5;
        ship.userData.setThrottle(clamp(throttle));

        // Dust kicked up during lift-off.
        const kick = smoothstep(2.2, 3.2, t) * (1 - smoothstep(5.5, 8.5, t));
        dust.forEach((m) => {
          const d = m.userData;
          const age = ((t - 2.2) * 0.35 + d.ph) % 1;
          m.position.set(Math.cos(d.a) * age * d.sp * 2.4, h(0, 0) + 1 + age * 8, Math.sin(d.a) * age * d.sp * 2.4);
          m.scale.setScalar(1 + age * 3.2);
          m.material.opacity = kick * Math.sin(age * Math.PI) * 0.5;
          m.quaternion.copy(camera.quaternion);
        });

        // Fade the sky out and the stars in as we climb.
        const alt = clamp((p.y - 200) / 1400);
        sky.material.opacity = 1 - alt;
        sky.material.transparent = true;
        space.visible = alt > 0.02;
        if (scene.fog) scene.fog.density = 0.0006 * (1 - alt);
        scene.background.setRGB(
          lerp(0.75, 0, alt), lerp(0.81, 0, alt), lerp(0.88, 0, alt),
        );
        ground.visible = alt < 0.98;

        // The jump: stars smear into lines, the tunnel comes up, and the ship
        // rides in the middle of it.
        const jump = clamp((t - JUMP_T) / 1.1);
        const streakA = smoothstep(JUMP_T - 0.3, JUMP_T + 0.45, t);
        streaks.visible = streakA > 0.01;
        streaks.material.opacity = streakA * 0.9;
        streaks.position.copy(p);
        streaks.quaternion.copy(ship.quaternion);
        tunnel.visible = streakA > 0.01;
        tunnel.material.opacity = streakA * 0.5;
        tunnel.position.copy(p);
        tunnel.quaternion.copy(ship.quaternion);
        tunnel.rotateX(Math.PI / 2);
        if (streaks.visible) {
          // Local +Z is the ship's nose; stars run from ahead of the ship back
          // past the camera, which sits at roughly z = -80.
          const len = 14 + Ease.inQuad(jump) * 950;
          const speed = 700 + jump * 4800;
          const span = 2000;
          const travelled = (t - JUMP_T + 0.6) * speed;
          const arr = streakGeo.attributes.position.array;
          for (let i = 0; i < streakCount; i++) {
            const b = streakBase[i];
            let z = b[2] - travelled;
            z = ((z % span) + span) % span - 400;   // wrap into [-400, 1600]
            arr[i * 6] = b[0]; arr[i * 6 + 1] = b[1]; arr[i * 6 + 2] = z;
            arr[i * 6 + 3] = b[0]; arr[i * 6 + 4] = b[1]; arr[i * 6 + 5] = z + len;
          }
          streakGeo.attributes.position.needsUpdate = true;
        }
        this.flash = smoothstep(JUMP_T - 0.1, JUMP_T + 0.05, t) * (1 - smoothstep(JUMP_T + 0.05, JUMP_T + 0.55, t)) * 1.3;

        rig.update(t);
      },

      dispose() {},
    };
  },
};
