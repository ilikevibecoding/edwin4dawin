import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ShotList } from '../engine/camera.js';
import { tryMake, setupScene, nodesLike } from './_kit.js';
import { starfield } from '../engine/stars.js';
import { BoltPool, Explosions, engineFlare, SpritePool, flashTexture, fireTexture } from '../engine/effects.js';
import { C, FINISH } from '../lego/palette.js';
import { mat, softenGloss } from '../lego/materials.js';
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
    // A fourteen-hundred stud floor seen from a metre above it is nothing but
    // grazing angles, and ABS ships with a clearcoat: any camera that looked
    // back up the trench sat in the deck's mirror lobe and the bottom half of
    // the frame blew to white. The trench is stamped plating, not a polished
    // floor, so take the coat off it.
    softenGloss(trench, { clearcoat: 0.04, clearcoatRoughness: 0.85, env: 0.20, roughness: 0.80 });
    for (const g of [surface, horizon]) {
      softenGloss(g, { clearcoat: 0.04, clearcoatRoughness: 0.85, env: 0.20, roughness: 0.80 });
    }
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

    // Survivors running for it. The line starts exactly where the climb out of
    // the trench left the ship, so the hand-over at BLOW has no jump in it, and
    // it is straight, which is what lets the closing shots be built as "sit on
    // this line, look back down it": the ships then frame themselves against
    // the wreck however fast they are going.
    const ESC0 = heroAt(BLOW);
    const ESC_DIR = new THREE.Vector3(-0.34, 0.46, -0.82).normalize();
    const ESC_V0 = 80, ESC_V1 = 265, ESC_K = 1.1;
    // distance covered by a burn that eases from V0 up to V1
    const escS = (a) => (a <= 0 ? 0
      : ESC_V1 * a - ((ESC_V1 - ESC_V0) / ESC_K) * (1 - Math.exp(-a * ESC_K)));
    const ESC_OFF = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(58, -30, 26)];
    const escAt = (t, i = 0) => ESC0.clone().add(ESC_OFF[i])
      .addScaledVector(ESC_DIR, escS(t - BLOW) - (i ? 165 : 0));

    // ================= the blast ==========================================
    // Everything below is a closed-form function of (t - BLOW): the film is
    // rendered by seeking, so nothing here may depend on having been played.

    // A direction on a slightly flattened sphere. The station was a deck, so
    // the cloud it becomes should be wider than it is tall -- that, and the
    // ring lying in the same plane, is most of what says "this was a disc".
    const SQUASH = 0.82;
    const burstDir = () => {
      const th = rng.range(0, TAU);
      const y = (rng.next() * 2 - 1) * SQUASH;
      const r = Math.sqrt(Math.max(1e-4, 1 - y * y));
      return new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    };

    // Whiteout: a shell big enough to contain the camera, drawn last with the
    // depth test off, so the frame goes to white however the shot is framed.
    // Short -- about a third of a second -- because a long one is not a flash,
    // it is a white card.
    const shellMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1), transparent: true, opacity: 1,
      depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      side: THREE.BackSide, toneMapped: false,
    });
    const shell = new THREE.Mesh(sphereGeo(1, 12, 8), shellMat);
    shell.scale.setScalar(9000);
    shell.position.copy(BLAST);
    shell.renderOrder = 999;
    shell.frustumCulled = false;
    root.add(shell);

    // --- fire --------------------------------------------------------------
    // The fireball is a cloud of soft additive billboards, not one sphere: a
    // sphere has a silhouette and reads as a disc, and a stack of hard-edged
    // additive spheres saturates to a white card. Each quad is kept dim enough
    // that it takes a dozen of them overlapping to reach white, so the hot core
    // and the cooler edge fall out of the density of the cloud rather than
    // being painted in.
    //
    // They are turned to face the camera in the vertex shader. `update` runs
    // before the shot list moves the camera, so an orientation taken from
    // ctx.camera is one step stale -- invisible in playback, but the film is
    // also rendered by seeking, and then it is stale by whole seconds.
    const fires = [];
    // fire walking back up the trench from the port, between the hit and the
    // station letting go
    for (let i = 0; i < 24; i++) {
      const z = TRENCH_Z - 620 + i * 50 + rng.range(0, 36);
      fires.push({
        t0: HIT + 0.05 + i * 0.052 + rng.range(0, 0.1),
        ttl: rng.range(1.3, 2.5),
        origin: new THREE.Vector3(rng.gauss(0, 8), -DEPTH + rng.range(1, 15), z),
        dir: new THREE.Vector3(rng.gauss(0, 0.5), 1.5 + rng.next(), rng.gauss(0, 0.4)).normalize(),
        speed: rng.range(26, 62),
        s0: rng.range(14, 28), s1: rng.range(60, 130),
        peak: rng.range(0.16, 0.30), cool: 1.5,
      });
    }
    const BURST_R = 900;
    // the core: white hot, out fast, gone in three seconds
    for (let i = 0; i < 40; i++) {
      const d = burstDir();
      const r = 300 * Math.pow(rng.next(), 0.5);
      fires.push({
        t0: BLOW + rng.range(0, 0.16),
        ttl: rng.range(2.3, 4.0),
        origin: BLAST.clone().addScaledVector(d, r),
        dir: d, speed: rng.range(130, 350),
        s0: rng.range(200, 420), s1: rng.range(700, 1300),
        peak: rng.range(0.16, 0.28), cool: 0.95,
      });
    }
    // the furnace: what is left of the middle, dim but slow to cool, so the
    // cloud keeps a yellow heart long after its edge has gone to red
    for (let i = 0; i < 26; i++) {
      const d = burstDir();
      const r = 240 * Math.pow(rng.next(), 0.6);
      fires.push({
        t0: BLOW + rng.range(0.1, 0.8),
        ttl: rng.range(7, 14),
        origin: BLAST.clone().addScaledVector(d, r),
        dir: d, speed: rng.range(25, 90),
        s0: rng.range(300, 620), s1: rng.range(800, 1500),
        peak: rng.range(0.16, 0.30), cool: 0.16,
      });
    }
    // the body: the shell of burning hull, lit from inside and cooling. Many
    // and dim rather than few and bright -- a handful of bright quads reads as
    // a bag of marbles, and only the overlap makes it look like fire.
    for (let i = 0; i < 240; i++) {
      const d = burstDir();
      const r = BURST_R * Math.pow(rng.next(), 0.45);
      const big = Math.pow(rng.next(), 1.8);
      fires.push({
        t0: BLOW + 0.05 + (r / BURST_R) * 0.45 + rng.range(0, 0.45),
        ttl: rng.range(4.5, 9.5),
        origin: BLAST.clone().addScaledVector(d, r),
        dir: d, speed: 60 + (r / BURST_R) * 260 + rng.range(0, 90),
        s0: lerp(70, 300, big), s1: lerp(260, 1400, big),
        peak: lerp(0.16, 0.05, big), cool: 0.5,
      });
    }
    // hot spots: small, bright and short, so the cloud has cells in it instead
    // of being one smooth gradient the size of the screen. They keep lighting
    // up for eight seconds, which is what stops the wreck going flat once the
    // fireball proper has cooled.
    for (let i = 0; i < 150; i++) {
      const d = burstDir();
      const r = BURST_R * 1.15 * Math.pow(rng.next(), 0.3);
      const late = rng.next();
      fires.push({
        t0: BLOW + rng.range(0.05, 3.2) + late * late * 5.0,
        ttl: rng.range(1.1, 3.8),
        origin: BLAST.clone().addScaledVector(d, r),
        dir: d, speed: 70 + (r / BURST_R) * 200 + rng.range(0, 120),
        s0: rng.range(40, 130), s1: rng.range(160, 460),
        peak: rng.range(0.20, 0.44), cool: 1.4,
      });
    }
    // the long burn: what is still glowing behind the survivors at the fade
    for (let i = 0; i < 90; i++) {
      const d = burstDir();
      const r = 760 * Math.pow(rng.next(), 0.4);
      fires.push({
        t0: BLOW + rng.range(0.4, 1.6),
        ttl: rng.range(13, 21),
        origin: BLAST.clone().addScaledVector(d, r),
        dir: d, speed: rng.range(40, 150),
        s0: rng.range(300, 820), s1: rng.range(1000, 2800),
        peak: rng.range(0.035, 0.085), cool: 0.25,
      });
    }
    const FIRES = fires.length;
    const fOff = new Float32Array(FIRES * 3);
    const fScl = new Float32Array(FIRES);
    const fCol = new Float32Array(FIRES * 3);
    const fireGeo = new THREE.InstancedBufferGeometry();
    {
      const quad = new THREE.PlaneGeometry(1, 1);
      fireGeo.setAttribute('position', quad.attributes.position);
      fireGeo.setAttribute('uv', quad.attributes.uv);
      fireGeo.setIndex(quad.index);
    }
    const fOffAttr = new THREE.InstancedBufferAttribute(fOff, 3);
    const fSclAttr = new THREE.InstancedBufferAttribute(fScl, 1);
    const fColAttr = new THREE.InstancedBufferAttribute(fCol, 3);
    fireGeo.setAttribute('aOffset', fOffAttr);
    fireGeo.setAttribute('aScale', fSclAttr);
    fireGeo.setAttribute('aColor', fColAttr);
    fireGeo.instanceCount = FIRES;
    const fire = new THREE.Mesh(fireGeo, new THREE.ShaderMaterial({
      uniforms: { uMap: { value: fireTexture() } },
      transparent: true, depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      vertexShader: /* glsl */`
        attribute vec3 aOffset;
        attribute float aScale;
        attribute vec3 aColor;
        varying vec2 vUv;
        varying vec3 vC;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
          // A quad whose centre drifts into the lens paints its hot middle
          // across the whole frame, so fade one out as it comes within about
          // its own radius of the camera.
          vC = aColor * smoothstep(0.25, 0.85, -mv.z / max(1.0, aScale));
          mv.xy += position.xy * aScale;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        varying vec2 vUv;
        varying vec3 vC;
        void main() {
          vec4 tx = texture2D(uMap, vUv);
          // the gradient is authored in sRGB and nothing here decodes it
          gl_FragColor = vec4(tx.rgb * tx.rgb * tx.a * vC, 1.0);
        }`,
    }));
    fire.frustumCulled = false;
    fire.renderOrder = 5;
    root.add(fire);
    const FIRE_HOT = new THREE.Color(1.30, 1.08, 0.90);
    // Not pure red: the gradient in the texture is already orange and the
    // shader squares it, so anything much redder than this comes out as a flat
    // sheet of primary red with no fire in it.
    const FIRE_COOL = new THREE.Color(1.00, 0.50, 0.20);

    // --- shockwave ---------------------------------------------------------
    // Two in the plane of the deck and one across it: a single ring reads as a
    // smoke halo, a crossed pair reads as a planet coming apart.
    const ringMesh = (rIn, colour, orient) => {
      const m = new THREE.Mesh(ringGeo(rIn, 1.0, 128).clone(), new THREE.MeshBasicMaterial({
        color: colour, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
      }));
      m.rotation.copy(orient);
      m.position.copy(BLAST);
      m.frustumCulled = false;
      m.renderOrder = 4;
      root.add(m);
      return m;
    };
    const FLAT = new THREE.Euler(-Math.PI / 2, 0, 0);
    const ringA = ringMesh(0.87, new THREE.Color(3.4, 2.5, 1.5), FLAT);
    const ringB = ringMesh(0.55, new THREE.Color(2.4, 0.9, 0.35), FLAT);
    const ringC = ringMesh(0.90, new THREE.Color(2.8, 2.1, 1.4), new THREE.Euler(0, 0.62, 0.2));

    // --- brick debris ------------------------------------------------------
    // A LEGO station comes apart into LEGO. One 2x1 brick with its studs on,
    // instanced and scaled: small ones are bricks, the big flat ones are sheets
    // of hull, and the studs going with them is the whole point. Speed rises
    // with the radius the piece started at, so the field stays a shell that
    // expands rather than a puff that disperses.
    const debrisGeo = (() => {
      const parts = [boxGeo(2, 1.2, 1, 0).clone()];
      for (const dx of [-0.5, 0.5]) {
        const s = studGeo(0.3, 0.24, 6).clone();
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

    const DEBRIS = 780;
    const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, DEBRIS);
    debris.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DEBRIS * 3).fill(1), 3);
    debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    debris.frustumCulled = false;
    debris.castShadow = debris.receiveShadow = false;
    root.add(debris);

    const toLin = (c) => new THREE.Color(c).convertSRGBToLinear();
    // Two palettes. A 200-stud sheet of hull that draws a dark grey is a black
    // rectangle across the lens with no read on it at all, so the big pieces
    // stay pale and only the small ones get the dark tones.
    const HULL_TONES = [C.veryLightGray, C.white, C.lightBluishGray, C.veryLightGray].map(toLin);
    const BRICK_TONES = [C.lightBluishGray, C.veryLightGray, C.darkBluishGray, C.darkGray, C.white, C.lightBluishGray].map(toLin);
    const chunks = [];
    for (let i = 0; i < DEBRIS; i++) {
      const d = burstDir();
      const r = BURST_R * Math.pow(rng.next(), 0.4);
      const kind = rng.next();
      const slab = kind > 0.82, panel = !slab && kind > 0.42;
      const size = slab ? rng.range(48, 96) : (panel ? rng.range(15, 46) : rng.range(4, 16));
      const flat = slab ? rng.range(0.10, 0.20) : (panel ? rng.range(0.20, 0.40) : rng.range(0.6, 1.0));
      const tones = size > 40 ? HULL_TONES : BRICK_TONES;
      chunks.push({
        origin: BLAST.clone().addScaledVector(d, r)
          .add(new THREE.Vector3(rng.gauss(0, 55), rng.gauss(0, 34), rng.gauss(0, 55))),
        dir: d.clone().add(new THREE.Vector3(rng.gauss(0, 0.15), rng.gauss(0, 0.15), rng.gauss(0, 0.15))).normalize(),
        speed: 45 + (r / BURST_R) * 300 + rng.range(0, 110),
        scale: new THREE.Vector3(size, size * flat, size * rng.range(0.5, 1.0)),
        t0: rng.range(0, 0.32),
        rot: new THREE.Euler(rng.range(0, TAU), rng.range(0, TAU), rng.range(0, TAU)),
        spin: new THREE.Vector3(rng.gauss(0, 1.1), rng.gauss(0, 1.1), rng.gauss(0, 1.1)),
        tone: tones[rng.int(0, tones.length - 1)],
      });
    }

    // --- embers ------------------------------------------------------------
    const EMB = 1400;
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
          // capped small: an ember that fills thirty pixels is not a spark,
          // it is a white orb with a bloom halo round it
          gl_PointSize = clamp(aSize * 420.0 / max(1.0, -mv.z), 1.0, 7.0);
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
      const d = burstDir();
      const r = BURST_R * Math.pow(rng.next(), 0.5);
      sparkSeeds.push({
        origin: BLAST.clone().addScaledVector(d, r),
        dir: d.clone().add(new THREE.Vector3(rng.gauss(0, 0.2), rng.gauss(0, 0.2), rng.gauss(0, 0.2))).normalize(),
        speed: 70 + (r / BURST_R) * 420 + rng.range(0, 160),
        t0: rng.range(0, 0.4),
        ttl: rng.range(4, 19),
        size: rng.range(0.7, 3.2),
      });
    }

    // Blast key: the debris is lit by the thing it came off.
    const blastLight = new THREE.PointLight(0xffb266, 0, 9000, 1);
    blastLight.position.copy(BLAST);
    root.add(blastLight);
    const portLight = new THREE.PointLight(0xffd8a0, 0, 1400, 1);
    root.add(portLight);
    // Key for the survivors. They fly away from the only light left in the
    // shot, so without something from the camera side they are two navy
    // silhouettes on an orange field.
    const escKey = new THREE.DirectionalLight(new THREE.Color(0xc4d6ff).convertSRGBToLinear(), 0);
    escKey.castShadow = false;
    root.add(escKey, escKey.target);
    // The same problem for the wreckage: everything in the blast is lit from
    // the middle of it, which is behind every piece the camera can see.
    const blastFill = new THREE.DirectionalLight(new THREE.Color(0xffd9bb).convertSRGBToLinear(), 0);
    blastFill.position.set(BLAST.x + 1400, BLAST.y + 950, BLAST.z + 1250);
    blastFill.target.position.copy(BLAST);
    blastFill.castShadow = false;
    root.add(blastFill, blastFill.target);

    // ================= camera =============================================
    const SHOT_BLAST = BLOW;
    const SHOT_WAVE = BLOW + 3.0;
    const SHOT_PASS = BLOW + 7.4;
    const SHOT_TAIL = BLOW + 11.7;
    // Real end of the chapter. `ctx.dur` is what the module asks for; the cut
    // comes from timing.json and is a second and a half shorter, so the tail
    // shot has to be paced to the shorter one or it never finishes its move.
    const END = 53.4;

    // The closing shots all sit on the escape line and look back down it, so
    // the survivors frame themselves against the wreck: `lead` is how far
    // ahead of the ships the camera sits, `off` how far off the line.
    const chaseCam = (lead, off) => (u, t) => escAt(t, 0)
      .addScaledVector(ESC_DIR, typeof lead === 'function' ? lead(u) : lead)
      .add(typeof off === 'function' ? off(u) : off);

    const shots = new ShotList();
    shots.add({            // 1. thirty pilots, and a floor that has no edges
      t: 0, dur: 3.55, fov: 62, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(-58, 58, 104)),
      look: () => hero.position.clone().add(new THREE.Vector3(12, -26, -155)),
      shake: 0.2, shakeFreq: 15, handheld: 0.6,
    });
    shots.add({            // 2. the trench, running away past the horizon
      t: 3.55, dur: 4.15, fov: 52, ease: 'linear',
      pos: (u) => [98 - u * 44, 40 - u * 13, 190 - u * 150],
      look: (u) => [4, -22, -520 - u * 300],
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
      pos: () => hero.position.clone().add(new THREE.Vector3(5.5, 4.6, 34)),
      look: () => hero.position.clone().add(new THREE.Vector3(1.5, 1.0, -40)),
      shake: 0.35, shakeFreq: 22,
    });
    shots.add({            // 5. reverse: looking back at the pursuing TIEs
      // Behind the hero's tail rather than ahead of its nose. From in front,
      // the X-wing sits on exactly the line to its own pursuers and hides all
      // three of them behind its fuselage -- the shot is called "the TIEs" and
      // what it showed was a fighter with some dark specks over one shoulder.
      // The fuselage is thirty studs long, so 19 clears the engines by four.
      // Wide, because from four studs off the tail a 52 has the lead TIE's
      // panels running off both edges of the frame.
      t: r4 - 1.2, dur: 5.0, fov: 64, ease: 'linear',
      pos: (u) => hero.position.clone().add(new THREE.Vector3(2.6 - u * 0.9, 2.9 + u * 0.4, 19 + u * 2.6)),
      look: () => ties[0].position,
      shake: 0.4, shakeFreq: 20,
    });
    shots.add({            // 6. low front quarter, looking up past the s-foils
      // Anything here that looks back up the trench along the floor catches the
      // deck's mirror lobe and the bottom half of the frame goes to white. Sit
      // under the flight line and tilt up instead: the fighter is then read
      // against the open strip of sky, and the floor is out of shot entirely.
      t: r4 + 3.8, dur: (r6 - 0.6) - (r4 + 3.8), fov: 52, ease: 'linear',
      pos: (u) => hero.position.clone().add(new THREE.Vector3(13 - u * 4, -6.2 + u * 1.4, -38 + u * 9)),
      look: () => hero.position.clone().add(new THREE.Vector3(-1, 2.4, 6)),
      shake: 0.45, shakeFreq: 24,
    });
    shots.add({            // 7. down the barrel of the trench to the port
      t: r6 - 0.6, dur: (HIT + 0.45) - (r6 - 0.6), fov: 62, ease: 'linear',
      pos: () => hero.position.clone().add(new THREE.Vector3(0, 3.4, 32)),
      look: () => hero.position.clone().add(new THREE.Vector3(0, -1.6, -80)),
      shake: 0.5, shakeFreq: 26,
    });
    shots.add({            // 8. up and out, the deck spread out underneath
      t: HIT + 0.45, dur: SHOT_BLAST - (HIT + 0.45), fov: 58, ease: 'linear',
      pos: (u) => { const p = hero.position; return [p.x + 34, p.y - 12 + u * 14, p.z + 64]; },
      look: () => hero.position.clone().add(new THREE.Vector3(-4, -10, -46)),
      shake: 0.5, shakeFreq: 18,
    });
    shots.add({            // 9. the station goes
      t: SHOT_BLAST, dur: SHOT_WAVE - SHOT_BLAST, fov: 50, ease: 'linear',
      pos: (u) => [700 + u * 300, 560 + u * 200, 380 + u * 340],
      look: [0, -40, -520],
      shake: (u) => 1.0 * Math.exp(-u * 3),
    });
    shots.add({            // 10. the wave, coming through the lens
      t: SHOT_WAVE, dur: SHOT_PASS - SHOT_WAVE, fov: 52, ease: 'linear',
      pos: (u) => [1240 + u * 300 + Math.sin(u * 2.2) * 260, 700 + u * 300, 980 + u * 560],
      look: (u) => [0, -40 + u * 90, -520],
      shake: (u) => 0.5 * Math.exp(-u * 1.6), shakeFreq: 12, handheld: 0.5,
    });
    shots.add({            // 11. survivors, past the lens
      t: SHOT_PASS, dur: SHOT_TAIL - SHOT_PASS, fov: 46, ease: 'linear',
      pos: chaseCam((u) => lerp(300, 34, u), (u) => new THREE.Vector3(70 - u * 26, 42 - u * 16, -28)),
      look: (u, t) => escAt(t, 0).clone().lerp(BLAST, lerp(0.05, 0.20, u)),
      handheld: 0.6,
    });
    shots.add({            // 12. running for the dark, the wreck still burning
      t: SHOT_TAIL, dur: END - SHOT_TAIL, fov: 54, ease: 'linear',
      pos: chaseCam((u) => lerp(130, 380, u), (u) => new THREE.Vector3(80 + u * 42, 58 + u * 26, -30)),
      look: (u, t) => escAt(t, 0).clone().lerp(BLAST, 0.12),
      handheld: 0.5,
    });

    // firing schedules. The TIEs stop well before r6: the line over that beat
    // is "he switched off the targeting computer", and a green bolt going off
    // in the lens is the one thing guaranteed to pull the eye off it.
    const tieFire = [];
    for (let t = r4 - 3; t < r6 - 1.4; t += 0.34) tieFire.push({ t, which: rng.int(0, 2) });
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
    const grade = { uVignette: 0.44, uGrain: 0.032, uAberration: 0.0014 };
    // The trench is built out of white and light bluish gray and the camera is
    // inside it for thirty seconds, so it runs a stop under the rest of the film
    // or every wall panel sits on the clip.
    const RUN_EXPOSURE = 1.58;

    return {
      root,
      shots,
      grade,
      // The lens stops down hard on the flash and opens again over the next
      // few seconds, which is what keeps the fireball from being a white card
      // and lets the wreck still read as orange once it is only embers.
      exposure: (t) => {
        const a = t - BLOW;
        if (a < -0.22) return RUN_EXPOSURE;
        const shut = a < 0 ? (a + 0.22) / 0.22 : Math.exp(-a * 0.35);
        return RUN_EXPOSURE - (RUN_EXPOSURE - 0.65) * shut;
      },
      update(t, dt) {
        if (t < lastT) { ti = 0; wi = 0; fi = 0; fired = false; hitDone = false; }
        lastT = t;
        const tau = t - BLOW;
        const gone = tau >= 0.02;

        // ---- flight -----------------------------------------------------
        const esc = clamp(ramp(t, BLOW - 0.2, BLOW + 0.7), 0, 1);
        const ahead = lerp(0.05, 0.4, esc);   // longer lead once the burn is on
        const p = heroAt(t);
        if (tau > -0.2) p.lerp(escAt(t, 0), esc);
        hero.position.copy(p);
        const nxt = heroAt(t + ahead);
        if (tau > -0.2) nxt.lerp(escAt(t + ahead, 0), esc);
        hero.lookAt(nxt.x, nxt.y, nxt.z - (1 - esc));
        hero.rotation.z = -Math.cos(t * 0.9) * 0.22 * clamp(1 - ramp(t, DIVE_END, DIVE_END + 3), 0.25, 1);
        // long trails once the burn is on: two ships against a burning moon are
        // backlit silhouettes, and the engines are what says they are ours
        for (const f of heroFlares) f.userData.set((0.85 + Math.sin(t * 19) * 0.1) * (1 + esc * 1.5));

        wing.forEach((x, i) => {
          if (gone) {
            if (i === 1) { x.visible = false; return; }
            x.visible = true;
            const q0 = escAt(t, 1);
            x.position.copy(q0);
            const q1 = escAt(t + 0.4, 1);
            x.lookAt(q1.x, q1.y, q1.z);
            x.rotation.z = Math.sin(t * 1.1) * 0.16;
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
          // Our own two trail on the same line the TIEs are closing along, and
          // there is no camera that looks back at the pursuit without putting
          // a wingman in amongst them. Drop them for the length of the reverse
          // and pick them up again on the cut, where nobody can see the join.
          const REV = t > r4 - 1.2 && t < r4 + 3.8;
          x.visible = (i === 0 ? true : t < r4 + 6.5) && !REV;
          x.userData.update?.(t, dt);
        });

        ties.forEach((tie, i) => {
          // The run is 30 studs a second, so the old 1.2 s lag put the lead TIE
          // seventy studs off the hero's tail, in amongst our own wingmen and
          // a hundred and ten from the reverse camera: an eight degree dark
          // hexagon against a dark wall, over a line that says "I have you
          // now". Bring them up to forty and stack them shallowly, which is
          // near enough for the reverse to sit behind the hero's engines and
          // still hold the lead ship at a third of the frame.
          const lag = 0.10 + i * 0.06;
          const q0 = heroAt(t - lag);
          tie.position.set(q0.x + (i - 1) * 7.5, q0.y + 1.6 + i * 0.7, q0.z + 37 + i * 8);
          tie.lookAt(hero.position);
          tie.visible = t > r4 - 5.5 && t < r6 - 0.5;
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
          // Deliberately wide, and wide to one side: the chase cameras sit on
          // the hero's tail, so a bolt aimed dead at him goes through the lens
          // and floods the whole frame green.
          const to = hero.position.clone().add(new THREE.Vector3(
            rng.sign() * rng.range(4.5, 11), rng.gauss(-1.5, 3.4), 0));
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
          l.light.intensity = l.i0 * (tau < 0 ? 1 : lerp(1, 0.85, clamp(ramp(t, BLOW, BLOW + 2.5), 0, 1)));
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

        // whiteout: a quarter of a second of nothing but white, which is what
        // covers the cut from a standing station to a field of wreckage
        const flashK = tau < 0
          ? (tau > -0.1 ? (tau + 0.1) / 0.1 : 0) * 16
          : 16 * Math.exp(-tau * 9);
        shell.visible = flashK > 0.004;
        if (shell.visible) shellMat.color.setRGB(flashK, flashK * 0.985, flashK * 0.95);

        // fire. No fade of its own: the film cross-fades the chapter out over
        // the last three quarters of a second and a second fade on top of that
        // just empties the frame early.
        const tail = 1;
        let anyFire = false;
        for (let i = 0; i < FIRES; i++) {
          const f = fires[i];
          const a = t - f.t0;
          const u = a / f.ttl;
          if (a < 0 || u >= 1) { fScl[i] = 0; continue; }
          anyFire = true;
          const d = f.speed * a * (1 - u * 0.5);
          fOff[i * 3] = f.origin.x + f.dir.x * d;
          fOff[i * 3 + 1] = f.origin.y + f.dir.y * d;
          fOff[i * 3 + 2] = f.origin.z + f.dir.z * d;
          fScl[i] = lerp(f.s0, f.s1, ease.outCubic(u));
          const heat = Math.exp(-a * f.cool);
          const k = f.peak * Math.min(1, a * 9) * Math.pow(1 - u, 1.25) * tail;
          fCol[i * 3] = lerp(FIRE_COOL.r, FIRE_HOT.r, heat) * k;
          fCol[i * 3 + 1] = lerp(FIRE_COOL.g, FIRE_HOT.g, heat) * k;
          fCol[i * 3 + 2] = lerp(FIRE_COOL.b, FIRE_HOT.b, heat) * k;
        }
        fire.visible = anyFire;
        fOffAttr.needsUpdate = true;
        fSclAttr.needsUpdate = true;
        fColAttr.needsUpdate = true;

        // shockwave. Faded out well before the wave overtakes the camera: from
        // inside, a ring is a brown band across the frame.
        const ringSet = (m, t0, dur, span, peak) => {
          const u = (t - t0) / dur;
          if (u < 0 || u > 1) { m.visible = false; return; }
          m.visible = true;
          m.scale.setScalar(lerp(50, span, Math.pow(u, 0.68)));
          m.material.opacity = peak * Math.pow(1 - u, 2.2) * Math.min(1, u * 12) * tail;
        };
        ringSet(ringA, BLOW + 0.04, 5.0, 2900, 0.95);
        ringSet(ringC, BLOW + 0.12, 5.6, 2500, 0.70);
        ringSet(ringB, BLOW + 0.5, 6.6, 3400, 0.34);

        // debris
        if (tau > -0.05) {
          for (let i = 0; i < DEBRIS; i++) {
            const c = chunks[i];
            const a = tau - c.t0;
            if (a < 0) { _m.makeScale(0, 0, 0); debris.setMatrixAt(i, _m); continue; }
            _v.copy(c.origin).addScaledVector(c.dir, c.speed * a);
            _e.set(c.rot.x + c.spin.x * a, c.rot.y + c.spin.y * a, c.rot.z + c.spin.z * a);
            _q.setFromEuler(_e);
            _s.copy(c.scale).multiplyScalar(Math.min(1, a / 0.1));
            _m.compose(_v, _q, _s);
            debris.setMatrixAt(i, _m);
            // still glowing from the inside for the first couple of seconds
            const glowK = 1 + 2.4 * Math.exp(-a * 0.85);
            debris.instanceColor.setXYZ(i,
              c.tone.r * glowK, c.tone.g * glowK * 0.82, c.tone.b * glowK * 0.62);
          }
          debris.instanceMatrix.needsUpdate = true;
          debris.instanceColor.needsUpdate = true;
          debris.visible = true;
        } else {
          debris.visible = false;
        }

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
            const k = Math.pow(1 - u, 1.4) * Math.min(1, a * 6) * tail;
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

        blastLight.intensity = tau < 0 ? 0 : 12000 * Math.exp(-tau * 0.20);
        blastFill.intensity = tau < 0 ? 0 : 1.6 * Math.exp(-tau * 0.13);
        if (tau > 0) {
          escKey.intensity = 2.0 * clamp(ramp(t, BLOW + 0.4, BLOW + 1.6), 0, 1);
          const kp = escAt(t, 0);
          escKey.target.position.copy(kp);
          escKey.position.copy(kp).addScaledVector(ESC_DIR, 300).add(_v.set(180, 130, -60));
        } else {
          escKey.intensity = 0;
        }

        // the grade takes the punch too
        grade.uVignette = tau > 0 ? lerp(0.44, 0.54, clamp(ramp(t, BLOW, BLOW + 2), 0, 1)) : 0.44;
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
