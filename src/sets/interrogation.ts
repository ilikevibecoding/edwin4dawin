/**
 * Chapter 3 — the interrogation room. Two chairs, one table, one lamp, and a
 * suspect who has already decided how this ends. Hard top light, cyan bounce
 * off the two-way mirror, everything else swallowed.
 */
import * as THREE from 'three';
import { LightShaft, DustMotes, glowSprite } from '../engine/volumetric';
import { spotLight } from '../engine/lighting';
import { MAT, box, chair, cyl, neonSign, plane, table } from './kit';
import type { GameSet, SetContext } from './types';

export function buildInterrogation(ctx: SetContext): GameSet {
  const { quality: q } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.06, 120);
  scene.background = new THREE.Color(0x04070a);
  scene.fog = new THREE.FogExp2(0x05080c, 0.045);

  const W = 4.6, D = 5.2, H = 2.9;

  const floorMat = MAT.tile(4);
  const floor = plane(W, D, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ceil = plane(W, D, MAT.drywall(0x3a3f45));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  const wallMat = MAT.drywall(0x585e64);
  const panelMat = MAT.paint(0x2a3036, 0.5);
  // Four walls; the left one carries the two-way mirror.
  const mk = (w: number, rotY: number, pos: [number, number, number]) => {
    const g = box(w, H, 0.14, wallMat, [pos[0], H / 2, pos[2]], rotY);
    scene.add(g);
    return g;
  };
  mk(W, 0, [0, 0, -D / 2]);
  mk(W, Math.PI, [0, 0, D / 2]);
  mk(D, Math.PI / 2, [W / 2, 0, 0]);
  mk(D, -Math.PI / 2, [-W / 2, 0, 0]);

  // Wainscot panels for scale.
  for (const [x, z, w, rotY] of [
    [0, -D / 2 + 0.08, W, 0],
    [0, D / 2 - 0.08, W, Math.PI],
    [W / 2 - 0.08, 0, D, Math.PI / 2],
  ] as const) {
    const p = box(w, 0.9, 0.03, panelMat, [x, 0.45, z], rotY);
    scene.add(p);
  }

  // Two-way mirror.
  const mirrorMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x0d1418).convertSRGBToLinear(),
    roughness: 0.05,
    metalness: 0.9,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
  });
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), mirrorMat);
  mirror.position.set(-W / 2 + 0.08, 1.55, 0);
  mirror.rotation.y = Math.PI / 2;
  scene.add(mirror);
  const mirrorFrame = box(2.75, 1.45, 0.06, MAT.metal(1, 0.2), [-W / 2 + 0.05, 1.55, 0], Math.PI / 2);
  scene.add(mirrorFrame);

  // Table bolted to the floor, two chairs.
  const tbl = table(1.5, 0.8, 0.75, MAT.metal(2, 0.4), MAT.metal(1, 0.3));
  tbl.position.set(0, 0, 0);
  scene.add(tbl);
  const chairA = chair(MAT.paint(0x33383e, 0.55));
  chairA.position.set(0, 0, 1.15);
  chairA.rotation.y = Math.PI;
  scene.add(chairA);
  const chairB = chair(MAT.paint(0x33383e, 0.55));
  chairB.position.set(0, 0, -1.15);
  scene.add(chairB);

  // Case file and a terminal on the table.
  const file = box(0.32, 0.015, 0.24, MAT.drywall(0xc8c2b4), [0.35, 0.79, 0.12], 0.2);
  scene.add(file);
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.12),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(0x8a8f94).convertSRGBToLinear(), roughness: 0.7 }),
  );
  photo.rotation.x = -Math.PI / 2;
  photo.position.set(0.3, 0.8, -0.05);
  scene.add(photo);
  const term = neonSign('CASE 7734', { color: 0x63e0ff, sub: 'HK-400 / HOMICIDE', w: 0.4, h: 0.24, intensity: 1.6, glow: 0.25 });
  term.position.set(-0.5, 0.9, 0.1);
  term.rotation.set(-0.9, 0.3, 0);
  scene.add(term);

  /* --------------------------------------------------------------- lights */
  // Single hard overhead lamp: the signature look of the room.
  const cage = cyl(0.2, 0.24, 0.16, MAT.metal(1, 0.18), [0, H - 0.16, 0], 14);
  scene.add(cage);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), MAT.neon(0xfff2e0, 2.2));
  bulb.position.set(0, H - 0.24, 0);
  scene.add(bulb);
  scene.add(glowSprite(0xfff2e0, 1.1, 0.5).translateY(H - 0.24));

  const overhead = spotLight(q, {
    color: 0xfff0dc,
    intensity: 58,
    position: new THREE.Vector3(0, H - 0.26, 0),
    target: new THREE.Vector3(0, 0.7, 0),
    angle: 0.78,
    penumbra: 0.42,
    distance: 9,
    radius: 2.2,
  });
  scene.add(overhead, overhead.target);

  // Cool bounce from the mirror side, so faces are not half black.
  const mirrorBounce = spotLight(q, {
    color: 0x74a8d8,
    intensity: 26,
    position: new THREE.Vector3(-W / 2 + 0.2, 1.6, 0),
    target: new THREE.Vector3(1, 1.2, 0),
    angle: 1.1,
    penumbra: 1,
    distance: 10,
    shadow: false,
  });
  scene.add(mirrorBounce, mirrorBounce.target);

  const amb = new THREE.HemisphereLight(0x2c3f50, 0x121619, 1.8);
  scene.add(amb);

  // A thin strip light over the mirror for a graphic accent.
  const strip = box(2.4, 0.04, 0.04, MAT.neon(0x63e0ff, 1.6), [-W / 2 + 0.14, 2.32, 0], Math.PI / 2);
  scene.add(strip);
  const stripLight = new THREE.PointLight(0x63e0ff, 5, 6, 2);
  stripLight.position.set(-W / 2 + 0.4, 2.3, 0);
  scene.add(stripLight);

  const shaft = new LightShaft(0.9, 0.9, 2.6, 0xfff0dc, q.volumetrics ? 0.09 : 0.035, 0);
  shaft.mesh.position.set(0, H - 0.26, 0);
  shaft.mesh.rotation.x = -Math.PI / 2;
  scene.add(shaft.mesh);

  const motes = q.volumetrics ? new DustMotes(220, new THREE.Vector3(3.6, 2.6, 4), 0xffe6c8, 0.017) : null;
  if (motes) {
    motes.points.position.y = 1.1;
    scene.add(motes.points);
  }

  const marks: GameSet['marks'] = {
    suspectSeat: { pos: [0, 0, -1.15], rotY: 0 },
    investigatorSeat: { pos: [0, 0, 1.15], rotY: Math.PI },
    standRight: { pos: [1.35, 0, 0.4], rotY: -1.9 },
    standLeft: { pos: [-1.35, 0, 0.5], rotY: 1.9 },
    behindSuspect: { pos: [0.8, 0, -1.9], rotY: -0.6 },
    doorway: { pos: [1.6, 0, 2.1], rotY: -2.6 },
    observer: { pos: [-1.6, 0, 1.8], rotY: 2.4 },
  };

  const bounds = { minX: -W / 2 + 0.4, maxX: W / 2 - 0.4, minZ: -D / 2 + 0.4, maxZ: D / 2 - 0.4 };
  const colliders: GameSet['colliders'] = [
    { min: [-0.8, -0.45], max: [0.8, 0.45] },   // table
    { min: [-0.3, -1.45], max: [0.3, -0.85] },  // suspect chair
  ];
  const interactables: GameSet['interactables'] = [
    {
      id: 'i_file', at: [0.35, 0.85, 0.5], label: 'READ THE CASE FILE', marker: true, radius: 1.3,
      think: 'Twenty-eight wounds. The report calls it a malfunction. Nobody wrote down what he said.',
      flag: 'readFile',
    },
    {
      id: 'i_mirror', at: [-1.9, 1.55, 0], label: 'LOOK AT THE MIRROR', radius: 1.4,
      think: 'Three humans behind that glass, deciding what I am for. I can hear their coffee.',
      flag: 'sawMirror',
    },
    {
      id: 'i_suspect', at: [0, 1.2, -1.6], label: 'STUDY THE SUSPECT', marker: true, radius: 1.5,
      think: 'Stress at seventy-four per cent. If it climbs to ninety it will tear out its own pump.',
      flag: 'sawStress',
    },
  ];

  const scanTargets: GameSet['scanTargets'] = [
    {
      id: 'file',
      at: [0.35, 0.82, 0.12],
      label: 'CASE FILE 7734',
      readout: ['VICTIM: OWNER, 62', 'WOUNDS: 28 STAB', 'WEAPON: KITCHEN KNIFE', 'ANDROID FOUND: 6 HOURS LATER'],
      flag: 'readFile',
    },
    {
      id: 'hands',
      at: [0.0, 0.82, -0.5],
      label: 'SUSPECT HANDS — DAMAGE',
      readout: ['SYNTHETIC SKIN: TORN', 'THIRIUM RESIDUE: HUMAN BLOOD', 'GRIP FORCE APPLIED: 780 N', 'SELF-INFLICTED MARKS PRESENT'],
      flag: 'sawHands',
    },
    {
      id: 'led',
      at: [-0.1, 1.42, -1.05],
      label: 'LED — RED, UNSTABLE',
      readout: ['STRESS LEVEL: 74%', 'SELF-DESTRUCT RISK: HIGH', 'RECOMMEND: DE-ESCALATE'],
      flag: 'sawStress',
    },
  ];

  let stress = 0;
  return {
    name: 'interrogation',
    scene,
    camera,
    marks,
    bounds,
    colliders,
    interactables,
    lights: { overhead, mirrorBounce, amb, strip: stripLight },
    scanTargets,
    update(_dt, time) {
      shaft.update(time);
      motes?.update(time);
      // The lamp breathes very slightly; the room feels alive but unfriendly.
      overhead.intensity = 58 + Math.sin(time * 0.9) * 1.2;
      if (stress > 0) {
        // Under pressure the strip light stutters.
        stripLight.intensity = 5 + Math.sin(time * 22) * 3 * stress;
      }
    },
    applyLook(fx) {
      fx.wetLens = 0;
      fx.setBloom(0.15, 0.7, 1.95);
      fx.setStreak(0.12, new THREE.Vector3(0.5, 0.7, 1.0));
      fx.highlightCeiling = 5.5;
      fx.applyLook({
        uExposure: 1.85,
        uContrast: 1.16,
        uSaturation: 0.94,
        uSplit: 0.2,
        uVignette: 0.6,
        uGrain: 0.008,
        uHalation: 0.12,
        uShadowTint: new THREE.Vector3(0.32, 0.6, 0.92),
        uHighlightTint: new THREE.Vector3(1.0, 0.9, 0.78),
      });
    },
    dispose() {},
    actions: {
      stress: (on) => {
        stress = on ? 1 : 0;
        overhead.color.set(on ? 0xffd8c0 : 0xfff0dc);
      },
      lampOnly: (on) => {
        mirrorBounce.intensity = on ? 6 : 26;
        amb.intensity = on ? 0.7 : 1.8;
      },
    },
  };
}
