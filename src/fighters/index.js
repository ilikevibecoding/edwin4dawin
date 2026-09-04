// Fighter traffic entry point (owner: hangar + fighters workstream). main.js constructs this once, before any
// room is built, and calls update() every frame in both camera modes (fighters fly around the hull outside).
// The hangar room calls attachHangar(ctx) when it builds so racks / clamps / tractor effects can be placed.
//
// Public interface (keep stable — other systems and tests rely on it):
//   traffic.fighters                -> array of fighter records { id, state, object, pos, ... }
//   traffic.requestLaunch(id?)      -> schedule a launch (returns the id, or false if none is parked)
//   traffic.requestRecall(id)       -> bring a flying fighter home
//   traffic.setController(id, ctrl) -> ctrl.update(dt, fighter) overrides the scripted path (future NPC pilots)
//   traffic.on(event, handler)      -> 'launch' | 'depart' | 'return' | 'dock' | 'field_pass' | 'recall'
//   traffic.snapshot() / apply(s)   -> compact state for network sync (motion is a pure function of the clock)
import * as THREE from "three";
import { buildTieParts, makeTieMesh, makeTieInstances, TIE } from "./tie.js";
import { Traffic, FLYING, ARM_TOP_Y, CATCH_Y, FIELD_Y } from "./traffic.js";
import { hullClearance, minClearance } from "./patrol.js";
import { IMP } from "../core/palette.js";
import { DECAL, decalRect } from "../textures.js";

/** Ceiling rack rows over the well (pod centres) and the maintenance cradles along the port deck. */
export const RACK_ROWS = { xs: [-12, 12], zs: [-52, -36, -20, -4, 12, 28] };
export const CRADLE_Y = -40 + 0.9 + 3.2; // wing tips rest in the cradle saddles 0.9 m above the deck
export const CRADLES = [-64, -15, 27, 40].map((z) => ({ x: -31, y: CRADLE_Y, z, yaw: -Math.PI / 2 }));

const POOL = 4;
const BEAM_TOP = ARM_TOP_Y - 0.3;
const BEAM_BOTTOM = CATCH_Y - 8;
const FIELD_BASE = 0.35;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeTractorBeam(tex) {
  const group = new THREE.Group();
  group.name = "tractor_beam";
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, strength: { value: 0 }, color: { value: new THREE.Color(0x5fb8ff) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform float strength;
      uniform vec3 color;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
        float stripes = 0.5 + 0.5 * sin(vUv.y * 46.0 + time * 7.0);
        float fine = 0.5 + 0.5 * sin(vUv.y * 210.0 - time * 21.0);
        float fade = smoothstep(0.0, 0.18, vUv.y) * (0.3 + 0.7 * vUv.y);
        float a = strength * fade * (0.16 + 0.55 * rim + 0.2 * stripes * rim + 0.08 * fine);
        gl_FragColor = vec4(color * (0.7 + 0.6 * rim), a);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const len = BEAM_TOP - BEAM_BOTTOM;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 10.5, len, 36, 1, true), mat);
  cone.position.y = (BEAM_TOP + BEAM_BOTTOM) / 2;
  cone.renderOrder = 6;
  cone.frustumCulled = false;
  group.add(cone);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 1.4, 2.2), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 5, 40), ringMat);
    r.rotation.x = Math.PI / 2;
    r.renderOrder = 6;
    r.frustumCulled = false;
    group.add(r);
    rings.push(r);
  }
  const emitter = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(0.8, 1.6, 2.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  emitter.scale.set(6, 6, 1);
  emitter.position.y = BEAM_TOP;
  emitter.renderOrder = 6;
  group.add(emitter);
  group.visible = false;
  return {
    group,
    mat,
    rings,
    ringMat,
    emitter,
    len,
    set(x, z, strength, t) {
      group.position.set(x, 0, z);
      group.visible = strength > 0.005;
      mat.uniforms.strength.value = strength * 0.9;
      mat.uniforms.time.value = t;
      ringMat.opacity = 0.5 * strength;
      emitter.material.opacity = strength;
      for (let i = 0; i < rings.length; i++) {
        const k = (t * 0.35 + i / rings.length) % 1;
        const y = BEAM_TOP - k * len;
        const r = 1.7 + (10.5 - 1.7) * k;
        rings[i].position.y = y;
        rings[i].scale.set(r, r, 1);
      }
    },
  };
}

