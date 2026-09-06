import * as THREE from 'three';
import { Batch, strutGeometry, type Surf } from '../geometry';
import { PANEL_UV, SURF } from '../textures';
import { at, FLOOR, UP, WRIST, YOKE_HUB, type BuildContext } from './context';

export interface CockpitControlsBuild {
  throttleLever: THREE.Mesh;
  flapLever: THREE.Mesh;
  /** rudder pedals: the two left pedals (pilot + copilot) swing together, likewise the two right ones */
  pedalsL: THREE.Mesh;
  pedalsR: THREE.Mesh;
  yokeL: THREE.Group;
  yokeR: THREE.Group;
}

/** Pedestal and levers, rudder pedals, the two yokes (the pilot's with hands) and the yoke placards. `inPanel` comes from the panel builder. */
export function buildCockpitControls(ctx: BuildContext, inPanel: (px: number, py: number, pz: number) => THREE.Vector3): CockpitControlsBuild {
  const { mesh, decal, root, interiorMeshes, cabinKit } = ctx;
  const { parts } = ctx.mat;
  // ------------------------------------------------------------ cockpit: controls
  // pedestal between the seats with the throttle / propeller / mixture quadrant and the flap lever
  cabinKit.add(new THREE.BoxGeometry(0.7, 0.32, 0.22), at([1.7, FLOOR + 0.16, 0]), SURF.plastic);
  cabinKit.add(new THREE.BoxGeometry(0.22, 0.02, 0.16), at([1.62, FLOOR + 0.33, 0]), SURF.darkMetal);
  const lever = (knob: Surf, knobGeo: THREE.BufferGeometry, len: number): THREE.BufferGeometry => new Batch()
    .add(new THREE.CylinderGeometry(0.009, 0.011, len, 8), at([0, len / 2, 0]), SURF.metal)
    .add(knobGeo, at([0, len + 0.012, 0]), knob).build();
  const knobBall = new THREE.SphereGeometry(0.022, 12, 8);
  const throttleLever = mesh(lever(SURF.throttle, knobBall, 0.16), parts, { exterior: false, cast: false, receive: false });
  throttleLever.position.set(1.62, FLOOR + 0.34, -0.05);
  for (const [z, surf] of [[0.0, SURF.propKnob], [0.05, SURF.mixture]] as [number, Surf][]) cabinKit.add(lever(surf, knobBall, 0.15), at([1.62, FLOOR + 0.34, z], [0, 0, -0.35]), surf);
  // flap lever: a bar on the pedestal's right flank, up = flaps retracted, back toward the pilot = full flap
  const flapLever = mesh(lever(SURF.flapKnob, new THREE.CylinderGeometry(0.014, 0.014, 0.05, 10), 0.26), parts, { exterior: false, cast: false, receive: false });
  flapLever.position.set(1.42, FLOOR + 0.30, 0.10);
  // rudder pedals: two pairs standing on the floor ahead of each front seat; each mesh holds one pedal per seat
  const pedalPair = (dz: number): THREE.BufferGeometry => {
    const b = new Batch();
    for (const seat of [-0.34, 0.34]) {
      const z = seat + dz;
      b.add(new THREE.CylinderGeometry(0.011, 0.011, 0.20, 8), at([0.02, 0.10, z], [0, 0, -0.2]), SURF.metal);
      b.add(new THREE.BoxGeometry(0.02, 0.15, 0.085), at([0.06, 0.21, z], [0, 0, -0.35]), SURF.darkMetal);
      b.add(new THREE.BoxGeometry(0.03, 0.03, 0.03), at([0, 0.015, z]), SURF.darkMetal);
    }
    return b.build();
  };
  const pedalsL = mesh(pedalPair(-0.12), parts, { exterior: false, cast: false, receive: false });
  const pedalsR = mesh(pedalPair(0.12), parts, { exterior: false, cast: false, receive: false });
  for (const p of [pedalsL, pedalsR]) p.position.set(1.93, FLOOR, 0);
  // pedal torque tube across the floor
  cabinKit.add(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8), at([1.93, FLOOR + 0.02, 0], [Math.PI / 2, 0, 0]), SURF.metal);

  // yokes: shaft entering the panel below the switch row, hub with a placard, ram's-horn wheel with grips
  const shaftIn = inPanel(0, -0.175, 0.0).setZ(0);
  const mkYoke = (z: number, hands: boolean): THREE.Group => {
    const g = new THREE.Group();
    const yoke = new Batch();
    const shaftEnd = shaftIn.clone().sub(YOKE_HUB).setZ(0);
    const shaftDir = shaftEnd.clone().normalize();
    const shaftRot: [number, number, number] = [0, 0, Math.PI / 2 - Math.atan2(shaftDir.y, shaftDir.x)];
    // column: a chromed tube into the panel through a two-step rubber boot
    yoke.add(strutGeometry(new THREE.Vector3(0, 0, 0), shaftEnd.clone().addScaledVector(shaftDir, 0.16), 0.016), undefined, SURF.metal);
    yoke.add(new THREE.CylinderGeometry(0.03, 0.036, 0.035, 12), at(shaftEnd.clone().addScaledVector(shaftDir, -0.045), shaftRot), SURF.rubber);
    yoke.add(new THREE.CylinderGeometry(0.038, 0.048, 0.03, 12), at(shaftEnd.clone().addScaledVector(shaftDir, -0.015), shaftRot), SURF.rubber);
    // hub: a rounded-off block with the placard face toward the pilot and a chromed centre bolt
    yoke.add(new THREE.BoxGeometry(0.05, 0.10, 0.09), undefined, SURF.plastic);
    yoke.add(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 10), at([-0.027, -0.03, 0], [0, 0, Math.PI / 2]), SURF.metal);
    // ram's-horn: each arm leaves the hub outward and a little down, then sweeps up and back into a near-vertical
    // grip (rubber) whose top leans toward the pilot; the horns are one bent tube with sphere joints
    for (const s of [-1, 1]) {
      const arm: THREE.Vector3[] = [
        new THREE.Vector3(0, -0.005, s * 0.04), new THREE.Vector3(-0.005, -0.02, s * 0.12), new THREE.Vector3(-0.015, -0.005, s * 0.155),
        new THREE.Vector3(-0.03, 0.03, s * 0.165), new THREE.Vector3(-0.05, 0.11, s * 0.165),
      ];
      for (let i = 0; i < 3; i++) {
        yoke.add(strutGeometry(arm[i], arm[i + 1], 0.012, 10), undefined, SURF.plastic);
        yoke.add(new THREE.SphereGeometry(0.012, 8, 6), at(arm[i + 1]), SURF.plastic);
      }
      yoke.add(strutGeometry(arm[3], arm[4], 0.017, 10), undefined, SURF.rubber);
      yoke.add(new THREE.SphereGeometry(0.017, 8, 6), at(arm[4]), SURF.rubber);
      // left horn: the trim switch (a rocker under the thumb on top of the grip) and the red PTT on its inner face
      if (s < 0) {
        yoke.add(new THREE.BoxGeometry(0.014, 0.008, 0.012), at([-0.055, 0.128, s * 0.16]), SURF.darkMetal);
        yoke.add(new THREE.BoxGeometry(0.010, 0.006, 0.008), at([-0.055, 0.133, s * 0.16]), SURF.lightPlastic);
        yoke.add(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 10), at([-0.046, 0.085, s * 0.147], [Math.PI / 2, 0, 0]), SURF.mixture);
      }
      if (hands) {
        // hand: the palm lies against the grip's aft face, four fingers wrap the outboard side and curl in front of
        // it, the thumb hooks the inboard side; a watch on the left wrist
        const gripDir = arm[4].clone().sub(arm[3]).normalize();
        const gc = arm[3].clone().lerp(arm[4], 0.45);
        const palmRot: [number, number, number] = [0, 0, -Math.atan2(gripDir.x, gripDir.y)];
        // back of the hand: a flattened ovoid against the grip's aft face (seen from the seat it is the whole hand)
        const palm = gc.clone().add(new THREE.Vector3(-0.026, 0.0, 0));
        const palmGeo = new THREE.SphereGeometry(0.04, 10, 8); palmGeo.scale(0.45, 1.0, 0.9);
        yoke.add(palmGeo, at(palm, palmRot), SURF.skin);
        // fingers wrap the outboard side and curl in front of the grip; the knuckles stand a little proud of the
        // palm's outboard edge and its top so the row of them reads from behind and above
        for (let f = 0; f < 4; f++) {
          const y = gc.y + 0.028 - f * 0.018, r = f === 3 ? 0.0075 : 0.0085;
          const base = new THREE.Vector3(-0.030, y, s * (0.165 + 0.030)), knuckle = new THREE.Vector3(0.004, y - 0.002, s * (0.165 + 0.026)), tip = new THREE.Vector3(0.020, y - 0.004, s * 0.160);
          yoke.add(strutGeometry(base, knuckle, r, 8), undefined, SURF.skin);
          yoke.add(new THREE.SphereGeometry(r, 7, 6), at(knuckle), SURF.skin);
          yoke.add(strutGeometry(knuckle, tip, r * 0.9, 8), undefined, SURF.skin);
          yoke.add(new THREE.SphereGeometry(r * 0.9, 6, 5), at(tip), SURF.skin);
        }
        // thumb: from the inboard side of the palm up and over the grip's inner face toward the switch
        const thumbA = new THREE.Vector3(-0.026, gc.y + 0.012, s * 0.138), thumbB = new THREE.Vector3(-0.012, gc.y + 0.045, s * 0.146), thumbC = new THREE.Vector3(0.006, gc.y + 0.055, s * 0.152);
        yoke.add(strutGeometry(thumbA, thumbB, 0.010, 8), undefined, SURF.skin);
        yoke.add(new THREE.SphereGeometry(0.010, 7, 6), at(thumbB), SURF.skin);
        yoke.add(strutGeometry(thumbB, thumbC, 0.009, 8), undefined, SURF.skin);
        yoke.add(new THREE.SphereGeometry(0.009, 6, 5), at(thumbC), SURF.skin);
        // wrist from the palm back to where the sleeve's cuff takes over; the watch on the left one
        const wrist = WRIST(s);
        yoke.add(strutGeometry(palm.clone().add(new THREE.Vector3(-0.010, -0.028, 0)), wrist, 0.026, 10), undefined, SURF.skin);
        if (s < 0) {
          const wDir = palm.clone().sub(wrist).normalize();
          const wPos = wrist.clone().addScaledVector(wDir, 0.03);
          yoke.add(new THREE.TorusGeometry(0.029, 0.005, 6, 14), at(wPos, [0, Math.PI / 2 - Math.atan2(wDir.x, wDir.z), 0]), SURF.belt);
          yoke.add(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 12), at(wPos.clone().add(new THREE.Vector3(0.004, 0.030, 0)), [0, 0, -0.2]), SURF.metal);
          yoke.add(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 12), at(wPos.clone().add(new THREE.Vector3(0.0045, 0.0345, 0)), [0, 0, -0.2]), SURF.headset);
        }
      }
    }
    const m = new THREE.Mesh(yoke.build(), parts);
    m.castShadow = false;
    g.add(m);
    g.position.set(YOKE_HUB.x, YOKE_HUB.y, z);
    root.add(g);
    interiorMeshes.push(g);
    return g;
  };
  const yokeL = mkYoke(-0.34, true);
  const yokeR = mkYoke(0.34, false);
  // yoke hub placards
  for (const z of [-0.34, 0.34]) decal(PANEL_UV.yoke, 0.036, 0.024, new THREE.Vector3(YOKE_HUB.x - 0.026, YOKE_HUB.y + 0.015, z), new THREE.Vector3(-1, 0, 0), UP);
  return { throttleLever, flapLever, pedalsL, pedalsR, yokeL, yokeR };
}
