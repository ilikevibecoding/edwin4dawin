// Battle simulation + arena canvas renderer.
import { clamp, lerp, dist, mulberry32, easeOutQuad } from './util.js';
import { UNITS, CARDS, TOWERS, RULES } from './data.js';
import {
  PAL, TEAM, UNIT_DRAW, drawTower, drawRubble, drawFireball, rr, of, ell,
  outlineText, miniCrown,
} from './art.js';

// Logical arena space: 360 wide. Playfield above the 124px HUD => 516 tall.
export const AW = 360, AH = 516;
export const RIVER_Y = 236;                 // center of the river band
export const LANES = [104, 256];            // bridge center x for left/right lane
export const BRIDGE_W = 46, RIVER_H = 34;
const FIELD_L = 22, FIELD_R = 338;          // grass bounds

export const TOWER_POS = {
  enemy: {
    king: { x: 180, y: 94 },
    left: { x: LANES[0], y: 142 },
    right: { x: LANES[1], y: 142 },
  },
  player: {
    king: { x: 180, y: 462 },
    left: { x: LANES[0], y: 384 },
    right: { x: LANES[1], y: 384 },
  },
};

let idSeq = 1;

export class Battle {
  constructor(events) {
    this.events = events || {};
    this.rng = mulberry32(Date.now() % 100000);
    this.t = 0;
    this.timeLeft = RULES.battleSeconds;
    this.over = false;
    this.result = null;
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floaters = [];
    this.shake = 0;
    this.slowmo = 0;

    this.sides = {};
    for (const side of ['player', 'enemy']) {
      this.sides[side] = {
        elixir: RULES.startElixir,
        crowns: 0,
        towers: this.makeTowers(side),
      };
    }

    // decks
    const deck = CARDS.map((c) => c.id);
    this.playerQueue = shuffle(deck.slice(), this.rng);
    this.hand = [this.playerQueue.shift(), this.playerQueue.shift(), this.playerQueue.shift(), this.playerQueue.shift()];
    this.nextCard = this.playerQueue.shift();

    this.ai = { cd: 4.2, deck: deck.slice() };
  }

  makeTowers(side) {
    const out = {};
    for (const key of ['king', 'left', 'right']) {
      const kind = key === 'king' ? 'king' : 'side';
      const cfg = TOWERS[kind];
      out[key] = {
        id: idSeq++, side, key, kind,
        x: TOWER_POS[side][key].x, y: TOWER_POS[side][key].y,
        hp: cfg.hp, maxHp: cfg.hp, dmg: cfg.dmg, range: cfg.range,
        atkCd: cfg.atkCd, cd: 0, level: cfg.level,
        alive: true, hitFlash: 0, kingAwake: kind === 'king' ? false : true,
        rubble: null,
      };
    }
    return out;
  }

  /* ---------------- economy ---------------- */
  update(dt) {
    if (this.over) {
      this.updateFx(dt);
      return;
    }
    this.t += dt;
    this.timeLeft -= dt;
    const prevWhole = Math.ceil(this.timeLeft + dt);
    const nowWhole = Math.ceil(this.timeLeft);
    if (this.timeLeft <= 10.01 && nowWhole !== prevWhole && nowWhole > 0) this.events.tick?.();

    for (const side of ['player', 'enemy']) {
      const s = this.sides[side];
      s.elixir = Math.min(RULES.elixirMax, s.elixir + RULES.elixirRegenPerSec * dt * (this.timeLeft < 60 ? 1.5 : 1));
    }

    this.updateAI(dt);

    for (const u of this.units) this.updateUnit(u, dt);
    this.units = this.units.filter((u) => !u.dead || u.deathT < 0.5);

    for (const p of this.projectiles) this.updateProjectile(p, dt);
    this.projectiles = this.projectiles.filter((p) => !p.done);

    for (const side of ['player', 'enemy']) {
      for (const tw of Object.values(this.sides[side].towers)) this.updateTower(tw, dt);
    }

    this.updateFx(dt);

    if (this.timeLeft <= 0 && !this.over) {
      const pc = this.sides.player.crowns, ec = this.sides.enemy.crowns;
      this.finish(pc > ec ? 'win' : ec > pc ? 'lose' : 'draw');
    }
  }

