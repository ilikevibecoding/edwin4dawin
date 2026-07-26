import { seed } from './rand.js';

/**
 * Deterministic screenshot/test harness, driven by URL params:
 *   ?pose=<name>     camera pose (registered in game.poses by the world module)
 *   ?t=<seconds>     simulation time to advance before capture (default 1.5)
 *   ?fx=<name>       trigger an effect before capture: muzzle|explosion|airstrike|grenade|firing
 *   ?fxt=<seconds>   how long before capture the fx triggers (default 0.25)
 *   ?hud=0           hide HUD for clean environment shots
 *   ?seed=<int>      RNG seed (default 1337)
 *   ?nobots=1        don't spawn AI
 *   ?w=1920&h=1080   force canvas size
 * Sets window.__SHOT_READY__ = true when the frame is stable.
 */
export class Harness {
  constructor() {
    const q = new URLSearchParams(location.search);
    this.q = q;
    this.enabled = q.has('pose') || q.has('shot') || q.has('fx');
    this.pose = q.get('pose') || 'spawn';
    this.simTime = parseFloat(q.get('t') ?? '1.5');
    this.fx = q.get('fx');
    this.fxLead = parseFloat(q.get('fxt') ?? '0.25');
    this.showHud = q.get('hud') !== '0';
    this.seedVal = parseInt(q.get('seed') ?? '1337');
    this.noBots = q.get('nobots') === '1';
    this.autoplay = q.get('play') === '1'; // skip menu, play normally
    seed(this.seedVal);
  }

  applyPose(game) {
    const p = game.poses?.[this.pose];
    if (!p) { console.warn(`[harness] unknown pose '${this.pose}'`); return; }
    if (p.position) game.player.teleport(p.position, p.yaw ?? 0, p.pitch ?? 0);
    if (p.weapon != null) game.weapons?.equip?.(p.weapon);
    if (p.aim) game.weapons?.forceAds?.(true);
  }

  triggerFx(game) {
    const cam = game.camera;
    const fwd = cam.getWorldDirection(new game.THREE.Vector3());
    const at = cam.position.clone().addScaledVector(fwd, 14);
    at.y = Math.max(at.y, 0.5);
    switch (this.fx) {
      case 'muzzle':
      case 'firing':
        game.weapons?.forceFire?.(this.fx === 'firing' ? 0.6 : 0.08);
        break;
      case 'explosion':
        game.events.emit('explosion', { position: at, radius: 7, damage: 0 });
        break;
      case 'airstrike':
        game.airstrike?.callAt?.(at, { immediate: true });
        break;
      case 'grenade':
        game.weapons?.throwGrenade?.();
        break;
    }
  }

  /** Run the deterministic capture sequence. Called by main once the game is ready. */
  async run(game, stepFn, renderFn) {
    const DT = 1 / 60;
    const preSteps = Math.max(0, Math.round((this.simTime - this.fxLead) / DT));
    const fxSteps = Math.round(this.fxLead / DT);

    this.applyPose(game);
    for (let i = 0; i < preSteps; i++) {
      stepFn(DT);
      if (i % 240 === 239) await new Promise((r) => setTimeout(r));
    }
    if (this.fx) this.triggerFx(game);
    for (let i = 0; i < fxSteps; i++) stepFn(DT);
    this.applyPose(game); // re-assert pose in case gameplay moved the camera

    // Render several real frames so temporal effects settle.
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      stepFn(0); // zero-dt: settle transforms without advancing simulation
      renderFn(DT);
    }
    window.__SHOT_READY__ = true;
    document.title = 'SHOT_READY';
  }
}
