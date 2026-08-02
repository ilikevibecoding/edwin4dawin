import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene, nodesLike } from './_kit.js';
import { starfield } from '../engine/stars.js';
import { BoltPool, Explosions, engineFlare, SpritePool, flashTexture, fireTexture } from '../engine/effects.js';
import { C, FINISH } from '../lego/palette.js';
import { mat } from '../lego/materials.js';
import { boxGeo, studGeo, sphereGeo, ringGeo } from '../lego/parts.js';
import { ramp, ease, clamp, lerp, TAU } from '../engine/util.js';
import { RNG } from '../engine/rng.js';

/*
 * Chapter 8 -- the trench run.
 *
 * Two problems the staging has to solve. First scale: the station is a plate,
 * and a plate has edges, so the establishing shots keep the camera down among
 * the hardware and the plate is bent over a sphere (see sets/deathstar_surface)
 * so it falls off its own horizon long before the rim is in frame. Second the
 * ending: a moon coming apart is the climax of the film, so the blast is built
 * out of closed-form pieces -- flash, shockwave, brick debris, embers -- rather
 * than a particle system, because the film is rendered by seeking to arbitrary
 * times and a pool that has not been played forward is empty.
 */

const TRENCH_LEN = 1400;
const DEPTH = 30;                 // trench depth; its lip sits at deck level
const DECK_Z = -60;               // where the plates are centred
const TRENCH_Z = -TRENCH_LEN * 0.5 + 200;
const FLY_Y = -DEPTH + 9;         // hero altitude inside the trench
const CRUISE_Y = 48;              // hero altitude over the deck
const BLAST = new THREE.Vector3(0, -80, -520);