  updateFx(dt) {
    this.shake = Math.max(0, this.shake - dt * 26);
    for (const pt of this.particles) {
      pt.t += dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vy += (pt.grav || 0) * dt;
      pt.vx *= 1 - (pt.drag || 0) * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    for (const f of this.floaters) { f.t += dt; f.y -= 26 * dt; }
    this.floaters = this.floaters.filter((f) => f.t < 0.8);
    for (const u of this.units) if (u.dead) u.deathT += dt;
  }

  /* ---------------- cards ---------------- */
  canPlay(side, cardId) {
    const card = CARDS.find((c) => c.id === cardId);
    return card && this.sides[side].elixir >= card.cost;
  }

  playCard(side, cardId, x, y) {
    if (this.over) return false;
    const card = CARDS.find((c) => c.id === cardId);
    if (!card || this.sides[side].elixir < card.cost) return false;
    // clamp deploy to own half (units only)
    if (!card.spell) {
      if (side === 'player') y = clamp(y, RIVER_Y + RIVER_H / 2 + 12, AH - 40);
      else y = clamp(y, 52, RIVER_Y - RIVER_H / 2 - 12);
      x = clamp(x, FIELD_L + 14, FIELD_R - 14);
    }
    this.sides[side].elixir -= card.cost;

    if (card.spell) {
      this.castFireball(side, x, y, card);
    } else {
      const def = UNITS[card.unit];
      const n = def.count;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.6;
        const r = n > 1 ? 13 : 0;
        this.spawnUnit(side, card.unit, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7);
      }
      this.burst(x, y, side === 'player' ? '#7db0ff' : '#ff8a70', 10, 60);
    }
    if (side === 'player') {
      const idx = this.hand.indexOf(cardId);
      if (idx >= 0) {
        this.hand[idx] = this.nextCard;
        this.playerQueue.push(cardId);
        this.nextCard = this.playerQueue.shift();
        this.events.handChanged?.(idx);
      }
    }
    this.events.cardPlayed?.(side, card);
    return true;
  }

  spawnUnit(side, type, x, y) {
    const def = UNITS[type];
    this.units.push({
      id: idSeq++, side, type,
      x, y, hp: def.hp, maxHp: def.hp,
      dmg: def.dmg, range: def.range, atkCd: def.atkCd, cd: 0,
      speed: def.speed, radius: def.radius, sight: def.sight,
      level: def.level, towersOnly: !!def.towersOnly,
      projectile: def.projectile || null, splash: def.splash || 0,
      face: side === 'player' ? -1 : 1, walk: this.rng(),
      deployT: 0, deployDur: 1.0,
      attackT: -1, hitFlash: 0, dead: false, deathT: 0,
      target: null, bridged: y > RIVER_Y - RIVER_H && y < RIVER_Y + RIVER_H,
    });
  }

  castFireball(side, x, y, card) {
    const from = side === 'player'
      ? { x: 180, y: AH + 30 }
      : { x: 180, y: -30 };
    this.projectiles.push({
      kind: 'fireball', side,
      x: from.x, y: from.y, sx: from.x, sy: from.y,
      tx: x, ty: y, t: 0, dur: 0.85,
      dmg: card.dmg, radius: card.radius, done: false,
    });
    this.events.spellLaunched?.();
  }

  /* ---------------- AI ---------------- */
  updateAI(dt) {
    const ai = this.ai;
    ai.cd -= dt;
    if (ai.cd > 0) return;
    const s = this.sides.enemy;
    const affordable = CARDS.filter((c) => c.cost <= s.elixir);
    if (!affordable.length) { ai.cd = 0.8; return; }
    const smart = this.t > 60;
    let card = affordable[Math.floor(this.rng() * affordable.length)];
    let lane = this.rng() < 0.5 ? 0 : 1;
    if (smart) {
      // pressure the player's weaker lane
      const pl = this.sides.player.towers;
      const lHp = pl.left.alive ? pl.left.hp : -1;
      const rHp = pl.right.alive ? pl.right.hp : -1;
      lane = lHp < 0 ? 0 : rHp < 0 ? 1 : lHp < rHp ? 0 : 1;
      // prefer expensive plays when rich
      if (s.elixir > 8) {
        const big = affordable.filter((c) => c.cost >= 4);
        if (big.length) card = big[Math.floor(this.rng() * big.length)];
      }
    }
    if (card.spell) {
      // fireball the densest player cluster, else skip
      const targets = this.units.filter((u) => u.side === 'player' && !u.dead);
      if (targets.length >= 2) {
        const c = targets[Math.floor(this.rng() * targets.length)];
        this.playCard('enemy', card.id, c.x, c.y);
      } else { ai.cd = 1.2; return; }
    } else {
      const bx = LANES[lane] + (this.rng() * 26 - 13);
      const by = 150 + this.rng() * 55;
      this.playCard('enemy', card.id, bx, by);
    }
    ai.cd = smart ? 3.4 + this.rng() * 2.4 : 4.6 + this.rng() * 3.2;
  }

  /* ---------------- units ---------------- */
  towersOf(side) {
    return Object.values(this.sides[side].towers).filter((t) => t.alive);
  }

