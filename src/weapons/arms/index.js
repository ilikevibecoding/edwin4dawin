/**
 * First-person arms/hands. Candidates live in ./<name>/index.js and are selected with ?arms=<name>.
 * Contract for a candidate module:
 *
 *   export async function buildArms(game, rig) -> {
 *     root: Object3D,           // added to rig.arms by the candidate
 *     update(dt, state),        // place hands at rig.sockets.rightHandTarget / leftHandTarget (world transforms) every frame
 *     setPose?(name),           // 'grip' | 'magGrab' | 'boltSlap' | 'relaxed' ... (optional finger poses)
 *     dispose?()
 *   }
 *
 * The WeaponSystem drives the hand targets (position + orientation) — the arms module only has to follow them and
 * build the forearm/upper-arm chain back toward rig.sockets.shoulderRight / shoulderLeft (swayPivot space).
 */
const candidates = import.meta.glob('./*/index.js');

export const DEFAULT_ARMS = 'bravo';

export async function buildArms(game, rig) {
  const requested = game.settings.params.get('arms') || DEFAULT_ARMS;
  const key = `./${requested}/index.js`;
  const loader = candidates[key] || candidates[`./${DEFAULT_ARMS}/index.js`];
  if (!loader) return { root: null, update() {} };
  const mod = await loader();
  const arms = await mod.buildArms(game, rig);
  arms.name = requested;
  return arms;
}