export default {
  id: 'trench',
  dur: 55,
  async build(ctx) {
    const root = new THREE.Group();
    const rng = new RNG(66613);
    setupScene(ctx, 'space', { background: 0x04060b, envIntensity: 0.22 });
    root.add(starfield({ count: 2200, radius: 9000, seed: 5, size: 2.6 }));

    // --- the station ------------------------------------------------------
    // Two plates: a fine one under the action, and a coarse one bent over a
    // 2400-stud sphere that carries the horizon. They share a centre, the
    // coarse one is hollow where the fine one sits, and both leave a corridor
    // open along Z for the trench to drop into.
    const surface = await tryMake('deathstar_surface',
      { size: 1600, cell: 20, slot: 36, seed: 66613 },
      { size: [1600, 4, 1600], color: C.darkBluishGray });
    surface.position.set(0, 0, DECK_Z);
    root.add(surface);

    const horizon = await tryMake('deathstar_surface',
      { size: 4800, cell: 50, slot: 60, hollow: 800, curve: 2400, flatR: 1150, seed: 20431 },
      { size: [4800, 4, 4800], color: C.darkBluishGray });
    horizon.position.set(0, 0, DECK_Z);
    root.add(horizon);

    const trench = await tryMake('trench', { length: TRENCH_LEN, shoulder: 20 }, { size: [40, 30, TRENCH_LEN], color: C.darkBluishGray });
    trench.position.set(0, -DEPTH, TRENCH_Z);
    root.add(trench);
    const port = trench.userData?.nodes?.exhaustPort;

    // Hiding the trench group would take its practicals and its raking key
    // with it, and the debris still has to be lit after the station is gone.
    const trenchMeshes = [];
    const trenchLights = [];
    trench.traverse((o) => {
      if (o.isMesh) trenchMeshes.push(o);
      else if (o.isLight) trenchLights.push({ light: o, i0: o.intensity });
    });
    const deckMeshes = [];
    for (const g of [surface, horizon]) g.traverse((o) => { if (o.isMesh) deckMeshes.push(o); });

    // --- flight -----------------------------------------------------------
    const hero = await tryMake('xwing', {}, { size: [22, 6, 30], color: C.white });
    root.add(hero);
    hero.userData.setSFoils?.(1);
    const heroEngines = nodesLike(hero, 'engine');
    const heroFlares = heroEngines.map((n) => { const f = engineFlare(C.transNeonOrange, 0.34, 3.4); n.add(f); return f; });
    const heroGuns = nodesLike(hero, 'gun');

    const wing = [];
    for (let i = 0; i < 2; i++) {
      const x = await tryMake('xwing', {}, { size: [22, 6, 30], color: C.white });
      x.userData.setSFoils?.(1);
      for (const n of nodesLike(x, 'engine')) n.add(engineFlare(C.transNeonOrange, 0.30, 3.0));
      root.add(x);
      wing.push(x);
    }

    const ties = [];
    for (let i = 0; i < 3; i++) {
      const tie = await tryMake('tiefighter', {}, { size: [16, 12, 10], color: C.darkBluishGray });
      root.add(tie);
      ties.push(tie);
    }

    const green = new BoltPool(ctx.scene, { max: 90, color: C.transGreen, core: 0xd8ffd0, radius: 0.18, length: 6, speed: 300 });
    const red = new BoltPool(ctx.scene, { max: 60, color: C.transRed, core: 0xffd8d0, radius: 0.16, length: 5, speed: 300 });
    const boom = new Explosions(ctx.scene, { seed: 909, colors: [C.lightBluishGray, C.white, C.darkBluishGray] });
    const sparks = new SpritePool(ctx.scene, { max: 70, texture: flashTexture() });

    // --- beats ------------------------------------------------------------
    const r1 = ctx.cue('r1', 1.0);
    const r2c = ctx.cue('r2', 3.9);
    const r3 = ctx.cue('r3', 12.8);
    const r4 = ctx.cue('r4', 19.7);
    const r5 = ctx.cue('r5', 25.5);
    const r6 = ctx.cue('r6', 30.4);
    const DIVE_END = 12.2;                    // wheels-down in the trench
    // The mix is already cut: the shot, the hit and the station going are
    // 0.2 / 1.3 / 2.9 seconds after the last line (see tools/sfx-cues.js).
    const FIRE = ctx.cueEnd('r6', 34.1) + 0.2;
    const HIT = ctx.cueEnd('r6', 34.1) + 1.3;
    const BLOW = ctx.cueEnd('r6', 34.1) + 2.9;
    const RUN_END = ctx.dur - 3.0;

    // hero path: a fast run across the deck, then down into the trench, then
    // up and out of it the moment the shot goes home
    const V_RUN = (TRENCH_LEN - 260) / (RUN_END - DIVE_END);
    const V_APP = 62;
    const Z_ENTER = 130;
    const Z_START = Z_ENTER + V_RUN * DIVE_END + (V_APP - V_RUN) * DIVE_END * 0.5;
    const heroAt = (t) => {
      const a = clamp(ramp(t, 0, DIVE_END), 0, 1);
      const dive = clamp(ramp(t, 3.1, DIVE_END), 0, 1);
      const run = clamp(ramp(t, DIVE_END, RUN_END), 0, 1);
      const climb = ease.outQuad(clamp(ramp(t, HIT + 0.15, HIT + 3.6), 0, 1));
      // approach speed decays into the trench-run speed, so the handover at
      // DIVE_END has no kink in it
      const z = (t < DIVE_END)
        ? Z_START - V_RUN * t - (V_APP - V_RUN) * (t - t * t / (2 * DIVE_END))
        : Z_ENTER - run * (TRENCH_LEN - 260);
      const y = lerp(CRUISE_Y, FLY_Y, ease.inOutCubic(dive)) + climb * 215;
      const x = Math.sin(t * 0.9) * (1 - run * 0.55) * 3.2 + lerp(150, 0, ease.inOutCubic(dive)) - climb * 40;
      return new THREE.Vector3(x, y + Math.sin(t * 1.7) * 0.8 * (1 - a), z);
    };

    // survivors running for it, on a line that passes the finale camera
    const ESC_A = new THREE.Vector3(90, 24, -540);
    const ESC_DIR = new THREE.Vector3(0.499, 0.258, 0.827).normalize();
    const ESC_SPD = 260;
    const escAt = (t, i = 0) => {
      const s = Math.max(0, t - (BLOW + 1.0)) * ESC_SPD - (i ? 150 : 0);
      const v = ESC_A.clone();
      if (i) v.add(new THREE.Vector3(-64, -34, 30));
      return v.addScaledVector(ESC_DIR, s);
    };

    // ================= the blast ==========================================
    // Everything below is a closed-form function of (t - BLOW): the film is
    // rendered by seeking, so nothing here may depend on having been played.

    // Whiteout: a shell big enough to contain the camera, drawn last with the
    // depth test off, so the frame goes to white however the shot is framed.
    const shellMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1), transparent: true, opacity: 1,
      depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      side: THREE.BackSide, toneMapped: false,
    });
    const shell = new THREE.Mesh(sphereGeo(1, 12, 8), shellMat);
    shell.scale.setScalar(7000);
    shell.position.copy(BLAST);
    shell.renderOrder = 999;
    shell.frustumCulled = false;
    root.add(shell);

    // The fireball itself. A billboard with a radial falloff, not a sphere:
    // additive geometry with a hard silhouette reads as a flat disc, and a
    // stack of them saturates to a white card.
    const coreMat = new THREE.MeshBasicMaterial({
      map: fireTexture(), color: new THREE.Color(1, 1, 1), transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), coreMat);
    core.position.copy(BLAST);
    core.frustumCulled = false;
    core.renderOrder = 3;
    root.add(core);

    // Two shockwave rings in the plane of the station.
    const ringMesh = (rIn, colour) => {
      const m = new THREE.Mesh(ringGeo(rIn, 1.0, 128).clone(), new THREE.MeshBasicMaterial({
        color: colour, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.copy(BLAST);
      m.frustumCulled = false;
      m.renderOrder = 4;
      root.add(m);
      return m;
    };
    const ringA = ringMesh(0.90, new THREE.Color(5.5, 4.4, 2.6));
    const ringB = ringMesh(0.55, new THREE.Color(2.6, 1.1, 0.45));

    // --- brick debris ------------------------------------------------------
    // A LEGO station comes apart into LEGO. One 2x1 brick with its studs on,
    // instanced, uniformly scaled, ballistic and deterministic.
    const debrisGeo = (() => {
      const parts = [boxGeo(2, 1.2, 1, 0.03).clone()];
      for (const dx of [-0.5, 0.5]) {
        const s = studGeo(0.3, 0.24, 8).clone();
        s.translate(dx, 0.6, 0);
        parts.push(s);
      }
      const g = mergeGeometries(parts, false);
      // instanceColor is only sampled by the shader when the material asks for
      // vertex colours, so the geometry needs a white colour attribute to sit
      // under it.
      const n = g.attributes.position.count;
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
      return g;
    })();
    const debrisMat = mat(0xffffff, FINISH.SOLID).clone();
    debrisMat.vertexColors = true;
    debrisMat.color = new THREE.Color(1, 1, 1);

    const DEBRIS = 620;
    const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, DEBRIS);
    debris.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DEBRIS * 3).fill(1), 3);
    debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    debris.frustumCulled = false;
    debris.castShadow = debris.receiveShadow = false;
    root.add(debris);

    const DEBRIS_TONES = [C.lightBluishGray, C.lightBluishGray, C.veryLightGray, C.darkBluishGray, C.darkGray, C.white]
      .map((c) => new THREE.Color(c).convertSRGBToLinear());
    const chunks = [];
    for (let i = 0; i < DEBRIS; i++) {
      const th = rng.range(0, TAU);
      const el = Math.pow(rng.next(), 0.75) * 1.2;
      const slab = rng.next() < 0.14;
      const size = slab ? rng.range(12, 30) : rng.range(2.2, 9.5);
      chunks.push({
        origin: new THREE.Vector3(
          BLAST.x + rng.gauss(0, 150),
          BLAST.y + rng.range(-30, 90),
          BLAST.z + rng.gauss(0, 300),
        ),
        dir: new THREE.Vector3(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el)),
        speed: rng.range(34, 165) * (slab ? 0.42 : 1) * (1 - size * 0.02),
        size,
        t0: rng.range(0, 0.5),
        rot: new THREE.Euler(rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)),
        spin: new THREE.Vector3(rng.gauss(0, 1.5), rng.gauss(0, 1.5), rng.gauss(0, 1.5)),
        tone: DEBRIS_TONES[rng.int(0, DEBRIS_TONES.length - 1)],
      });
    }

    // --- fire blobs --------------------------------------------------------
    // Additive spheres: the fireball rolling out of the trench when the shot
    // lands, then the body of the blast itself.
    const blobGeo = sphereGeo(1, 12, 8).clone();
    {
      const n = blobGeo.attributes.position.count;
      blobGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    }
    const BLOBS = 116;
    const blobs = new THREE.InstancedMesh(blobGeo, new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    }), BLOBS);
    blobs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BLOBS * 3).fill(1), 3);
    blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    blobs.frustumCulled = false;
    blobs.renderOrder = 3;
    root.add(blobs);

    const puffs = [];
    // fire walking back up the trench from the port between the hit and the
    // station going
    for (let i = 0; i < 26; i++) {
      const z = TRENCH_Z - 620 + i * 52 + rng.range(0, 40);
      puffs.push({
        t0: HIT + 0.05 + i * 0.055 + rng.range(0, 0.12),
        ttl: rng.range(1.6, 3.0),
        origin: new THREE.Vector3(rng.gauss(0, 9), -DEPTH + rng.range(0, 14), z),
        dir: new THREE.Vector3(rng.gauss(0, 0.5), 1.5 + rng.next(), rng.gauss(0, 0.4)).normalize(),
        speed: rng.range(24, 60),
        s0: rng.range(6, 14), s1: rng.range(40, 92),
        hot: new THREE.Color(4.4, 1.9, 0.5),
      });
    }
    // the station going
    for (let i = 0; i < 90; i++) {
      const th = rng.range(0, TAU);
      const el = Math.pow(rng.next(), 0.8) * 1.25;
      puffs.push({
        t0: BLOW + rng.range(0, 0.7),
        ttl: rng.range(2.6, 8.5),
        origin: BLAST.clone().add(new THREE.Vector3(rng.gauss(0, 110), rng.range(-40, 70), rng.gauss(0, 210))),
        dir: new THREE.Vector3(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el)),
        speed: rng.range(30, 130),
        s0: rng.range(30, 90), s1: rng.range(160, 420),
        hot: new THREE.Color(rng.range(4.5, 8), rng.range(2.2, 3.6), rng.range(0.5, 1.1)),
      });
    }

    // --- embers ------------------------------------------------------------
    const EMB = 1100;
    const embPos = new Float32Array(EMB * 3);
    const embCol = new Float32Array(EMB * 3);
    const embSize = new Float32Array(EMB);
    const embGeo = new THREE.BufferGeometry();
    embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
    embGeo.setAttribute('color', new THREE.BufferAttribute(embCol, 3));
    embGeo.setAttribute('aSize', new THREE.BufferAttribute(embSize, 1));
    const embers = new THREE.Points(embGeo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {},
      vertexShader: /* glsl */`
        attribute float aSize; varying vec3 vC;
        void main() {
          vC = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(aSize * 420.0 / max(1.0, -mv.z), 1.2, 30.0);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vC;
        void main() {
          float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
          gl_FragColor = vec4(vC, a);
        }`,
    }));
    embers.frustumCulled = false;
    root.add(embers);

    const sparkSeeds = [];
    for (let i = 0; i < EMB; i++) {
      const th = rng.range(0, TAU);
      const el = Math.pow(rng.next(), 0.6) * 1.35;
      sparkSeeds.push({
        origin: BLAST.clone().add(new THREE.Vector3(rng.gauss(0, 130), rng.range(-30, 80), rng.gauss(0, 260))),
        dir: new THREE.Vector3(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el)),
        speed: rng.range(60, 420),
        t0: rng.range(0, 0.45),
        ttl: rng.range(3.5, 15),
        size: rng.range(0.55, 2.1),
      });
    }

    // Blast key: the debris is lit by the thing it came off.
    const blastLight = new THREE.PointLight(0xffb266, 0, 6000, 1);
    blastLight.position.copy(BLAST);
    root.add(blastLight);
    const portLight = new THREE.PointLight(0xffd8a0, 0, 1400, 1);
    root.add(portLight);

    // ================= camera =============================================
    const SHOT_BLAST = BLOW;
    const SHOT_PASS = BLOW + 5.6;
    const SHOT_TAIL = BLOW + 10.7;

    const shots = new ShotList();
    shots.add({            // 1. thirty pilots, and a floor that has no edges
      t: 0, dur: 3.55, fov: 62, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(-58, 58, 104)),
      look: () => hero.position.clone().add(new THREE.Vector3(12, -26, -155)),
      shake: 0.2, shakeFreq: 15, handheld: 0.6,
    });
    shots.add({            // 2. the trench, running away past the horizon
      t: 3.55, dur: 4.15, fov: 52, ease: 'linear',
      pos: (u) => [132 - u * 40, 44 - u * 10, 150 - u * 118],
      look: (u) => [6, -20, -400 - u * 260],
      shake: 0.12, handheld: 0.5,
    });
    shots.add({            // 3. the run in, with the deck batteries up
      t: 7.7, dur: DIVE_END - 1.2 - 7.7, fov: 58, ease: 'linear',
      pos: () => { const h = hero.position; return [h.x - 30, Math.max(h.y + 14, 18), h.z + 54]; },
      look: () => { const h = hero.position; return [h.x * 0.4, h.y - 10, h.z - 150]; },
      shake: 0.28, shakeFreq: 17,
    });
    shots.add({            // 4. chase cam, dropping into the trench
      t: DIVE_END - 1.2, dur: (r4 - 1.2) - (DIVE_END - 1.2), fov: 58, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(0, 4.6, 34)),
      look: () => hero.position.clone().add(new THREE.Vector3(0, 1.0, -40)),
      shake: 0.35, shakeFreq: 22,
    });
    shots.add({            // 5. reverse: looking back at the pursuing TIEs
      t: r4 - 1.2, dur: 5.0, fov: 52, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(0, 3.2, -34)),
      look: () => ties[0].position,
      shake: 0.4, shakeFreq: 20,
    });
    shots.add({            // 6. low front quarter, wall streaming past
      t: r4 + 3.8, dur: (r6 - 0.6) - (r4 + 3.8), fov: 52, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(10, -5.0, -26)),
      look: () => hero.position.clone().add(new THREE.Vector3(-1, 1.4, 8)),
      shake: 0.45, shakeFreq: 24,
    });
    shots.add({            // 7. down the barrel of the trench to the port
      t: r6 - 0.6, dur: (HIT + 0.45) - (r6 - 0.6), fov: 62, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(0, 3.4, 32)),
      look: () => hero.position.clone().add(new THREE.Vector3(0, -1.6, -80)),
      shake: 0.5, shakeFreq: 26,
    });
    shots.add({            // 8. up and out, the deck spread out underneath
      t: HIT + 0.45, dur: SHOT_BLAST - (HIT + 0.45), fov: 56, ease: 'linear',
      pos: (u) => { const p = hero.position; return [p.x + 30, p.y - 8 + u * 16, p.z + 58]; },
      look: () => hero.position,
      shake: 0.5, shakeFreq: 18,
    });
    shots.add({            // 9. the station goes
      t: SHOT_BLAST, dur: SHOT_PASS - SHOT_BLAST, fov: 46, ease: 'outQuad',
      pos: (u) => [380 + u * 430, 210 + u * 180, 260 + u * 520],
      look: [0, -60, -520],
      shake: (u) => 0.9 * Math.exp(-u * 4),
    });
    shots.add({            // 10. survivors, past the lens
      t: SHOT_PASS, dur: SHOT_TAIL - SHOT_PASS, fov: 44, ease: 'linear',
      pos: (u) => [810 + u * 300, 390 + u * 140, 780 + u * 430],
      look: [0, -60, -520],
      handheld: 0.5,
    });
    shots.add({            // 11. running for the dark
      t: SHOT_TAIL, dur: ctx.dur - SHOT_TAIL, fov: 44, ease: 'linear',
      pos: (u, t) => escAt(t + lerp(1.7, 0.85, u)).add(new THREE.Vector3(112, 48, -78)),
      look: [0, -60, -520],
      handheld: 0.6,
    });

    // firing schedules
    const tieFire = [];
    for (let t = r4 - 3; t < r6; t += 0.34) tieFire.push({ t, which: rng.int(0, 2) });
    const wallHits = [];
    for (let t = DIVE_END; t < r6; t += 0.55) wallHits.push({ t, side: rng.sign() });
    // deck batteries throwing bolts up past the camera on the approach
    const flak = [];
    for (let t = 1.2; t < DIVE_END; t += 0.42) {
      flak.push({
        t,
        from: new THREE.Vector3(rng.sign() * rng.range(55, 400), 5, rng.range(-300, 480)),
        aim: new THREE.Vector3(rng.gauss(0, 0.55), 1, rng.gauss(-0.3, 0.5)),
      });
    }
    let ti = 0, wi = 0, fi = 0, lastT = -1, fired = false, hitDone = false;

    const _m = new THREE.Matrix4();
    const _q = new THREE.Quaternion();
    const _v = new THREE.Vector3();
    const _s = new THREE.Vector3();
    const _e = new THREE.Euler();
    const grade = { uVignette: 0.44, uGrain: 0.032, uAberration: 0.0022 };

    return {
      root,
      shots,
      grade,
      exposure: (t) => (t < BLOW ? 1.8 : 1.8 - 0.5 * Math.exp(-(t - BLOW) * 0.8)),
      update(t, dt) {
        if (t < lastT) { ti = 0; wi = 0; fi = 0; fired = false; hitDone = false; }
        lastT = t;
        const tau = t - BLOW;
        const gone = tau >= 0.02;

        // ---- flight -----------------------------------------------------
        const p = heroAt(t);
        if (tau > -0.2) p.lerp(escAt(t, 0), clamp(ramp(t, BLOW - 0.2, BLOW + 0.7), 0, 1));
        hero.position.copy(p);
        const nxt = heroAt(t + 0.05);
        if (tau > -0.2) nxt.lerp(escAt(t + 0.05, 0), clamp(ramp(t, BLOW - 0.2, BLOW + 0.7), 0, 1));
        hero.lookAt(nxt.x, nxt.y, nxt.z - 1);
        hero.rotation.z = -Math.cos(t * 0.9) * 0.22 * clamp(1 - ramp(t, DIVE_END, DIVE_END + 3), 0.25, 1);
        for (const f of heroFlares) f.userData.set(0.85 + Math.sin(t * 19) * 0.1);

        wing.forEach((x, i) => {
          if (gone) {
            if (i === 1) { x.visible = false; return; }
            x.visible = true;
            const q0 = escAt(t, 1);
            x.position.copy(q0);
            const q1 = escAt(t + 0.05, 1);
            x.lookAt(q1.x, q1.y, q1.z + 0.001);
            x.rotation.z = Math.sin(t * 1.1) * 0.12;
            x.userData.update?.(t, dt);
            return;
          }
          const lag = 0.9 + i * 0.75;
          const q0 = heroAt(t - lag);
          // wide over the deck, tight once the walls close in
          const spread = lerp(38, 9.5, ease.inOutCubic(clamp(ramp(t - lag, 3.1, DIVE_END), 0, 1)));
          x.position.set(q0.x + (i ? spread : -spread), q0.y + 2.2, q0.z + 26 + i * 18);
          const qn = heroAt(t - lag + 0.05);
          x.lookAt(qn.x + (i ? spread : -spread), qn.y + 2.2, qn.z + 25 + i * 18);
          x.rotation.z = -Math.cos((t - lag) * 0.9) * 0.2;
          x.visible = i === 0 ? true : t < r4 + 6.5;
          x.userData.update?.(t, dt);
        });

        ties.forEach((tie, i) => {
          const lag = 1.2 + i * 0.42;
          const q0 = heroAt(t - lag);
          tie.position.set(q0.x + (i - 1) * 6.5, q0.y + 2.0 + i * 0.6, q0.z + 34 + i * 12);
          tie.lookAt(hero.position);
          tie.visible = t > r4 - 5.5 && t < HIT;
          tie.userData.update?.(t, dt);
        });

        // ---- gunnery ----------------------------------------------------
        while (fi < flak.length && flak[fi].t <= t) {
          const f = flak[fi++];
          green.fire(f.from, f.aim.clone().normalize(), { ttl: 2.2, speed: 340 });
        }

        while (ti < tieFire.length && tieFire[ti].t <= t) {
          const f = tieFire[ti++];
          const src = ties[f.which];
          const from = src.position.clone().add(new THREE.Vector3(rng.sign() * 3, 0, -4));
          const to = hero.position.clone().add(new THREE.Vector3(rng.gauss(0, 2.4), rng.gauss(0, 1.6), 0));
          green.fireAt(from, to, { ttl: 0.55 });
          if (rng.next() < 0.35) {
            for (const g of heroGuns.slice(0, 2)) {
              const gp = g.getWorldPosition(new THREE.Vector3());
              red.fire(gp, new THREE.Vector3(0, 0, -1).applyQuaternion(hero.quaternion), { ttl: 0.6 });
            }
          }
        }

        while (wi < wallHits.length && wallHits[wi].t <= t) {
          const h = wallHits[wi++];
          const hp = hero.position.clone().add(new THREE.Vector3(h.side * 17, rng.range(-6, 8), rng.range(-30, 10)));
          for (let i = 0; i < 5; i++) {
            sparks.spawn(hp, {
              ttl: rng.range(0.15, 0.4), size0: 0.6, size1: 0.05,
              vel: new THREE.Vector3(-h.side * rng.range(4, 14), rng.gauss(0, 6), rng.range(20, 60)),
              color: 0xffe0a0,
            });
          }
        }

        // a wingman is lost
        if (t > r4 + 6.2 && t < r4 + 6.6 && !hitDone) {
          hitDone = true;
          boom.boom(wing[1].position.clone(), { scale: 1.2, brickCount: 40, brickSpeed: 26 });
        }

        // the shot
        if (!fired && t >= FIRE) {
          fired = true;
          const target = (port ? port.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, -DEPTH + 1, hero.position.z - 220));
          for (const g of (heroGuns.length ? heroGuns.slice(0, 2) : [hero])) {
            const gp = g.getWorldPosition(new THREE.Vector3());
            red.fireAt(gp, target, { ttl: 1.4, speed: 420 });
          }
        }

        // ---- the station comes apart ------------------------------------
        for (const m of deckMeshes) m.visible = !gone;
        for (const m of trenchMeshes) m.visible = !gone;
        for (const l of trenchLights) {
          l.light.intensity = l.i0 * (tau < 0 ? 1 : lerp(1, 0.42, clamp(ramp(t, BLOW, BLOW + 2.5), 0, 1)));
        }

        // the hit: the port lets go and fire walks back up the trench
        const hitU = clamp(ramp(t, HIT, HIT + 1.4), 0, 1);
        if (t >= HIT - 0.05 && !gone) {
          const pw = port ? port.getWorldPosition(_v.clone()) : new THREE.Vector3(0, -DEPTH, TRENCH_Z - 610);
          portLight.position.set(pw.x, pw.y + 20, pw.z);
          portLight.intensity = 1800 * (1 - hitU * 0.55) * (1 + Math.sin(t * 34) * 0.1);
        } else {
          portLight.intensity = 0;
        }

        // whiteout
        const flashK = tau < 0
          ? (tau > -0.14 ? (tau + 0.14) / 0.14 : 0) * 9
          : 9 * Math.exp(-tau * 4.4);
        shell.visible = flashK > 0.004;
        if (shell.visible) shellMat.color.setRGB(flashK, flashK * 0.99, flashK * 0.96);

        // fireball
        if (tau > -0.1) {
          const u = Math.max(0, tau);
          const r = lerp(40, 980, ease.outQuart(clamp(u / 2.6, 0, 1))) + u * 16;
          core.scale.setScalar(r);
          const fade = Math.exp(-u * 0.42) * (1 - clamp(ramp(t, ctx.dur - 5, ctx.dur), 0, 1));
          const hot = Math.exp(-u * 1.5);
          coreMat.color.setRGB(
            (0.55 + hot * 6.0) * fade,
            (0.16 + hot * 3.4) * fade,
            (0.05 + hot * 1.5) * fade,
          );
          core.visible = fade > 0.004;
        } else {
          core.visible = false;
        }

        // shockwave
        const ringSet = (m, t0, dur, span, peak) => {
          const u = (t - t0) / dur;
          if (u < 0 || u > 1) { m.visible = false; return; }
          m.visible = true;
          m.scale.setScalar(lerp(30, span, ease.outQuart(u)));
          m.material.opacity = peak * Math.pow(1 - u, 1.8) * Math.min(1, u * 14);
        };
        ringSet(ringA, BLOW, 3.9, 2600, 1.0);
        ringSet(ringB, BLOW + 0.22, 6.4, 1750, 0.5);

        // debris
        if (tau > -0.05) {
          const alive = 1 - clamp(ramp(t, ctx.dur - 3.5, ctx.dur), 0, 1) * 0.5;
          for (let i = 0; i < DEBRIS; i++) {
            const c = chunks[i];
            const a = tau - c.t0;
            if (a < 0) { _m.makeScale(0, 0, 0); debris.setMatrixAt(i, _m); continue; }
            _v.copy(c.origin).addScaledVector(c.dir, c.speed * a);
            _e.set(c.rot.x + c.spin.x * a, c.rot.y + c.spin.y * a, c.rot.z + c.spin.z * a);
            _q.setFromEuler(_e);
            const s = c.size * Math.min(1, a / 0.12) * alive;
            _s.set(s, s, s);
            _m.compose(_v, _q, _s);
            debris.setMatrixAt(i, _m);
            const glowK = 1 + 2.4 * Math.exp(-a * 1.1);
            debris.instanceColor.setXYZ(i,
              c.tone.r * glowK, c.tone.g * glowK * 0.86, c.tone.b * glowK * 0.7);
          }
          debris.instanceMatrix.needsUpdate = true;
          debris.instanceColor.needsUpdate = true;
          debris.visible = true;
        } else {
          debris.visible = false;
        }

        // fire blobs (trench flare-up, then the blast)
        let anyBlob = false;
        for (let i = 0; i < BLOBS; i++) {
          const b = puffs[i];
          const u = (t - b.t0) / b.ttl;
          if (u < 0 || u >= 1) { _m.makeScale(0, 0, 0); blobs.setMatrixAt(i, _m); continue; }
          anyBlob = true;
          const a = t - b.t0;
          _v.copy(b.origin).addScaledVector(b.dir, b.speed * a * (1 - u * 0.45));
          const s = lerp(b.s0, b.s1, ease.outCubic(u));
          _s.set(s, s, s);
          _m.compose(_v, _q.identity(), _s);
          blobs.setMatrixAt(i, _m);
          const k = Math.min(1, u * 8) * Math.pow(1 - u, 1.6) * 0.42;
          blobs.instanceColor.setXYZ(i, b.hot.r * k, b.hot.g * k, b.hot.b * k);
        }
        blobs.visible = anyBlob;
        blobs.instanceMatrix.needsUpdate = true;
        blobs.instanceColor.needsUpdate = true;

        // embers
        if (tau > -0.05) {
          embers.visible = true;
          for (let i = 0; i < EMB; i++) {
            const e = sparkSeeds[i];
            const a = tau - e.t0;
            const u = a / e.ttl;
            if (a < 0 || u >= 1) { embSize[i] = 0; continue; }
            const d = e.speed * a * (1 - u * 0.3);
            embPos[i * 3] = e.origin.x + e.dir.x * d;
            embPos[i * 3 + 1] = e.origin.y + e.dir.y * d;
            embPos[i * 3 + 2] = e.origin.z + e.dir.z * d;
            const k = Math.pow(1 - u, 1.4) * Math.min(1, a * 6);
            embCol[i * 3] = 3.4 * k;
            embCol[i * 3 + 1] = (0.9 + 1.4 * Math.exp(-a * 1.6)) * k;
            embCol[i * 3 + 2] = (0.18 + 1.1 * Math.exp(-a * 2.4)) * k;
            embSize[i] = e.size;
          }
          embGeo.attributes.position.needsUpdate = true;
          embGeo.attributes.color.needsUpdate = true;
          embGeo.attributes.aSize.needsUpdate = true;
        } else {
          embers.visible = false;
        }

        blastLight.intensity = tau < 0 ? 0 : 2200 * Math.exp(-tau * 0.30);

        // the grade takes the punch too
        grade.uVignette = tau > 0 ? lerp(0.44, 0.62, clamp(ramp(t, BLOW, BLOW + 2), 0, 1)) : 0.44;
        grade.uAberration = tau > 0 && tau < 3 ? 0.0022 + 0.006 * Math.exp(-tau * 1.6) : 0.0022;

        green.update(dt); red.update(dt);
        boom.update(dt, ctx.camera);
        sparks.update(dt, ctx.camera);
        hero.userData.update?.(t, dt);
        trench.userData.update?.(t, dt);
        surface.userData.update?.(t, dt);
      },
    };
  },
};