  updateUnit(u, dt) {
    if (u.dead) return;
    if (u.hitFlash > 0) u.hitFlash -= dt;
    if (u.deployT < u.deployDur) {
      u.deployT += dt;
      return;
    }
    const foe = u.side === 'player' ? 'enemy' : 'player';

    // pick target: nearest enemy unit in sight (unless towersOnly), else nearest tower
    let target = null, bestD = 1e9;
    if (!u.towersOnly) {
      for (const e of this.units) {
        if (e.side !== foe || e.dead || e.deployT < 0.35) continue;
        const d = dist(u.x, u.y, e.x, e.y);
        if (d < u.sight && d < bestD) { bestD = d; target = e; }
      }
    }
    if (!target) {
      for (const tw of this.towersOf(foe)) {
        if (tw.kind === 'king' && !tw.kingAwake && this.towersOf(foe).length > 1) {
          // still targetable but deprioritized while side towers stand
        }
        const d = dist(u.x, u.y, tw.x, tw.y);
        if (d < bestD) { bestD = d; target = tw; }
      }
    }
    u.target = target;
    if (!target) return;

    const tR = target.kind ? 26 : target.radius;
    const inRange = bestD <= u.range + tR + u.radius * 0.4;

    if (u.attackT >= 0) {
      u.attackT += dt / 0.32;
      if (u.attackT >= 0.5 && !u.struck) {
        u.struck = true;
        this.dealAttack(u, target);
      }
      if (u.attackT >= 1) u.attackT = -1;
      return;
    }

    if (inRange) {
      u.cd -= dt;
      if (u.cd <= 0) {
        u.cd = u.atkCd;
        u.attackT = 0;
        u.struck = false;
        u.face = target.x >= u.x + 1 ? 1 : target.x <= u.x - 1 ? -1 : u.face;
      }
      return;
    }

    // ---- movement: route via nearest bridge if target is across the river
    let gx = target.x, gy = target.y;
    const myHalf = u.y < RIVER_Y ? 'top' : 'bottom';
    const tHalf = gy < RIVER_Y ? 'top' : 'bottom';
    const nearRiver = Math.abs(u.y - RIVER_Y) < RIVER_H / 2 + 6;
    if (myHalf !== tHalf && !nearRiver) {
      const bridgeX = Math.abs(u.x - LANES[0]) <= Math.abs(u.x - LANES[1]) ? LANES[0] : LANES[1];
      if (Math.abs(u.x - bridgeX) > 9) { gx = bridgeX; gy = u.y; }
      else { gx = bridgeX; gy = RIVER_Y + (myHalf === 'top' ? RIVER_H : -RIVER_H); }
    } else if (nearRiver) {
      const bridgeX = Math.abs(u.x - LANES[0]) <= Math.abs(u.x - LANES[1]) ? LANES[0] : LANES[1];
      gx = clamp(gx, bridgeX - BRIDGE_W / 2 + 8, bridgeX + BRIDGE_W / 2 - 8);
      if (myHalf !== tHalf) gy = RIVER_Y + (myHalf === 'top' ? RIVER_H : -RIVER_H);
    }

    const dx = gx - u.x, dy = gy - u.y;
    const dd = Math.hypot(dx, dy) || 1;
    let vx = (dx / dd) * u.speed, vy = (dy / dd) * u.speed;

    // gentle separation from same-side units
    for (const o of this.units) {
      if (o === u || o.dead) continue;
      const d = dist(u.x, u.y, o.x, o.y);
      const minD = u.radius + o.radius;
      if (d < minD && d > 0.01) {
        const push = (minD - d) / minD * 26;
        vx += ((u.x - o.x) / d) * push;
        vy += ((u.y - o.y) / d) * push;
      }
    }

    u.x = clamp(u.x + vx * dt, FIELD_L + u.radius, FIELD_R - u.radius);
    u.y = clamp(u.y + vy * dt, 40, AH - 26);
    // keep off the water unless on a bridge
    if (Math.abs(u.y - RIVER_Y) < RIVER_H / 2) {
      const bridgeX = Math.abs(u.x - LANES[0]) <= Math.abs(u.x - LANES[1]) ? LANES[0] : LANES[1];
      u.x = clamp(u.x, bridgeX - BRIDGE_W / 2 + 7, bridgeX + BRIDGE_W / 2 - 7);
    }
    u.face = vx > 4 ? 1 : vx < -4 ? -1 : u.face;
    u.walk = (u.walk + dt * (u.speed / 34) * 1.7) % 1;
  }

  dealAttack(u, target) {
    if (u.projectile) {
      this.projectiles.push({
        kind: u.projectile, side: u.side,
        x: u.x + u.face * 10, y: u.y - 20,
        target, dmg: u.dmg, splash: u.splash, speed: u.projectile === 'arrow' ? 250 : 190,
        t: 0, done: false,
      });
      this.events.ranged?.(u);
      return;
    }
    this.applyDamage(target, u.dmg, u);
    this.events.melee?.(u);
  }

  applyDamage(target, dmg, source) {
    if (target.kind) { // tower
      if (!target.alive) return;
      target.hp -= dmg;
      target.hitFlash = 0.16;
      if (target.kind === 'king') target.kingAwake = true;
      this.floaters.push({ x: target.x + (this.rng() * 18 - 9), y: target.y - 46, t: 0, txt: String(dmg), col: '#ffd84e' });
      if (target.hp <= 0) this.destroyTower(target);
    } else {
      if (target.dead) return;
      target.hp -= dmg;
      target.hitFlash = 0.14;
      this.floaters.push({ x: target.x + (this.rng() * 14 - 7), y: target.y - 34, t: 0, txt: String(dmg), col: '#fff' });
      if (target.hp <= 0) {
        target.dead = true; target.deathT = 0;
        this.poof(target.x, target.y - 8);
        this.events.unitDied?.(target);
      }
    }
  }