export function createFighters({ scene, materials, audio = null }) {
  const group = new THREE.Group();
  group.name = "fighters";
  scene.add(group);

  const { parts, triangles: tieTriangles, glowMaterial } = buildTieParts(materials);
  const rackSlots = [];
  for (const x of RACK_ROWS.xs) for (const z of RACK_ROWS.zs) rackSlots.push({ x, z, yaw: 0 });
  const traffic = new Traffic({ rackSlots, cradleSlots: CRADLES });
  traffic.patrolInfo = { curve: traffic.patrol.curve, length: traffic.patrol.length, clearance: hullClearance, minClearance: (n) => minClearance(traffic.patrol.curve, n), fieldY: FIELD_Y };

  // audio hooks
  traffic.on("launch", (d) => audio && audio.event && audio.event("fighter_launch", { position: d.position, id: d.id }));
  traffic.on("dock", (d) => audio && audio.event && audio.event("fighter_dock", { position: d.position, id: d.id }));
  traffic.on("field_pass", (d) => audio && audio.event && audio.event("field_pass", { position: d.position, id: d.id, direction: d.direction }));

  // ---- parked fighters (instanced; re-parented into the hangar room so they cull with it)
  const parked = makeTieInstances(parts, traffic.fighters.length);
  parked.group.visible = false;
  group.add(parked.group);

  // ---- flying fighters (pooled individual meshes with engine glow)
  const tex = glowTexture();
  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const obj = makeTieMesh(parts);
    obj.visible = false;
    const glows = [];
    for (const s of [-1, 1]) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(1.4, 1.1, 0.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.position.set(s * 0.48, -0.32, 3.05);
      sp.scale.set(1.1, 1.1, 1);
      obj.add(sp);
      glows.push(sp);
    }
    // faint engine halo, never larger than the fighter itself
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(0.9, 0.7, 0.45), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3 }));
    halo.position.set(0, -0.3, 3.6);
    halo.scale.set(2.2, 2.2, 1);
    obj.add(halo);
    glows.push(halo);
    group.add(obj);
    pool.push({ obj, glows, fighter: null });
  }

  const beam = makeTractorBeam(tex);
  group.add(beam.group);

  // ---- rack clamp arms (instanced; placed in the hangar room by attachHangar)
  const armGeo = new THREE.BoxGeometry(0.5, 1, 0.5);
  armGeo.translate(0, -0.5, 0);
  const arms = new THREE.InstancedMesh(armGeo, materials.paintedMetal, rackSlots.length);
  arms.name = "inst_rack_arms";
  arms.castShadow = true;
  arms.frustumCulled = false;
  for (let i = 0; i < rackSlots.length; i++) arms.setColorAt(i, IMP.black);
  arms.instanceColor.needsUpdate = true;
  let hangarCtx = null;

  function acquire(f) {
    for (const p of pool) {
      if (!p.fighter) {
        p.fighter = f;
        f.object = p.obj;
        p.obj.visible = true;
        return true;
      }
    }
    return false;
  }
  function release(f) {
    for (const p of pool) {
      if (p.fighter === f) {
        p.fighter = null;
        p.obj.visible = false;
      }
    }
    f.object = null;
  }

  function refreshParked() {
    for (const f of traffic.fighters) {
      if (FLYING.has(f.state) || f.controller) parked.hide(f.id);
      else {
        _m.compose(f.pos, f.quat, _s.set(1, 1, 1));
        parked.setMatrix(f.id, _m);
      }
    }
    parked.commit();
    traffic.dirtyParked = false;
  }

  function refreshArms() {
    for (let i = 0; i < rackSlots.length; i++) {
      const f = traffic.fighters[i];
      const s = rackSlots[i];
      _m.compose(_v.set(s.x, ARM_TOP_Y, s.z), _q.identity(), _s.set(1, Math.max(0.2, f.armLen), 1));
      arms.setMatrixAt(i, _m);
    }
    arms.instanceMatrix.needsUpdate = true;
  }

  let armsDirty = true;
  let tAccum = 0;

  return {
    group,
    traffic,
    parts,
    parked,
    beam,
    /** Called by the hangar room builder with its BuildContext: rack structures + the parked fighters. */
    attachHangar(ctx) {
      hangarCtx = ctx;
      buildRacks(ctx);
      ctx.add(parked.group);
      ctx.add(arms);
      parked.group.visible = true;
      refreshParked();
      refreshArms();
      armsDirty = true;
    },
    /** info: { mode: 'interior'|'exterior', cameraPos, playerPos, hangarVisible } */
    update(dt, t, info) {
      tAccum += dt;
      traffic.update(dt);
      // pooled meshes follow the records
      let beamF = null;
      let anyTransition = false;
      for (const f of traffic.fighters) {
        const flying = FLYING.has(f.state) || !!f.controller;
        if (flying && !f.object) {
          if (acquire(f)) traffic.dirtyParked = true;
        } else if (!flying && f.object) {
          release(f);
          traffic.dirtyParked = true;
        }
        if (f.object) {
          f.object.position.copy(f.pos);
          f.object.quaternion.copy(f.quat);
          const p = pool.find((x) => x.fighter === f);
          if (p) {
            const flick = 0.85 + 0.15 * Math.sin(tAccum * 31 + f.id * 1.7) * Math.sin(tAccum * 17.3 + f.id);
            const k = f.throttle * flick;
            p.glows[0].scale.set(0.9 + 1.1 * k, 0.9 + 1.1 * k, 1);
            p.glows[1].scale.set(0.9 + 1.1 * k, 0.9 + 1.1 * k, 1);
            p.glows[0].material.opacity = Math.min(1, 0.15 + k);
            p.glows[1].material.opacity = Math.min(1, 0.15 + k);
            p.glows[2].scale.set(1.4 + 1.6 * k, 1.4 + 1.6 * k, 1);
            p.glows[2].material.opacity = 0.6 * k;
          }
        }
        if (f.state === "ascending") beamF = f;
        else if (f.state === "returning" && f.progress > 0.7 && !beamF) beamF = f;
        if (f.state === "lowering" || f.state === "docking" || f.state === "ascending" || (f.state === "launching" && f.progress < 0.3)) anyTransition = true;
      }
      if (traffic.dirtyParked) refreshParked();
      if (hangarCtx && (anyTransition || armsDirty) && (info.hangarVisible || info.mode === "exterior")) {
        refreshArms();
        armsDirty = anyTransition;
      }
      // tractor beam: fades in while the returning fighter lines up under its slot, holds through the ascent
      if (beamF) {
        const s = beamF.state === "ascending" ? 1 - Math.max(0, (beamF.progress - 0.9) / 0.1) : (beamF.progress - 0.7) / 0.3;
        const slot = rackSlots[beamF.slot];
        beam.set(slot.x, slot.z, Math.max(0, Math.min(1, s)), tAccum);
      } else if (beam.group.visible) beam.set(0, 0, 0, tAccum);
      // containment field flares as a fighter passes through it
      if (materials.field && materials.field.uniforms) materials.field.uniforms.strength.value = FIELD_BASE + 1.1 * traffic.fieldPulse * traffic.fieldPulse;
    },
    stats() {
      const states = {};
      for (const f of traffic.fighters) states[f.state] = (states[f.state] || 0) + 1;
      return { fighters: traffic.fighters.length, airborne: traffic.airborne, states, tieTriangles, clock: +traffic.clock.toFixed(1), patrolLength: +traffic.patrol.length.toFixed(0) };
    },
  };

  /** Two ceiling rack girders over the well with clamp housings, tractor projectors and hangers. */
  function buildRacks(ctx) {
    const kit = ctx.kit;
    const zs = RACK_ROWS.zs;
    const z0 = zs[0] - 8;
    const z1 = zs[zs.length - 1] + 8;
    const hangY = ctx.ceil;
    for (const x of RACK_ROWS.xs) {
      kit.boxMM("paintedMetal", [x - 1.0, -12, z0], [x + 1.0, -10, z1], { color: IMP.plateDark, texel: 0.5 });
      kit.boxMM("metal", [x - 1.35, -12.18, z0], [x + 1.35, -12, z1], { color: IMP.steelDark, texel: 0.5 });
      kit.boxMM("metal", [x - 1.35, -10, z0], [x + 1.35, -9.82, z1], { color: IMP.steelDark, texel: 0.5 });
      kit.boxMM("paintedMetal", [x - 0.55, -9.82, z0 + 1], [x + 0.55, -9.5, z1 - 1], { color: IMP.trim, texel: 0.5 });
      // amber status strip along the outer face
      const out = Math.sign(x);
      kit.boxMM("emitAmber", [x + out * 1.01, -11.2, z0 + 2], [x + out * 1.06, -11.0, z1 - 2]);
      // hangers to the ceiling with gussets
      for (let z = z0 + 2; z < z1; z += 16) {
        kit.boxMM("paintedMetal", [x - 0.4, -10, z - 0.4], [x + 0.4, hangY, z + 0.4], { color: IMP.black, texel: 1 });
        kit.boxMM("paintedMetal", [x - 1.4, -9.82, z - 0.15], [x + 1.4, -9.2, z + 0.15], { color: IMP.black, texel: 1 });
        kit.boxMM("paintedMetal", [x - 0.9, hangY - 0.5, z - 0.9], [x + 0.9, hangY, z + 0.9], { color: IMP.trim, texel: 1 });
      }
      zs.forEach((z, i) => {
        // clamp housing + guide rails + projector lens + slot number
        kit.boxMM("paintedMetal", [x - 0.95, -12.8, z - 0.95], [x + 0.95, -12.18, z + 0.95], { color: IMP.black, texel: 1 });
        kit.boxMM("metal", [x - 1.0, -12.5, z - 1.0], [x + 1.0, -12.42, z + 1.0], { color: IMP.steelDark });
        for (const s of [-1, 1]) kit.boxMM("paintedMetal", [x + s * 0.7 - 0.08, -13.9, z - 0.08], [x + s * 0.7 + 0.08, -12.8, z + 0.08], { color: IMP.gunmetal });
        kit.add("emitCyan", new THREE.CircleGeometry(0.42, 16), { pos: [x, -12.83, z], rot: [Math.PI / 2, 0, 0], uv: "keep" });
        kit.add("paintedMetal", new THREE.TorusGeometry(0.5, 0.06, 5, 16), { pos: [x, -12.82, z], rot: [Math.PI / 2, 0, 0], color: IMP.gunmetal, uv: "scale", uvScale: [4, 1] });
        kit.box("emitAmber", x + out * 0.98, -12.5, z, 0.03, 0.12, 0.5);
        kit.add("decal", new THREE.PlaneGeometry(0.9, 0.9), { pos: [x + out * 1.07, -11.0, z + 1.4], rot: [0, out > 0 ? Math.PI / 2 : -Math.PI / 2, 0], uv: "keep", uvRect: decalRect(DECAL.NUMBER0 + (i % 4)) });
      });
    }
    // cross ties between the rows at both ends and the mid point
    for (const z of [z0 + 0.6, (z0 + z1) / 2, z1 - 0.6]) {
      kit.boxMM("paintedMetal", [RACK_ROWS.xs[0] - 1, -10.6, z - 0.3], [RACK_ROWS.xs[1] + 1, -10.0, z + 0.3], { color: IMP.plateDark, texel: 0.5 });
      kit.boxMM("emitWhiteSoft", [RACK_ROWS.xs[0] + 1.5, -10.62, z - 0.12], [RACK_ROWS.xs[1] - 1.5, -10.6, z + 0.12], { uv: "keep" });
    }
    void TIE;
  }
}
