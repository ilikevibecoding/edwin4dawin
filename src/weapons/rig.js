import * as THREE from 'three';

/**
 * View-model rig for the M4A1 (public/assets/models/weapons/M4A1.glb — CC0, 3dmodelscc0).
 *
 * Hierarchy (all under game.camera):
 *   root (viewModelRoot)
 *   └ swayPivot          procedural offsets: sway / bob / recoil / ADS / sprint blends
 *      ├ gunRoot         the GLB scene (already in metres: forward -Z, up +Y, right +X)
 *      │  ├ parts.*      named GLB nodes animated by the WeaponSystem
 *      │  ├ attachments  Group for holo sight / foregrip / etc. (src/weapons/attachments)
 *      │  └ sockets.*    Object3D markers (see below)
 *      └ arms            Group for the arms module (src/weapons/arms)
 *
 * Sockets (local to gunRoot unless noted):
 *   muzzle        flash hider exit, forward -Z
 *   ejectionPort  casing spawn, ejection dir ≈ (+1, +0.4, +0.3)
 *   sightAim      point that must sit on the camera axis when fully aimed (attachments move this to the reticle centre)
 *   railTop       centre of the receiver top rail just ahead of the charging handle (optics mount)
 *   railFront     top rail of the handguard (front sight side) — for a folded front sight / laser box
 *   railBottom    bottom rail of the handguard — foregrip / hand stop
 *   gripRight     pistol-grip palm centre; +Y up the grip, -Z forward
 *   gripLeft      handguard palm centre for the support hand (under/left of the handguard)
 *   magWell       bottom of the magazine well (where the magazine seats)
 *   shoulderRight / shoulderLeft   (local to swayPivot) virtual shoulder anchors for the arm chain
 *   rightHandTarget / leftHandTarget (children of swayPivot, driven every frame) where the arms module places the palms
 */
export function createRig(camera, gltfScene) {
  const root = new THREE.Group();
  root.name = 'ViewModel';
  camera.add(root);

  const swayPivot = new THREE.Group();
  swayPivot.name = 'SwayPivot';
  root.add(swayPivot);

  const gunRoot = new THREE.Group();
  gunRoot.name = 'GunRoot';
  swayPivot.add(gunRoot);
  gunRoot.add(gltfScene);

  const attachments = new THREE.Group();
  attachments.name = 'Attachments';
  gunRoot.add(attachments);

  const arms = new THREE.Group();
  arms.name = 'Arms';
  swayPivot.add(arms);

  const byName = {};
  gltfScene.traverse((o) => {
    if (o.name) byName[o.name] = o;
  });
  const parts = {
    base: byName.Base,
    magazine: byName.Magazine,
    barrel: byName.Barrel,
    chargingHandle: byName.Charging_Handle,
    bolt: byName.Ejector_2,
    dustCover: byName.Ejector_Lid,
    ejector: byName.Ejector,
    selector: byName.Firemode_Selector,
    trigger: byName.Trigger,
    stock: byName.Stock,
    carryHandle: byName.Sight, // detachable carry handle (hidden when an optic is mounted)
    carryHandleParts: [byName.Sight_2, byName.Switch1, byName.Switch2].filter(Boolean), // its loose knobs (separate siblings in the GLB)
    partsGroup: byName.Parts,
  };

  const mk = (name, pos, rot = null) => {
    const o = new THREE.Object3D();
    o.name = `socket_${name}`;
    o.position.set(pos[0], pos[1], pos[2]);
    if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
    gunRoot.add(o);
    return o;
  };
  const sockets = {
    muzzle: mk('muzzle', [0, 0.039, -0.536]),
    ejectionPort: mk('ejectionPort', [0.022, 0.016, -0.04]),
    sightAim: mk('sightAim', [0, 0.092, -0.055]),
    railTop: mk('railTop', [0, 0.0515, -0.045]),
    railFront: mk('railFront', [0, 0.062, -0.24]),
    railBottom: mk('railBottom', [0, 0.008, -0.22]),
    gripRight: mk('gripRight', [0.0, -0.088, 0.072], [0.38, 0, 0]),
    gripLeft: mk('gripLeft', [-0.012, 0.005, -0.215], [0, 0, 0]),
    magWell: mk('magWell', [-0.001, -0.02, -0.06]),
  };

  const anchor = (name, pos) => {
    const o = new THREE.Object3D();
    o.name = `anchor_${name}`;
    o.position.set(pos[0], pos[1], pos[2]);
    swayPivot.add(o);
    return o;
  };
  sockets.shoulderRight = anchor('shoulderRight', [0.2, -0.33, 0.12]);
  sockets.shoulderLeft = anchor('shoulderLeft', [-0.19, -0.34, 0.1]);
  sockets.rightHandTarget = anchor('rightHandTarget', [0, 0, 0]);
  sockets.leftHandTarget = anchor('leftHandTarget', [0, 0, 0]);

  // Magazine rest transform for the reload animation.
  const mag = parts.magazine;
  const magRest = { position: mag.position.clone(), quaternion: mag.quaternion.clone() };
  const boltRest = parts.bolt ? parts.bolt.position.clone() : null;
  const chargingRest = parts.chargingHandle ? parts.chargingHandle.position.clone() : null;
  const triggerRest = parts.trigger ? parts.trigger.quaternion.clone() : null;
  const dustCoverRest = parts.dustCover ? parts.dustCover.quaternion.clone() : null;

  return {
    root,
    swayPivot,
    gunRoot,
    gltfScene,
    attachments,
    arms,
    parts,
    sockets,
    rest: { magazine: magRest, bolt: boltRest, chargingHandle: chargingRest, trigger: triggerRest, dustCover: dustCoverRest },
    state: {
      aiming: false,
      aimBlend: 0,
      sprintBlend: 0,
      reloading: false,
      reloadT: 0,
      reloadDuration: 0,
      inspecting: false,
      firing: false,
      lowered: false,
      pose: 'idle', // 'idle' | 'ads' | 'sprint' | 'reload' | 'inspect' | 'draw'
    },
  };
}

/** Standard per-part animation targets used by both the WeaponSystem and the arms module. */
export const RELOAD_PHASES = {
  TILT: [0.0, 0.18],
  MAG_OUT: [0.18, 0.5],
  HAND_DOWN: [0.5, 1.05],
  MAG_IN: [1.05, 1.45],
  SEAT: [1.45, 1.65],
  BOLT: [1.65, 2.0],
  RETURN: [2.0, 2.3],
};