  destroyTower(tw) {
    tw.alive = false;
    tw.hp = 0;
    const rocks = [];
    for (let i = 0; i < 7; i++) {
      rocks.push([this.rng() * 44 - 22, -this.rng() * 12 - 2, 5 + this.rng() * 6, this.rng() > 0.5]);
    }
    tw.rubble = rocks;
    this.explosion(tw.x, tw.y - 24, 1.4);
    this.shake = 7;
    const winnerSide = tw.side === 'player' ? 'enemy' : 'player';
    if (tw.kind === 'king') {
      this.sides[winnerSide].crowns = 3;
      this.events.crowns?.(winnerSide);
      this.finish(winnerSide === 'player' ? 'win' : 'lose');
    } else {
      this.sides[winnerSide].crowns = Math.min(3, this.sides[winnerSide].crowns + 1);
      this.sides[tw.side].towers.king.kingAwake = true;
      this.events.crowns?.(winnerSide);
    }
    this.events.towerDown?.(tw);
  }

  finish(result) {
    if (this.over) return;
    this.over = true;
    this.result = result;
    this.events.finished?.(result);
  }

  /* ---------------- towers ---------------- */
  updateTower(tw, dt) {
    if (!tw.alive) return;
    if (tw.hitFlash > 0) tw.hitFlash -= dt;
    if (tw.kind === 'king' && !tw.kingAwake) return;
    tw.cd -= dt;
    if (tw.cd > 0) return;
    const foe = tw.side === 'player' ? 'enemy' : 'player';
    let target = null, bestD = 1e9;
    for (const u of this.units) {
      if (u.side !== foe || u.dead || u.deployT < 0.3) continue;
      const d = dist(tw.x, tw.y, u.x, u.y);
      if (d < tw.range && d < bestD) { bestD = d; target = u; }
    }
    if (!target) return;
    tw.cd = tw.atkCd;
    this.projectiles.push({
      kind: 'bolt', side: tw.side, towerShot: true,
      x: tw.x, y: tw.y - (tw.kind === 'king' ? 58 : 48),
      target, dmg: tw.dmg, speed: 240, t: 0, done: false,
    });
    this.events.ranged?.(tw);
  }

  /* ---------------- projectiles ---------------- */
  updateProjectile(p, dt) {
    p.t += dt;
    if (p.kind === 'fireball') {
      const k = Math.min(1, p.t / p.dur);
      p.x = lerp(p.sx, p.tx, k);
      p.y = lerp(p.sy, p.ty, easeOutQuad(k)) - Math.sin(k * Math.PI) * 90;
      if (k >= 1) {
        p.done = true;
        this.explosion(p.tx, p.ty, 1.0);
        this.shake = 5;
        const foe = p.side === 'player' ? 'enemy' : 'player';
        for (const u of this.units) {
          if (u.side !== foe || u.dead) continue;
          if (dist(u.x, u.y, p.tx, p.ty) < p.radius + u.radius) this.applyDamage(u, p.dmg, p);
        }
        for (const tw of this.towersOf(foe)) {
          if (dist(tw.x, tw.y, p.tx, p.ty) < p.radius + 30) this.applyDamage(tw, Math.round(p.dmg * 0.35), p);
        }
        this.events.spellHit?.();
      }
      return;
    }
    const t = p.target;
    if (!t || (t.kind ? !t.alive : t.dead)) { p.done = true; return; }
    const ty = t.kind ? t.y - 30 : t.y - 14;
    const dx = t.x - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    p.angle = Math.atan2(dy, dx);
    const step = p.speed * dt;
    if (d <= step + 4) {
      p.done = true;
      this.applyDamage(t, p.dmg, p);
      if (p.splash) {
        const foe = p.side === 'player' ? 'enemy' : 'player';
        for (const u of this.units) {
          if (u === t || u.side !== foe || u.dead) continue;
          if (dist(u.x, u.y, t.x, t.y) < p.splash) this.applyDamage(u, Math.round(p.dmg * 0.6), p);
        }
        this.burst(t.x, ty, '#6fdcff', 7, 60);
      }
      this.events.projHit?.(p);
    } else {
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
    }
  }

