import * as THREE from 'three';
import { rand, randRange, randSpread, randPick } from '../core/rand.js';
import { JetSystem } from './jets.js';
import { TacMap, gridRef, ingressAngle, planIngress } from './tacmap.js';

const _v = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

// Timeline (relative to 'airstrike:incoming', synced to the 6.3s jet audio):
//   t+0.00  jets spawn ~280m out, contrails on
//   t+1.3+  bombs release from pylons (whistle window 1.95-3.0)
//   t+3.15  first impact (audio calls for 3.0-3.5)
//   t+3.30  lead jet crosses the target (audio scream peak)
//   t+4.35  last impact (stick walked over ~1.2s)
//   t+8.5   jets despawned beyond the far edge
const T_CROSS = 3.3;
const T_FIRST_IMPACT = 3.15;
const IMPACT_WINDOW = 1.2;
const N_BOMBS = 9;
const LINE_LENGTH = 90;
const JET_SPEED = 85;
const JET_ALT = 42;

/**
 * Airstrike killstreak. Press [4] when available -> tactical map -> click.
 * Three F-16s ingress from behind the player's shoulder and walk a stick of
 * nine Mk-82s through the target.
 *
 * API (harness contract): grant(), callAt(worldPos, {immediate}), available
 */
export class Airstrike {
  constructor(game) {
    this.game = game;
    this.available = 0;
    this.selecting = false;
    this.strikes = [];
    this.jets = new JetSystem(game);
    this.map = new TacMap(game);
    this.map.onConfirm = (worldPos, { dev } = {}) => this._confirm(worldPos, dev);
  }

  grant() { this.available++; }

  get cursor() { return this.map.cursor; }

  toggleSelect() {
    if (this.map.isOpen) {
      this.map.close();
      this.selecting = false;
      return;
    }
    if (this.available <= 0) return;
    this.selecting = true;
    const p = this.game.player.position;
    this.map.open(new THREE.Vector2(p.x, p.z));
  }

  _confirm(worldPos, dev) {
    if (!dev) {
      if (this.available <= 0) return false;
      this.available--;
    }
    // fly exactly the axis previewed on the map
    this.callAt(new THREE.Vector3(worldPos.x, 0, worldPos.z), { ingressOffset: this.map.plannedOffset });
    return true;
  }

  /**
   * Schedule a strike. Ingress runs from beyond the target TOWARD the player
   * (offset 30-50°): the formation approaches head-on over the target, the
   * stick walks up the line, and the jets scream overhead as they exit.
   * @param {THREE.Vector3} target
   */
  callAt(target, { immediate = false, ingressOffset = null } = {}) {
    let offset = ingressOffset;
    if (offset == null) {
      // prefer the approach corridor the player can actually see
      const mag = randRange(0.5, 0.85);
      offset = planIngress(this.game, target, mag) ?? randPick([-1, 1]) * mag;
    }
    const a = ingressAngle(this.game.player.position, this.game.player.yaw, target, offset);
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));

    this.game.events.emit('airstrike:called', { target: target.clone(), dir: dir.clone() });
    this.game.events.emit('ui:message', {
      text: 'AIRSTRIKE INBOUND',
      sub: `TARGET GRID ${gridRef(target.x, target.z, this.game.world.bounds.half)}`,
    });

    const delay = immediate ? 0.35 : 2.0; // radio call, then jets audible
    this.strikes.push({
      target: target.clone(), dir,
      t: -delay, launched: false, dangerWarned: false, impacts: null, wing: null,
    });
  }

  _launch(s) {
    const { events, world } = this.game;
    events.emit('airstrike:incoming', {});

    // Impact stick: a line through the target along the ingress direction,
    // walked forward over ~1.2s. Lateral scatter follows the dropping jet's
    // formation slot so every bomb falls from directly under its aircraft.
    const side = _v.copy(s.dir).cross(new THREE.Vector3(0, 1, 0)).clone().normalize();
    const jetLat = [0, -9, 9.5];
    s.impacts = [];
    for (let i = 0; i < N_BOMBS; i++) {
      const along = -LINE_LENGTH / 2 + (LINE_LENGTH * i) / (N_BOMBS - 1);
      const lat = jetLat[i % 3] * 0.55 + randSpread(1.9);
      const pos = s.target.clone().addScaledVector(s.dir, along).addScaledVector(side, lat);
      const hit = world.colliders.raycast(new THREE.Vector3(pos.x, 70, pos.z), _down, 120);
      pos.y = hit ? hit.point.y : 0;
      s.impacts.push({
        pos,
        t: T_FIRST_IMPACT + (IMPACT_WINDOW * i) / (N_BOMBS - 1) + randSpread(0.03),
        radius: randRange(9, 11),
      });
    }

    s.wing = this.jets.strike({
      target: s.target, dir: s.dir,
      tToTarget: T_CROSS, speed: JET_SPEED, altitude: JET_ALT,
      impacts: s.impacts.map((im) => ({ pos: im.pos, t: im.t })),
      onRelease: () => this._onRelease(s),
      onImpact: (index, pos) => this._onImpact(s, index, pos),
    });
  }

  _onRelease(s) {
    if (s.dangerWarned) return;
    s.dangerWarned = true;
    const p = this.game.player.position;
    for (const im of s.impacts) {
      if (im.pos.distanceTo(p) < 25) {
        this.game.events.emit('ui:message', { text: 'DANGER CLOSE', sub: 'CLEAR THE AREA' });
        break;
      }
    }
  }

  _onImpact(s, index, pos) {
    const { events, vfx, ai } = this.game;
    const im = s.impacts[index];
    const radius = im?.radius ?? 10;
    events.emit('explosion', {
      position: pos.clone().add(_v.set(0, 0.4, 0)),
      radius,
      damage: 165,
      source: 'airstrike',
    });
    events.emit('airstrike:impact', { position: pos.clone(), index });
    // Lethal core: the generic explosion falloff is tuned for grenades and
    // would leave soldiers standing inside the carpet. Anything close to a
    // 500lb impact dies, attributed to the strike (jet icon in the killfeed).
    for (const e of ai?.enemies ?? []) {
      if (!e.alive) continue;
      const d = e.position.distanceTo(pos);
      if (d < radius * 0.72) {
        e._explCause = 'airstrike';
        e._lastHitDir = _v.set(e.position.x - pos.x, 0.25, e.position.z - pos.z).normalize().clone();
        e.damage(250, false, null, null);
      }
    }
    vfx.smokeColumn(pos, {
      rate: randRange(3, 5),
      size: randRange(1.4, 1.9),
      life: randRange(6.5, 9.5),
    });
  }

  update(dt) {
    const { input } = this.game;

    // [4] toggles targeting; read raw while the map has input frozen
    const toggle = this.map.isOpen ? input._justPressed.has('Digit4') : input.pressed('Digit4');
    if (toggle) this.toggleSelect();

    this.map.update(dt);
    this.selecting = this.map.isOpen;

    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t += dt;
      if (!s.launched && s.t >= 0) {
        s.launched = true;
        this._launch(s);
      }
      if (s.launched && s.t > 10) this.strikes.splice(i, 1);
    }

    this.jets.update(dt);
  }
}
