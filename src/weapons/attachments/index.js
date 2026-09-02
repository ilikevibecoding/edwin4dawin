import * as THREE from 'three';
import { LabelAtlas, anodisedMaterial, polymerMaterial, steelMaterial, rubberMaterial, matteBlackMaterial, nylonMaterial } from './lib.js';
import { buildHoloSight } from './holoSight.js';
import { buildRearSight } from './rearSight.js';
import { buildHandStop } from './foregrip.js';
import { buildLaserBox } from './laserBox.js';
import { buildSling } from './sling.js';
import { bakeViewModelOcclusion } from './aoBake.js';
import { buildReceiverDetails } from './receiverDetails.js';

/**
 * Weapon attachments for the M4A1 view model (see docs/ARCHITECTURE.md):
 *
 *   holoSight.js   EOTech 553 / EXPS-style holographic sight on the receiver top rail (collimated reticle)
 *   rearSight.js   low-profile flip-up rear sight, folded, behind the holo ("CRONEN")
 *   foregrip.js    angled hand stop on the handguard bottom rail (moves rig.sockets.gripLeft)
 *   laserBox.js    AN/PEQ-15 style laser / illuminator on the right side rail
 *   sling.js       QD sockets + swivels + a slack two-point nylon sling under the receiver
 *   lib.js         rail measurements (from the GLB), geometry / material / label helpers
 *
 * Everything is added to rig.attachments (gunRoot space: metres, forward -Z, up +Y, right +X). The holo
 * moves rig.sockets.sightAim to the exact centre of its reticle window so the ADS pose is exact.
 *
 * Contract:
 *   buildAttachments(game, rig) -> { holo: { setVisible(b), setBrightness(v) }, update(dt, state), dispose() }
 */
export async function buildAttachments(game, rig) {
  const root = rig.attachments;

  const mats = {
    anod: anodisedMaterial(game, { name: 'anodised' }),
    polymer: polymerMaterial(game, { name: 'polymer' }),
    steel: steelMaterial(game, { name: 'steel' }),
    rubber: rubberMaterial(game, { name: 'rubber' }),
    matte: matteBlackMaterial(game, { name: 'matteBlack' }),
    nylon: nylonMaterial(game, { name: 'nylon' }),
    lens: new THREE.MeshStandardMaterial({ color: 0x06070a, roughness: 0.06, metalness: 0.0, envMapIntensity: 2.2, vertexColors: true, name: 'lens' }),
  };
  const atlas = new LabelAtlas(game, 1024, 512, 8).finish();

  const holo = buildHoloSight(game, rig, mats, atlas, { zFront: -0.1 });
  const rearSight = buildRearSight(game, rig, mats, atlas, { zCentre: 0.042 });
  const handStop = buildHandStop(game, rig, mats, atlas, { zCentre: -0.315 }); // forward station like the MW2019 reference grip
  const laser = buildLaserBox(game, rig, mats, atlas, { zCentre: -0.2395 });
  const sling = buildSling(game, rig, mats, atlas);
  const receiver = buildReceiverDetails(game, rig, mats, atlas);
  atlas.texture.needsUpdate = true; // regions were drawn after finish()

  // --- sockets: reticle centre drives the ADS pose; the hand stop defines the support-hand palm centre
  rig.sockets.sightAim.position.copy(holo.aimLocal);
  rig.sockets.gripLeft.position.copy(handStop.palm);
  rig.sockets.gripLeft.rotation.copy(handStop.palmRotation);
  game.weapons?._computeAdsPose?.();

  // Baked occlusion / edge-wear maps for the rifle and per-vertex AO for the attachments (before the materials
  // are compiled, so the first frame already has them).
  try {
    bakeViewModelOcclusion(game, rig);
  } catch (err) {
    console.error('[attachments] occlusion bake failed', err);
  }

  // Materials created after load must be registered for cascaded shadows.
  game.render.setupObject(root);

  registerViews(game);

  const api = {
    holo: {
      setVisible: (v) => holo.setVisible(v),
      setBrightness: (v) => holo.setBrightness(v),
      setEyeRelief: (d) => holo.setEyeRelief(d),
      reticle: holo.reticle,
      glass: holo.glass,
      group: holo.group,
    },
    groups: { holo: holo.group, rearSight: rearSight.group, handStop: handStop.group, laser: laser.group, sling: sling.group, receiver: receiver.group },
    materials: mats,
    atlas,
    update() {},
    dispose() {
      root.traverse((o) => {
        if (o.isMesh) o.geometry?.dispose?.();
      });
      for (const m of Object.values(mats)) m.dispose();
      atlas.material?.dispose();
      atlas.texture?.dispose();
    },
  };
  return api;
}

function registerViews(game) {
  const d = game.debug;
  if (!d?.registerView) {
    // Debug is created after the weapons load; register once the game is up.
    game.events?.once?.('game:ready', () => registerViews(game));
    return;
  }
  const reset = 'game.render.baseWeaponFov = game.settings.weaponFov; for (const c of [game.render.camera, game.render.weaponCamera]) c.clearViewOffset();';
  // Closeup = a sub-frustum crop of the hip view around the optic (both cameras, so world and view model stay
  // registered) — the view model's own FOV cannot be narrowed without pushing the off-centre sight out of frame.
  d.registerView('sight_closeup', {
    pos: [0, 0, 12],
    yaw: 0,
    pitch: -2,
    hud: false,
    exec: `${reset} for (const c of [game.render.camera, game.render.weaponCamera]) c.setViewOffset(960, 540, 333, 143, 560, 315);`,
  });
  d.registerView('sight_ads_closeup', { pos: [0, 0, 12], yaw: 0, pitch: 0, ads: true, hud: false, exec: `${reset} game.render.baseWeaponFov = 28;` });
  d.registerView('attach_hero', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: reset });
  d.registerView('attach_ads', { pos: [0, 0, 12], yaw: 0, pitch: 0, ads: true, hud: false, exec: reset });
  // inspect animation shows the left side (--wait ≈ 1.0) then the right side / PEQ (--wait ≈ 2.4)
  d.registerView('attach_inspect', { pos: [0, 0, 12], yaw: 0, pitch: -2, hud: false, exec: `${reset} weapons.inspect();` });
}