  /* ---------------- particles ---------------- */
  burst(x, y, col, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const v = spd * (0.4 + this.rng() * 0.8);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20,
        t: 0, life: 0.4 + this.rng() * 0.25, col, r: 2 + this.rng() * 2.6, grav: 140, kind: 'dot',
      });
    }
  }

  poof(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.particles.push({
        x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 3,
        vx: Math.cos(a) * 34, vy: Math.sin(a) * 26 - 24,
        t: 0, life: 0.5, col: '#f2ecdf', r: 5 + this.rng() * 4, grav: -30, drag: 2.4, kind: 'smoke',
      });
    }
  }

  explosion(x, y, scale) {
    this.particles.push({ x, y, vx: 0, vy: 0, t: 0, life: 0.36, r: 40 * scale, kind: 'flash' });
    for (let i = 0; i < 14; i++) {
      const a = this.rng() * Math.PI * 2, v = (60 + this.rng() * 110) * scale;
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 50,
        t: 0, life: 0.5 + this.rng() * 0.3,
        col: ['#ffc93c', '#ff9c2e', '#ff6b2e'][i % 3], r: (3 + this.rng() * 3.4) * scale, grav: 220, kind: 'dot',
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = this.rng() * Math.PI * 2, v = (30 + this.rng() * 60) * scale;
      this.particles.push({
        x, y: y - 4, vx: Math.cos(a) * v, vy: -30 - this.rng() * 60,
        t: 0, life: 0.8 + this.rng() * 0.4, col: '#6b6478', r: (6 + this.rng() * 5) * scale, grav: -20, drag: 1.8, kind: 'smoke',
      });
    }
    for (let i = 0; i < 8; i++) {
      const a = this.rng() * Math.PI * 2, v = (80 + this.rng() * 90) * scale;
      this.particles.push({
        x, y: y - 6, vx: Math.cos(a) * v, vy: -60 - this.rng() * 100,
        t: 0, life: 0.7, col: '#8a7d6a', r: 3 + this.rng() * 2.6, grav: 380, kind: 'debris', rot: this.rng() * 6,
      });
    }
  }
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ======================================================================
   RENDERER
   ====================================================================== */
const TILE = 26;

export function makeArenaBg() {
  const c = document.createElement('canvas');
  const s = 2;
  c.width = AW * s; c.height = AH * s;
  const x = c.getContext('2d');
  x.scale(s, s);
  x.lineJoin = 'round'; x.lineCap = 'round';

  // outer stone frame
  x.fillStyle = '#8f8674';
  x.fillRect(0, 0, AW, AH);
  x.fillStyle = PAL.stone;
  x.fillRect(0, 0, AW, AH);
  // stone tile seams
  x.strokeStyle = PAL.stoneSh; x.lineWidth = 2;
  for (let i = 0; i <= AW; i += 36) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, AH); x.stroke();
  }
  for (let j = 0; j <= AH; j += 36) {
    x.beginPath(); x.moveTo(0, j); x.lineTo(AW, j); x.stroke();
  }
  x.fillStyle = '#00000012';
  x.fillRect(0, 0, AW, 8);

  // grass field
  const gl = FIELD_L, gr = FIELD_R, gt = 30, gb = AH - 12;
  rr(x, gl - 4, gt - 4, gr - gl + 8, gb - gt + 8, 10);
  x.strokeStyle = PAL.grassOut; x.lineWidth = 7; x.stroke();
  x.fillStyle = PAL.grassB; x.fill();
  // checkered
  x.save();
  rr(x, gl, gt, gr - gl, gb - gt, 7); x.clip();
  x.fillStyle = PAL.grassA;
  const c0 = Math.floor((gr - gl) / TILE) + 1;
  const r0 = Math.floor((gb - gt) / TILE) + 1;
  for (let i = 0; i < c0; i++) {
    for (let j = 0; j < r0; j++) {
      if ((i + j) % 2 === 0) x.fillRect(gl + i * TILE, gt + j * TILE, TILE, TILE);
    }
  }
  // mown stripes glare
  x.fillStyle = '#ffffff08';
  for (let j = 0; j < r0; j += 2) x.fillRect(gl, gt + j * TILE, gr - gl, TILE);
  x.restore();

  // river
  const ry = RIVER_Y;
  x.fillStyle = PAL.riverDk;
  x.fillRect(0, ry - RIVER_H / 2 - 3, AW, RIVER_H + 6);
  x.fillStyle = PAL.river;
  x.fillRect(0, ry - RIVER_H / 2, AW, RIVER_H);
  x.strokeStyle = PAL.out; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, ry - RIVER_H / 2 - 3); x.lineTo(AW, ry - RIVER_H / 2 - 3); x.stroke();
  x.beginPath(); x.moveTo(0, ry + RIVER_H / 2 + 3); x.lineTo(AW, ry + RIVER_H / 2 + 3); x.stroke();

  // bridges
  for (const bx of LANES) {
    const bw = BRIDGE_W + 10, bh = RIVER_H + 18;
    rr(x, bx - bw / 2, ry - bh / 2, bw, bh, 6);
    of2(x, PAL.wood, 4);
    // planks
    x.strokeStyle = PAL.woodDk; x.lineWidth = 2;
    for (let j = 1; j < 5; j++) {
      const yy = ry - bh / 2 + (bh / 5) * j;
      x.beginPath(); x.moveTo(bx - bw / 2 + 3, yy); x.lineTo(bx + bw / 2 - 3, yy); x.stroke();
    }
    // side rails
    x.fillStyle = PAL.woodLt;
    rr(x, bx - bw / 2 - 3, ry - bh / 2 - 2, 6, bh + 4, 3); x.fill();
    x.strokeStyle = PAL.out; x.lineWidth = 2.6; x.stroke();
    rr(x, bx + bw / 2 - 3, ry - bh / 2 - 2, 6, bh + 4, 3); x.fill(); x.stroke();
  }

  // deco: rocks, shrubs, fences on the outer band
  const rng = mulberry32(7);
  const deco = [
    ['rock', 10, 60], ['rock', 350, 90], ['shrub', 9, 150], ['shrub', 351, 200],
    ['rock', 8, 300], ['shrub', 352, 330], ['rock', 348, 430], ['shrub', 10, 470],
    ['rock', 11, 380], ['shrub', 349, 140],
  ];
  for (const [kind, dx, dy] of deco) {
    if (kind === 'rock') {
      ell(x, dx, dy, 8 + rng() * 3, 6 + rng() * 2); of2(x, PAL.stoneLt, 3.4);
      x.fillStyle = '#ffffff55';
      ell(x, dx - 2.5, dy - 2.5, 3, 2); x.fill();
    } else {
      ell(x, dx, dy, 9, 7); of2(x, '#5faf3f', 3.4);
      ell(x, dx - 4, dy - 3.5, 4.5, 3.6); x.fillStyle = '#7ec850'; x.fill();
      ell(x, dx + 3, dy - 2.4, 3.6, 3); x.fill();
    }
  }
  // fences top + bottom edges
  for (const fy of [22, AH - 7]) {
    for (let fx = 34; fx < AW - 30; fx += 24) {
      if (fx > 120 && fx < 240 && fy === 22) continue; // gap behind king tower
      x.strokeStyle = PAL.out; x.lineWidth = 5.6;
      x.beginPath(); x.moveTo(fx, fy - 8); x.lineTo(fx, fy + 4); x.stroke();
      x.strokeStyle = PAL.woodLt; x.lineWidth = 3;
      x.beginPath(); x.moveTo(fx, fy - 8); x.lineTo(fx, fy + 4); x.stroke();
    }
    x.strokeStyle = PAL.out; x.lineWidth = 4.6;
    x.beginPath(); x.moveTo(26, fy - 3); x.lineTo(AW - 26, fy - 3); x.stroke();
    x.strokeStyle = PAL.wood; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(26, fy - 3); x.lineTo(AW - 26, fy - 3); x.stroke();
  }
  return c;
}

