// Breakable glass panes. Intact: blocks movement (unless balustrade), lets
// bullets through with damage falloff, transparent to vision unless frosted.
// Broken: collision removed, jagged remnant visuals, FX + sound + AI noise.
import * as THREE from 'three';
import { bus } from '../core/events.js';
import { boxGeo } from '../assets/geo.js';
import { getMaterial } from '../assets/materials.js';
import { GLASS_T } from './layout.js';

let paneCounter = 0;

export class GlassPane {
  constructor(game, spec) {
    this.game = game;
    this.id = 'pane_' + (++paneCounter);
    this.spec = spec;
    this.kind = spec.kind || 'clear';
    this.broken = false;
    this.cracked = false;

    const len = spec.hi - spec.lo;
    const h = spec.y1 - spec.y0;
    const cx = spec.dir === 'v' ? spec.coord : (spec.lo + spec.hi) / 2;
    const cz = spec.dir === 'v' ? (spec.lo + spec.hi) / 2 : spec.coord;
    const cy = (spec.y0 + spec.y1) / 2;
    this.center = { x: cx, y: cy, z: cz };
    this.size = { len, h };

    const matKey = this.kind === 'frosted' ? 'glass_frosted' : this.kind === 'tinted' ? 'glass_tinted' : 'glass';
    const geo = spec.dir === 'v' ? boxGeo(GLASS_T, h, len) : boxGeo(len, h, GLASS_T);
    this.mesh = new THREE.Mesh(geo, getMaterial(matKey));
    this.mesh.position.set(cx, cy, cz);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.name = this.id;

    const t = 0.06;
    const min = spec.dir === 'v'
      ? { x: cx - t, y: spec.y0, z: spec.lo }
      : { x: spec.lo, y: spec.y0, z: cz - t };
    const max = spec.dir === 'v'
      ? { x: cx + t, y: spec.y1, z: spec.hi }
      : { x: spec.hi, y: spec.y1, z: cz + t };
    this.cbox = game.world.collision.addBox(min, max, {
      tag: 'glass', material: 'glass',
      solid: !spec.balustrade,
      bullet: true,
      vision: this.kind === 'frosted', // frosted blocks AI sight until broken
      penetrable: true,
      ref: this,
    });
  }

  onShot(point) {
    if (this.broken) return;
    this.break(point);
  }

  break(point) {
    if (this.broken) return;
    this.broken = true;
    this.game.world.collision.removeBox(this.cbox);
    // remnant shards along the frame edges
    const remnant = new THREE.Group();
    const mat = getMaterial(this.kind === 'frosted' ? 'glass_frosted' : 'glass');
    const mk = (sx, sy, sz, x, y, z, rz) => {
      const m = new THREE.Mesh(boxGeo(sx, sy, sz), mat);
      m.position.set(x, y, z);
      m.rotation.z = rz;
      remnant.add(m);
    };
    const { len, h } = this.size;
    const rng = this.game.rng;
    const n = Math.max(3, Math.floor(len / 0.4));
    for (let i = 0; i < n; i++) {
      const a = -len / 2 + (len * (i + 0.5)) / n;
      const sh = 0.08 + rng.next() * 0.16;
      if (this.spec.dir === 'v') mk(GLASS_T, sh, len / n * 0.7, 0, -h / 2 + sh / 2, a, (rng.next() - 0.5) * 0.3);
      else mk(len / n * 0.7, sh, GLASS_T, a, -h / 2 + sh / 2, 0, (rng.next() - 0.5) * 0.3);
    }
    remnant.position.copy(this.mesh.position);
    this.mesh.parent?.add(remnant);
    this.mesh.visible = false;
    this.remnant = remnant;

    this.game.fx?.glassShatter(point || this.center, this.spec.dir, this.size);
    bus.emit('glass-break', { id: this.id, pos: this.center });
  }

  reset() {
    if (!this.broken) return;
    this.broken = false;
    this.mesh.visible = true;
    if (this.remnant) { this.remnant.parent?.remove(this.remnant); this.remnant = null; }
    // restore collision
    const spec = this.spec;
    const t = 0.06;
    const cx = this.center.x, cz = this.center.z;
    const min = spec.dir === 'v' ? { x: cx - t, y: spec.y0, z: spec.lo } : { x: spec.lo, y: spec.y0, z: cz - t };
    const max = spec.dir === 'v' ? { x: cx + t, y: spec.y1, z: spec.hi } : { x: spec.hi, y: spec.y1, z: cz + t };
    this.cbox = this.game.world.collision.addBox(min, max, {
      tag: 'glass', material: 'glass', solid: !spec.balustrade, bullet: true,
      vision: this.kind === 'frosted', penetrable: true, ref: this,
    });
  }
}
