/**
 * Weapon attachments (holographic sight, rear flip-up sight, foregrip, laser box, sling ...).
 * STUB — implemented by the weapons/attachments team. Contract:
 *
 *   export async function buildAttachments(game, rig) -> {
 *     holo?: { setVisible(bool), setBrightness(v) },
 *     update?(dt, state),        // optional per-frame hook (reticle parallax etc.)
 *     dispose?()
 *   }
 *
 * Rules: add meshes to `rig.attachments` (gunRoot space: metres, forward -Z, up +Y). The holo sight must
 * move `rig.sockets.sightAim` to the exact centre of its reticle window so ADS alignment is exact.
 * Register materials with game.render.setupObject(rig.attachments) after building.
 */
export async function buildAttachments(game, rig) {
  return { update() {}, dispose() {} };
}