function of2(x, fill, lw) {
  x.strokeStyle = PAL.out; x.lineWidth = lw; x.stroke();
  x.fillStyle = fill; x.fill();
}

export class ArenaRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.bg = makeArenaBg();
    this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
  }

  resize(cssW, cssH) {
    const s = this.dpr * (cssW / 360);
    this.canvas.width = Math.round(360 * s);
    this.canvas.height = Math.round((cssH / cssW) * 360 * s);
    this.scale = s;
  }

  render(b, tGlobal, deployPreview) {
    const x = this.canvas.getContext('2d');
    const s = this.scale;
    x.setTransform(s, 0, 0, s, 0, 0);
    x.imageSmoothingEnabled = true;
    x.lineJoin = 'round'; x.lineCap = 'round';

    // camera shake
    let shx = 0, shy = 0;
    if (b.shake > 0) {
      shx = (Math.random() * 2 - 1) * b.shake * 0.7;
      shy = (Math.random() * 2 - 1) * b.shake * 0.7;
    }
    x.translate(shx, shy);

    x.drawImage(this.bg, 0, 0, AW, AH);

    // river shimmer
    x.save();
    x.globalAlpha = 0.5;
    x.strokeStyle = PAL.riverLt;
    x.lineWidth = 2.4;
    for (let i = 0; i < 7; i++) {
      const wx = ((i * 73 + tGlobal * 26) % (AW + 60)) - 30;
      const wy = RIVER_Y - 8 + ((i * 37) % 17);
      x.beginPath();
      x.moveTo(wx, wy);
      x.quadraticCurveTo(wx + 7, wy - 2.4, wx + 14, wy);
      x.stroke();
    }
    x.globalAlpha = 1;
    x.restore();

    // deploy zone hint
    if (deployPreview) {
      x.save();
      x.fillStyle = 'rgba(80, 160, 255, 0.14)';
      x.strokeStyle = 'rgba(120, 190, 255, 0.75)';
      x.lineWidth = 2;
      x.setLineDash([7, 6]);
      rr(x, FIELD_L, RIVER_Y + RIVER_H / 2 + 4, FIELD_R - FIELD_L, AH - 20 - (RIVER_Y + RIVER_H / 2), 8);
      x.fill(); x.stroke();
      x.setLineDash([]);
      x.restore();
    }

    // ------- collect drawables, y-sorted
    const items = [];
    for (const side of ['player', 'enemy']) {
      for (const tw of Object.values(b.sides[side].towers)) {
        items.push({ y: tw.y + 6, kind: 'tower', tw });
      }
    }
    for (const u of b.units) items.push({ y: u.y, kind: 'unit', u });
    items.sort((a, bb) => a.y - bb.y);

    for (const it of items) {
      if (it.kind === 'tower') this.drawTowerItem(x, it.tw, b, tGlobal);
      else this.drawUnitItem(x, it.u, b, tGlobal);
    }

    // projectiles
    for (const p of b.projectiles) this.drawProjectile(x, p, tGlobal);

    // particles
    for (const pt of b.particles) this.drawParticle(x, pt);

    // floaters (damage numbers)
    for (const f of b.floaters) {
      const a = f.t < 0.55 ? 1 : 1 - (f.t - 0.55) / 0.25;
      x.globalAlpha = Math.max(0, a);
      const pop = f.t < 0.12 ? 0.7 + (f.t / 0.12) * 0.5 : 1.2 - Math.min(0.2, (f.t - 0.12) * 0.8);
      outlineText(x, f.txt, f.x, f.y, 13 * pop, f.col, 3.4);
      x.globalAlpha = 1;
    }

    x.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawTowerItem(x, tw, b, t) {
    if (!tw.alive) {
      drawRubble(x, tw.x, tw.y + 4, tw.rubble);
      return;
    }
    // shadow
    x.fillStyle = '#00000022';
    ell(x, tw.x, tw.y + 8, tw.kind === 'king' ? 46 : 36, 10); x.fill();
    x.save();
    if (tw.hitFlash > 0) { x.filter = 'brightness(1.6) saturate(0.6)'; }
    drawTower(x, tw.x, tw.y, { team: tw.side, kind: tw.kind, t, hp01: tw.hp / tw.maxHp });
    x.restore();
    // crown emblem hovering above the king keep
    if (tw.kind === 'king') {
      const bobY = Math.sin(t * 2.2) * 2;
      miniCrown(x, tw.x, tw.y - 82 - bobY, 17);
    }
    // level badge + HP bar
    const barW = tw.kind === 'king' ? 56 : 46;
    const by = tw.y - (tw.kind === 'king' ? 60 : 92);
    const T = TEAM[tw.side];
    if (tw.hp < tw.maxHp || tw.kind !== 'king') {
      // badge
      rr(x, tw.x - barW / 2 - 9, by - 7, 15, 15, 4.5); of(x, T.main, 3);
      outlineText(x, String(tw.level), tw.x - barW / 2 - 1.5, by + 0.5, 9.5, '#fff', 2.6);
      // bar
      rr(x, tw.x - barW / 2 + 8, by - 5, barW - 8, 11, 5); of(x, '#181228', 3);
      const k = clamp(tw.hp / tw.maxHp, 0, 1);
      if (k > 0) {
        rr(x, tw.x - barW / 2 + 9.5, by - 3.5, (barW - 11) * k, 8, 3.6);
        x.fillStyle = T.bar; x.fill();
        x.fillStyle = '#ffffff55';
        rr(x, tw.x - barW / 2 + 9.5, by - 3.5, (barW - 11) * k, 3, 2); x.fill();
      }
      outlineText(x, String(Math.max(0, Math.ceil(tw.hp))), tw.x + 4, by + 0.5, 9.5, '#fff', 2.8);
    }
    // sleeping indicator for king
    if (tw.kind === 'king' && !tw.kingAwake) {
      const zt = (t % 2) / 2;
      x.globalAlpha = 0.75 * (1 - zt);
      outlineText(x, 'z', tw.x + 30 + zt * 7, tw.y - 44 - zt * 12, 11 + zt * 5, '#cfe3ff', 2.6);
      x.globalAlpha = 1;
    }
  }

  drawUnitItem(x, u, b, t) {
    const T = TEAM[u.side];
    if (u.dead) {
      return; // poof particles handle it
    }
    // deploy countdown ring
    if (u.deployT < u.deployDur) {
      const k = u.deployT / u.deployDur;
      x.fillStyle = '#00000026';
      ell(x, u.x, u.y + 2, u.radius + 4, (u.radius + 4) * 0.45); x.fill();
      x.strokeStyle = '#ffffff88'; x.lineWidth = 3;
      x.beginPath(); x.arc(u.x, u.y - 14, 13, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = T.bar; x.lineWidth = 3.6;
      x.beginPath(); x.arc(u.x, u.y - 14, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); x.stroke();
      const ghost = 0.45 + 0.2 * Math.sin(t * 10);
      x.globalAlpha = ghost;
      UNIT_DRAW[u.type](x, u.x, u.y, { face: u.face, walk: 0, s: unitScale(u), team: u.side });
      x.globalAlpha = 1;
      return;
    }
    // shadow
    x.fillStyle = '#00000028';
    ell(x, u.x, u.y + 1.5, u.radius + 3, (u.radius + 3) * 0.42); x.fill();
    // squash & stretch on attack
    let sy = 1, sx = 1;
    if (u.attackT >= 0) {
      const k = Math.sin(Math.min(1, u.attackT) * Math.PI);
      sy = 1 - k * 0.12; sx = 1 + k * 0.1;
    }
    x.save();
    x.translate(u.x, u.y);
    x.scale(sx, sy);
    x.translate(-u.x, -u.y);
    if (u.hitFlash > 0) x.filter = 'brightness(1.75)';
    UNIT_DRAW[u.type](x, u.x, u.y, {
      face: u.face, walk: u.walk, attack01: u.attackT >= 0 ? Math.min(1, u.attackT) : 0,
      s: unitScale(u), team: u.side,
    });
    x.restore();
    // overhead: level badge + mini HP bar
    const bw = 26;
    const oy = u.y - unitH(u);
    rr(x, u.x - bw / 2 - 7, oy - 5, 11, 11, 3.4); of(x, T.main, 2.6);
    outlineText(x, String(u.level), u.x - bw / 2 - 1.5, oy + 0.5, 7.5, '#fff', 2.2);
    rr(x, u.x - bw / 2 + 5, oy - 3.5, bw - 5, 8, 3.6); of(x, '#181228', 2.4);
    const k = clamp(u.hp / u.maxHp, 0, 1);
    if (k > 0) {
      rr(x, u.x - bw / 2 + 6.2, oy - 2.3, (bw - 7.4) * k, 5.6, 2.6);
      x.fillStyle = T.bar; x.fill();
      x.fillStyle = '#ffffff66';
      rr(x, u.x - bw / 2 + 6.2, oy - 2.3, (bw - 7.4) * k, 2.2, 1.6); x.fill();
    }
  }

  drawProjectile(x, p, t) {
    if (p.kind === 'fireball') {
      x.fillStyle = '#00000020';
      ell(x, p.x, p.ty + 4, 12, 4.5); x.fill();
      drawFireball(x, p.x, p.y, 9, t, Math.atan2(p.y - (p.py ?? p.y - 1), p.x - (p.px ?? p.x - 1)) + Math.PI);
      p.px = p.x; p.py = p.y;
      return;
    }
    if (p.kind === 'arrow') {
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.angle || 0);
      x.strokeStyle = PAL.out; x.lineWidth = 3.6;
      x.beginPath(); x.moveTo(-7, 0); x.lineTo(5, 0); x.stroke();
      x.strokeStyle = PAL.wood; x.lineWidth = 1.8;
      x.beginPath(); x.moveTo(-7, 0); x.lineTo(5, 0); x.stroke();
      x.fillStyle = '#e8e2d0';
      x.beginPath(); x.moveTo(5, -2.4); x.lineTo(9.5, 0); x.lineTo(5, 2.4); x.closePath(); x.fill();
      x.strokeStyle = PAL.out; x.lineWidth = 1.2; x.stroke();
      x.restore();
      return;
    }
    // magic bolt
    const g = x.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, 9);
    g.addColorStop(0, '#eafcff');
    g.addColorStop(0.45, p.towerShot ? (p.side === 'enemy' ? '#ff8a70' : '#7db0ff') : '#6fdcff');
    g.addColorStop(1, 'rgba(110,220,255,0)');
    x.fillStyle = g;
    ell(x, p.x, p.y, 9, 9); x.fill();
    x.fillStyle = '#fff';
    ell(x, p.x, p.y, 3, 3); x.fill();
  }

  drawParticle(x, pt) {
    const k = pt.t / pt.life;
    if (pt.kind === 'flash') {
      x.globalAlpha = 1 - k;
      const g = x.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.r * (0.5 + k));
      g.addColorStop(0, '#fff8e0');
      g.addColorStop(0.5, '#ffc93c');
      g.addColorStop(1, 'rgba(255,150,40,0)');
      x.fillStyle = g;
      ell(x, pt.x, pt.y, pt.r * (0.5 + k), pt.r * (0.5 + k)); x.fill();
      x.globalAlpha = 1;
      return;
    }
    if (pt.kind === 'smoke') {
      x.globalAlpha = (1 - k) * 0.75;
      x.fillStyle = pt.col;
      ell(x, pt.x, pt.y, pt.r * (0.7 + k * 0.9), pt.r * (0.7 + k * 0.9)); x.fill();
      x.globalAlpha = 1;
      return;
    }
    if (pt.kind === 'debris') {
      x.save();
      x.globalAlpha = 1 - k * k;
      x.translate(pt.x, pt.y);
      x.rotate((pt.rot || 0) + pt.t * 9);
      x.fillStyle = pt.col;
      x.fillRect(-pt.r / 2, -pt.r / 2, pt.r, pt.r * 0.8);
      x.strokeStyle = PAL.out; x.lineWidth = 1.2;
      x.strokeRect(-pt.r / 2, -pt.r / 2, pt.r, pt.r * 0.8);
      x.restore();
      x.globalAlpha = 1;
      return;
    }
    x.globalAlpha = 1 - k;
    x.fillStyle = pt.col;
    ell(x, pt.x, pt.y, pt.r * (1 - k * 0.5), pt.r * (1 - k * 0.5)); x.fill();
    x.globalAlpha = 1;
  }
}

function unitScale(u) {
  return { knight: 1, ogre: 1, imp: 1, archer: 1, mage: 1 }[u.type] || 1;
}
function unitH(u) {
  return { knight: 46, ogre: 52, imp: 28, archer: 42, mage: 50 }[u.type] || 42;
}
