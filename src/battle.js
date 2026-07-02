// Battle simulation + arena canvas renderer.
import { clamp, lerp, dist, mulberry32, easeOutQuad } from './util.js';
import { UNITS, CARDS, TOWERS, RULES } from './data.js';
import {
  PAL, TEAM, UNIT_DRAW, drawTower, drawRubble, drawFireball, rr, of, ell,
  outlineText, miniCrown, mix, shade, rgba, grad, rgrad, edgeFor,
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
    this.floatStacks = new Map();
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
    for (const f of this.floaters) { f.t += dt; f.y -= 30 * dt; f.x += (f.vx || 0) * dt; }
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
        // persistent lateral offset keeps squads walking in formation
        const formOff = n > 1 ? (i - (n - 1) / 2) * 13 : 0;
        this.spawnUnit(side, card.unit, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, formOff);
      }
      this.burst(x, y, side === 'player' ? '#7db0ff' : '#ff8a70', 8, 60);
      // elixir splash: magenta droplets kick up at the deploy point
      for (let i = 0; i < 9; i++) {
        const a = this.rng() * Math.PI * 2, v = 40 + this.rng() * 70;
        this.particles.push({
          x: x + Math.cos(a) * 5, y: y - 2,
          vx: Math.cos(a) * v * 0.7, vy: -v,
          t: 0, life: 0.42 + this.rng() * 0.2,
          col: i % 3 === 0 ? '#ff9df2' : '#e453e0', r: 2.4 + this.rng() * 2.2,
          grav: 320, kind: 'dot',
        });
      }
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

  spawnUnit(side, type, x, y, formOff = 0) {
    const def = UNITS[type];
    this.units.push({
      id: idSeq++, side, type,
      x, y, hp: def.hp, maxHp: def.hp,
      dmg: def.dmg, range: def.range, atkCd: def.atkCd, cd: 0,
      speed: def.speed, radius: def.radius, sight: def.sight,
      level: def.level, towersOnly: !!def.towersOnly,
      projectile: def.projectile || null, splash: def.splash || 0,
      face: side === 'player' ? -1 : 1, walk: this.rng(),
      deployT: 0, deployDur: 1.0, formOff,
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
      // keep spawns on grass, clear of the tower platform (pad ends ~y=165)
      const bx = LANES[lane] + (this.rng() * 26 - 13);
      const by = 172 + this.rng() * 33;
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
      if (u.deployT >= u.deployDur) {
        // activation dust kick
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.particles.push({
            x: u.x + Math.cos(a) * u.radius * 0.7, y: u.y + 1,
            vx: Math.cos(a) * 42, vy: -14 - this.rng() * 16,
            t: 0, life: 0.34, col: '#e8dfc8', r: 3 + this.rng() * 2, grav: 60, drag: 2, kind: 'smoke',
          });
        }
      }
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
    let gx = target.x + (u.formOff || 0), gy = target.y;
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

    // separation so units don't merge into blobs (any team)
    for (const o of this.units) {
      if (o === u || o.dead) continue;
      const d = dist(u.x, u.y, o.x, o.y);
      const minD = (u.radius + o.radius) * 0.92;
      if (d < minD && d > 0.01) {
        const push = ((minD - d) / minD) * 62;
        vx += ((u.x - o.x) / d) * push;
        vy += ((u.y - o.y) / d) * push;
      } else if (d < 0.01) {
        vx += (this.rng() - 0.5) * 40;
        vy += (this.rng() - 0.5) * 40;
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
    // impact star at the contact point
    const tx = target.x, ty = target.kind ? target.y - 24 : target.y - 12;
    const ix = lerp(u.x, tx, 0.72), iy = lerp(u.y - 14, ty, 0.72);
    this.particles.push({ x: ix, y: iy, vx: 0, vy: 0, t: 0, life: 0.18, r: 9, kind: 'star', rot: this.rng() * Math.PI });
    for (let i = 0; i < 4; i++) {
      const a = this.rng() * Math.PI * 2;
      this.particles.push({
        x: ix, y: iy, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 - 20,
        t: 0, life: 0.22, col: '#fff', r: 1.8, grav: 120, kind: 'dot',
      });
    }
    this.applyDamage(target, u.dmg, u);
    this.events.melee?.(u);
  }

  spawnFloater(x, y, txt, col, key = null) {
    // cycle spawn offsets so simultaneous numbers fan out instead of stacking
    this.floatSeq = ((this.floatSeq || 0) + 1) % 5;
    const ox = [-14, 8, -3, 14, -9][this.floatSeq];
    // repeated hits on the SAME target climb upward so they never overlap
    let lift = 0;
    if (key !== null) {
      const st = this.floatStacks.get(key);
      if (st && this.t - st.t < 0.55) {
        st.n = Math.min(st.n + 1, 3); st.t = this.t; lift = st.n * 12;
      } else {
        this.floatStacks.set(key, { n: 0, t: this.t });
      }
    }
    this.floaters.push({ x: x + ox, y: y - 4 - lift, t: 0, txt, col, vx: ox * 0.7 });
  }

  applyDamage(target, dmg, source) {
    if (target.kind) { // tower
      if (!target.alive) return;
      target.hp -= dmg;
      target.hitFlash = 0.16;
      if (target.kind === 'king') target.kingAwake = true;
      // spawn on the tower body so the number fades before reaching the HP bar
      this.spawnFloater(target.x, target.y - 24, String(dmg), '#ffd84e', target);
      if (target.hp <= 0) this.destroyTower(target);
    } else {
      if (target.dead) return;
      target.hp -= dmg;
      target.hitFlash = 0.14;
      this.spawnFloater(target.x, target.y - 36, String(dmg), '#fff', target);
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
    // launch from the defender's bow on the tower top, nudged toward the target
    const my = tw.y - (tw.kind === 'king' ? 78 : 67);
    const mx = tw.x + Math.sign(target.x - tw.x || 1) * 8;
    tw.muzzle = 0.14; // renderer shows a flash while > 0
    this.particles.push({ x: mx, y: my, vx: 0, vy: 0, t: 0, life: 0.14, r: 10, kind: 'muzzle', side: tw.side });
    this.projectiles.push({
      kind: 'bolt', side: tw.side, towerShot: true,
      x: mx, y: my,
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
    // expanding ground shockwave ring + lingering scorch decal
    this.particles.push({ x, y: y + 6, vx: 0, vy: 0, t: 0, life: 0.42, r: 54 * scale, kind: 'ring' });
    this.particles.push({ x, y: y + 8, vx: 0, vy: 0, t: 0, life: 1.5, r: 26 * scale, kind: 'scorch' });
    // hot embers that arc and gutter out
    for (let i = 0; i < 12; i++) {
      const a = this.rng() * Math.PI * 2, v = (90 + this.rng() * 150) * scale;
      this.particles.push({
        x, y: y - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 90 - this.rng() * 70,
        t: 0, life: 0.55 + this.rng() * 0.35, r: 1.4 + this.rng() * 1.4,
        grav: 300, kind: 'ember',
      });
    }
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
        t: 0, life: 0.8 + this.rng() * 0.4, col: '#5d5568', col2: '#a89db2', a0: 0.6,
        r: (6 + this.rng() * 5) * scale, grav: -20, drag: 1.8, kind: 'smoke',
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

  // outer terrain frame: staggered stone slabs with bevels (reads as a raised walkway)
  x.fillStyle = grad(x, 0, 0, 0, AH, [
    [0, shade(PAL.stone, -0.16)], [0.5, PAL.stone], [1, shade(PAL.stone, -0.2)],
  ]);
  x.fillRect(0, 0, AW, AH);
  const srng = mulberry32(11);
  const SW = 36, SH = 26;
  for (let j = 0; j < Math.ceil(AH / SH) + 1; j++) {
    const off = (j % 2) * (SW / 2);
    for (let i = -1; i < Math.ceil(AW / SW) + 1; i++) {
      const sx0 = i * SW + off, sy0 = j * SH;
      x.fillStyle = shade(PAL.stone, (srng() - 0.5) * 0.16);
      rr(x, sx0 + 1, sy0 + 1, SW - 2, SH - 2, 4); x.fill();
      // top bevel catches the light; bottom edge sinks
      x.fillStyle = 'rgba(255, 246, 214, 0.15)';
      rr(x, sx0 + 2.5, sy0 + 2.5, SW - 5, 3, 2); x.fill();
      x.fillStyle = 'rgba(34, 28, 56, 0.13)';
      rr(x, sx0 + 2.5, sy0 + SH - 5.5, SW - 5, 3, 2); x.fill();
      // occasional crack or pebble so slabs aren't stamped clones
      if (srng() < 0.16) {
        x.strokeStyle = 'rgba(60, 50, 42, 0.35)'; x.lineWidth = 1.2;
        const cx3 = sx0 + 6 + srng() * (SW - 12), cy3 = sy0 + 6 + srng() * (SH - 12);
        x.beginPath();
        x.moveTo(cx3, cy3);
        x.lineTo(cx3 + 4 + srng() * 4, cy3 + 2 + srng() * 3);
        x.lineTo(cx3 + 7 + srng() * 5, cy3 + 6 + srng() * 3);
        x.stroke();
      }
    }
  }
  // corner boulder clusters ground the frame
  for (const [bx3, by3] of [[10, 13], [AW - 11, 15], [9, AH - 11], [AW - 10, AH - 12]]) {
    x.fillStyle = 'rgba(20, 16, 36, 0.20)';
    ell(x, bx3 + 1, by3 + 4, 11, 4); x.fill();
    for (const [ox, oy, r2] of [[-4, 0, 5.5], [3.5, -2, 4.4], [1, 3, 3.4]]) {
      ell(x, bx3 + ox, by3 + oy, r2, r2 * 0.85);
      x.strokeStyle = shade(PAL.stone, -0.52); x.lineWidth = 2.6; x.stroke();
      x.fillStyle = grad(x, bx3 + ox, by3 + oy - r2, bx3 + ox, by3 + oy + r2,
        [[0, shade(PAL.stoneLt, 0.1)], [1, shade(PAL.stone, -0.2)]]);
      x.fill();
      x.fillStyle = 'rgba(255, 250, 230, 0.35)';
      ell(x, bx3 + ox - r2 * 0.3, by3 + oy - r2 * 0.4, r2 * 0.32, r2 * 0.2); x.fill();
    }
  }
  // moss creeping onto the walkway near the turf edge
  const mossRng = mulberry32(23);
  for (let i = 0; i < 12; i++) {
    const side = mossRng() < 0.5;
    const mx3 = side ? FIELD_L - 9 - mossRng() * 6 : FIELD_R + 9 + mossRng() * 6;
    const my3 = 46 + mossRng() * (AH - 92);
    if (Math.abs(my3 - RIVER_Y) < 30) continue;
    x.fillStyle = `rgba(110, 168, 62, ${0.32 + mossRng() * 0.2})`;
    ell(x, mx3, my3, 4.5 + mossRng() * 3, 2.6 + mossRng() * 1.6); x.fill();
    x.fillStyle = 'rgba(150, 205, 90, 0.3)';
    ell(x, mx3 - 1.5, my3 - 1.2, 2.4, 1.4); x.fill();
  }

  // grass field: lit gradient base + soft checkers + mottling + blade texture
  const gl = FIELD_L, gr = FIELD_R, gt = 30, gb = AH - 12;
  rr(x, gl - 4, gt - 4, gr - gl + 8, gb - gt + 8, 10);
  x.strokeStyle = PAL.grassOut; x.lineWidth = 7; x.stroke();
  x.fillStyle = grad(x, 0, gt, 0, gb, [
    [0, mix(PAL.grassB, '#3f7c2e', 0.30)],
    [0.45, PAL.grassB],
    [1, mix(PAL.grassB, '#d8ee7a', 0.16)],
  ]);
  x.fill();
  x.save();
  rr(x, gl, gt, gr - gl, gb - gt, 7); x.clip();
  // checkers as translucent lighter tiles so the light gradient shows through
  x.fillStyle = rgba(mix(PAL.grassA, '#e0f78e', 0.25), 0.5);
  const c0 = Math.floor((gr - gl) / TILE) + 1;
  const r0 = Math.floor((gb - gt) / TILE) + 1;
  for (let i = 0; i < c0; i++) {
    for (let j = 0; j < r0; j++) {
      if ((i + j) % 2 === 0) x.fillRect(gl + i * TILE, gt + j * TILE, TILE, TILE);
    }
  }
  // organic mottling: broad soft patches of hue variance
  const mrng = mulberry32(97);
  for (let i = 0; i < 15; i++) {
    const mx2 = gl + mrng() * (gr - gl), my2 = gt + mrng() * (gb - gt);
    const mr = 30 + mrng() * 42;
    const dark = mrng() < 0.58;
    x.fillStyle = rgrad(x, mx2, my2, mr * 0.1, mr, dark
      ? [[0, 'rgba(47, 94, 32, 0.13)'], [1, 'rgba(47, 94, 32, 0)']]
      : [[0, 'rgba(233, 255, 148, 0.11)'], [1, 'rgba(233, 255, 148, 0)']]);
    ell(x, mx2, my2, mr, mr * 0.72); x.fill();
  }
  // fine blade strokes give the turf a real nap
  for (let i = 0; i < 330; i++) {
    const bx2 = gl + mrng() * (gr - gl), by2 = gt + mrng() * (gb - gt);
    if (Math.abs(by2 - RIVER_Y) < 26) continue;
    const len = 2.6 + mrng() * 2.6, lean = (mrng() - 0.5) * 2.4;
    x.strokeStyle = mrng() < 0.5 ? 'rgba(72, 140, 44, 0.30)' : 'rgba(213, 244, 138, 0.28)';
    x.lineWidth = 1.15;
    x.beginPath();
    x.moveTo(bx2, by2);
    x.quadraticCurveTo(bx2 + lean * 0.5, by2 - len * 0.6, bx2 + lean, by2 - len);
    x.stroke();
  }
  // mown stripes glare
  x.fillStyle = '#ffffff07';
  for (let j = 0; j < r0; j += 2) x.fillRect(gl, gt + j * TILE, gr - gl, TILE);
  // inner ambient occlusion where the turf meets the frame
  x.strokeStyle = 'rgba(34, 74, 22, 0.30)'; x.lineWidth = 13;
  rr(x, gl - 2, gt - 2, gr - gl + 4, gb - gt + 4, 9); x.stroke();
  x.strokeStyle = 'rgba(34, 74, 22, 0.22)'; x.lineWidth = 5;
  rr(x, gl + 3, gt + 3, gr - gl - 6, gb - gt - 6, 7); x.stroke();
  x.restore();

  // river with graded sandy banks
  const ry = RIVER_Y;
  // dry -> wet sand gradient on both banks
  x.fillStyle = grad(x, 0, ry - RIVER_H / 2 - 10, 0, ry - RIVER_H / 2 - 2, [[0, '#ecdfae'], [1, '#c2ad76']]);
  x.fillRect(0, ry - RIVER_H / 2 - 9.5, AW, 7.5);
  x.fillStyle = grad(x, 0, ry + RIVER_H / 2 + 2, 0, ry + RIVER_H / 2 + 10, [[0, '#c2ad76'], [1, '#ecdfae']]);
  x.fillRect(0, ry + RIVER_H / 2 + 2, AW, 7.5);
  // pebbles scattered on the sand
  const prng2 = mulberry32(53);
  for (let i = 0; i < 30; i++) {
    const px = prng2() * AW;
    const py = prng2() < 0.5 ? ry - RIVER_H / 2 - 7.5 + prng2() * 5 : ry + RIVER_H / 2 + 3.5 + prng2() * 5;
    x.fillStyle = prng2() < 0.5 ? 'rgba(158, 138, 94, 0.55)' : 'rgba(244, 232, 196, 0.7)';
    ell(x, px, py, 1.1 + prng2() * 1.4, 0.9 + prng2() * 0.9); x.fill();
  }
  // water body: banded depth (bright far shallows -> deep channel -> lit near edge)
  x.fillStyle = PAL.riverDk;
  x.fillRect(0, ry - RIVER_H / 2 - 3, AW, RIVER_H + 6);
  x.fillStyle = grad(x, 0, ry - RIVER_H / 2, 0, ry + RIVER_H / 2, [
    [0, mix(PAL.river, '#8fd4f7', 0.35)],
    [0.34, PAL.river],
    [0.6, mix(PAL.river, '#1d5f9e', 0.42)],
    [1, mix(PAL.river, '#8fd4f7', 0.14)],
  ]);
  x.fillRect(0, ry - RIVER_H / 2, AW, RIVER_H);
  // caustic web: soft meandering light lines in the shallows
  x.strokeStyle = 'rgba(190, 236, 255, 0.16)'; x.lineWidth = 2.2;
  for (let i = 0; i < 4; i++) {
    const yy = ry - RIVER_H / 2 + 6 + i * (RIVER_H - 12) / 3 + (prng2() - 0.5) * 3;
    x.beginPath();
    x.moveTo(-4, yy);
    for (let xx = 0; xx <= AW + 8; xx += 24) {
      x.quadraticCurveTo(xx + 12, yy + ((Math.floor(xx / 24) + i) % 2 === 0 ? 2.8 : -2.8), xx + 24, yy);
    }
    x.stroke();
  }
  // scalloped lapping edges, tinted to the local water tone
  x.fillStyle = mix(PAL.river, '#8fd4f7', 0.3);
  for (let sx2 = 0; sx2 < AW + 16; sx2 += 16) {
    ell(x, sx2 + 8, ry - RIVER_H / 2 - 0.5, 8.8, 3.2); x.fill();
  }
  x.fillStyle = mix(PAL.river, '#8fd4f7', 0.1);
  for (let sx2 = 0; sx2 < AW + 16; sx2 += 16) {
    ell(x, sx2, ry + RIVER_H / 2 + 0.5, 8.8, 3); x.fill();
  }
  x.strokeStyle = PAL.out; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, ry - RIVER_H / 2 - 9); x.lineTo(AW, ry - RIVER_H / 2 - 9); x.stroke();
  x.beginPath(); x.moveTo(0, ry + RIVER_H / 2 + 9); x.lineTo(AW, ry + RIVER_H / 2 + 9); x.stroke();
  // foam tracing the far-bank scallops + bubble specks
  x.strokeStyle = 'rgba(255, 255, 255, 0.6)'; x.lineWidth = 1.8;
  for (let sx2 = 0; sx2 < AW + 16; sx2 += 16) {
    x.beginPath();
    x.ellipse(sx2 + 8, ry - RIVER_H / 2 + 0.4, 8, 2.8, 0, Math.PI * 1.06, Math.PI * 1.94);
    x.stroke();
  }
  x.strokeStyle = 'rgba(255, 255, 255, 0.3)'; x.lineWidth = 1.5;
  for (let sx2 = 0; sx2 < AW + 16; sx2 += 16) {
    x.beginPath();
    x.ellipse(sx2, ry + RIVER_H / 2 - 0.6, 7.6, 2.3, 0, Math.PI * 0.08, Math.PI * 0.92);
    x.stroke();
  }
  x.fillStyle = 'rgba(255, 255, 255, 0.5)';
  for (let i = 0; i < 26; i++) {
    const fx2 = prng2() * AW;
    const fy2 = prng2() < 0.6 ? ry - RIVER_H / 2 + 2.5 + prng2() * 3 : ry + RIVER_H / 2 - 3 - prng2() * 2;
    ell(x, fx2, fy2, 0.9 + prng2() * 0.9, 0.8 + prng2() * 0.7); x.fill();
  }

  // bridges: individual planks, grain, nails, beams, capped rails
  for (const bx of LANES) {
    const bw = BRIDGE_W + 10, bh = RIVER_H + 18;
    const brng = mulberry32(bx);
    // shadow cast on the water
    x.fillStyle = 'rgba(14, 46, 88, 0.38)';
    rr(x, bx - bw / 2 - 6, ry - RIVER_H / 2, bw + 12, RIVER_H, 6); x.fill();
    // deck base (lit center, shaded flanks)
    rr(x, bx - bw / 2, ry - bh / 2, bw, bh, 6);
    x.strokeStyle = PAL.out; x.lineWidth = 4; x.stroke();
    x.fillStyle = grad(x, bx - bw / 2, 0, bx + bw / 2, 0, [
      [0, shade(PAL.wood, -0.18)], [0.5, shade(PAL.wood, 0.06)], [1, shade(PAL.wood, -0.14)],
    ]);
    x.fill();
    // planks with tone variance, grain and end nails
    const rows = 5, ph = bh / rows;
    for (let j = 0; j < rows; j++) {
      const py0 = ry - bh / 2 + ph * j;
      x.fillStyle = rgba(shade(PAL.wood, (brng() - 0.5) * 0.22), 0.85);
      rr(x, bx - bw / 2 + 2, py0 + 1.2, bw - 4, ph - 2.4, 2.4); x.fill();
      x.strokeStyle = 'rgba(106, 66, 28, 0.5)'; x.lineWidth = 1;
      for (let g2 = 0; g2 < 2; g2++) {
        const gy = py0 + 3 + brng() * (ph - 6);
        x.beginPath();
        x.moveTo(bx - bw / 2 + 5, gy);
        x.quadraticCurveTo(bx, gy + (brng() - 0.5) * 2.6, bx + bw / 2 - 5, gy + (brng() - 0.5) * 1.8);
        x.stroke();
      }
      x.fillStyle = '#5b4630';
      ell(x, bx - bw / 2 + 5.5, py0 + ph / 2, 1.3, 1.3); x.fill();
      ell(x, bx + bw / 2 - 5.5, py0 + ph / 2, 1.3, 1.3); x.fill();
      x.fillStyle = 'rgba(255, 240, 210, 0.55)';
      ell(x, bx - bw / 2 + 5.1, py0 + ph / 2 - 0.4, 0.5, 0.5); x.fill();
      ell(x, bx + bw / 2 - 5.9, py0 + ph / 2 - 0.4, 0.5, 0.5); x.fill();
      if (j > 0) {
        x.strokeStyle = 'rgba(70, 44, 20, 0.55)'; x.lineWidth = 1.6;
        x.beginPath(); x.moveTo(bx - bw / 2 + 3, py0); x.lineTo(bx + bw / 2 - 3, py0); x.stroke();
      }
    }
    // cross beams anchoring the span on both banks
    for (const ey of [ry - bh / 2 - 1, ry + bh / 2 - 4.5]) {
      rr(x, bx - bw / 2 - 2, ey, bw + 4, 5.5, 2.6);
      x.strokeStyle = PAL.out; x.lineWidth = 3; x.stroke();
      x.fillStyle = grad(x, 0, ey, 0, ey + 5.5, [[0, shade(PAL.woodDk, 0.18)], [1, shade(PAL.woodDk, -0.14)]]);
      x.fill();
    }
    // side rails with lit tops and post caps
    for (const rx of [bx - bw / 2 - 3, bx + bw / 2 - 3]) {
      rr(x, rx, ry - bh / 2 - 2, 6, bh + 4, 3);
      x.strokeStyle = PAL.out; x.lineWidth = 2.6; x.stroke();
      x.fillStyle = grad(x, rx, 0, rx + 6, 0, [[0, shade(PAL.woodLt, 0.14)], [1, shade(PAL.woodLt, -0.24)]]);
      x.fill();
      for (const cy2 of [ry - bh / 2 - 3, ry + bh / 2 - 4]) {
        rr(x, rx - 1, cy2, 8, 6.5, 2.8);
        x.strokeStyle = PAL.out; x.lineWidth = 2.4; x.stroke();
        x.fillStyle = shade(PAL.woodLt, 0.05); x.fill();
        x.fillStyle = 'rgba(255, 240, 210, 0.4)';
        rr(x, rx + 0.3, cy2 + 1, 5.4, 1.7, 1); x.fill();
      }
    }
  }

  // worn dirt lanes from each bridge toward the tower rows
  for (const lx of LANES) {
    for (const [y0, y1] of [[150, RIVER_Y - RIVER_H / 2 - 8], [RIVER_Y + RIVER_H / 2 + 8, 376]]) {
      const lg = x.createLinearGradient(lx - 21, 0, lx + 21, 0);
      lg.addColorStop(0, 'rgba(205, 180, 116, 0)');
      lg.addColorStop(0.5, 'rgba(205, 180, 116, 0.55)');
      lg.addColorStop(1, 'rgba(205, 180, 116, 0)');
      x.fillStyle = lg;
      rr(x, lx - 21, y0, 42, y1 - y0, 14);
      x.fill();
      // continuous worn core: elongated overlapping smudges along the lane
      x.fillStyle = 'rgba(178, 152, 88, 0.3)';
      const prng = mulberry32(lx * 7 + y0);
      const n = Math.ceil((y1 - y0) / 11);
      for (let i = 0; i <= n; i++) {
        const py = y0 + 5 + (i / n) * (y1 - y0 - 10);
        const px = lx + (prng() * 10 - 5);
        ell(x, px, py, 8.5 + prng() * 4.5, 4.4 + prng() * 1.6);
        x.fill();
      }
    }
  }

  // sparse in-field micro detail: grass tufts + tiny flowers
  const drng = mulberry32(31);
  for (let i = 0; i < 26; i++) {
    const dx = FIELD_L + 14 + drng() * (FIELD_R - FIELD_L - 28);
    const dy = 44 + drng() * (AH - 74);
    // keep clear of river band, tower pads and lanes' centers
    if (Math.abs(dy - RIVER_Y) < 34) continue;
    if (Math.abs(dx - 180) < 46 && (dy < 118 || dy > 430)) continue;
    if ((Math.abs(dx - LANES[0]) < 40 || Math.abs(dx - LANES[1]) < 40) && (Math.abs(dy - 142) < 40 || Math.abs(dy - 384) < 40)) continue;
    if (drng() < 0.62) {
      // grass tuft: three blades
      x.strokeStyle = '#6cb844'; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(dx - 3, dy); x.quadraticCurveTo(dx - 4.5, dy - 4, dx - 5, dy - 6.5); x.stroke();
      x.beginPath(); x.moveTo(dx, dy); x.quadraticCurveTo(dx, dy - 5, dx - 0.5, dy - 8); x.stroke();
      x.beginPath(); x.moveTo(dx + 3, dy); x.quadraticCurveTo(dx + 4.5, dy - 4, dx + 5, dy - 6); x.stroke();
    } else {
      // tiny flower
      x.fillStyle = drng() < 0.5 ? '#ffe07a' : '#ffffff';
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ell(x, dx + Math.cos(a) * 2.6, dy + Math.sin(a) * 2.6, 1.7, 1.7); x.fill();
      }
      x.fillStyle = '#f5a13c';
      ell(x, dx, dy, 1.7, 1.7); x.fill();
    }
  }

  // deco: rocks, shrubs, fences on the outer band
  const rng = mulberry32(7);
  const deco = [
    ['rock', 10, 60], ['rock', 350, 90], ['shrub', 9, 150], ['shrub', 351, 200],
    ['rock', 8, 300], ['shrub', 352, 330], ['rock', 348, 430], ['shrub', 10, 470],
    ['rock', 11, 380], ['shrub', 349, 140],
  ];
  for (const [kind, dx, dy] of deco) {
    // contact shadow grounds the prop on the grass
    x.fillStyle = '#00000022';
    ell(x, dx + 1.5, dy + 5, 9.5, 3.2); x.fill();
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
  // fences top + bottom edges: rail plank connecting the posts
  for (const fy of [22, AH - 7]) {
    const rails = fy === 22 ? [[30, 118], [242, AW - 28]] : [[30, AW - 28]];
    for (const [rx0, rx1] of rails) {
      x.strokeStyle = PAL.out; x.lineWidth = 7;
      x.beginPath(); x.moveTo(rx0, fy - 2.5); x.lineTo(rx1, fy - 2.5); x.stroke();
      x.strokeStyle = PAL.wood; x.lineWidth = 3.6;
      x.beginPath(); x.moveTo(rx0, fy - 2.5); x.lineTo(rx1, fy - 2.5); x.stroke();
    }
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

  // ---- depth pass: 3/4 top-down feel ----
  // darker toward the far (top) end, lightest near the player
  const depth = x.createLinearGradient(0, 0, 0, AH);
  depth.addColorStop(0, 'rgba(18, 34, 62, 0.18)');
  depth.addColorStop(0.42, 'rgba(18, 34, 62, 0.05)');
  depth.addColorStop(0.62, 'rgba(255, 246, 214, 0.03)');
  depth.addColorStop(1, 'rgba(255, 246, 214, 0.1)');
  x.fillStyle = depth;
  x.fillRect(0, 0, AW, AH);
  // soft side vignette
  const vig = x.createRadialGradient(AW / 2, AH * 0.52, AW * 0.42, AW / 2, AH * 0.52, AW * 0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10, 18, 40, 0.16)');
  x.fillStyle = vig;
  x.fillRect(0, 0, AW, AH);
  return c;
}

function of2(x, fill, lw) {
  x.strokeStyle = edgeFor(fill); x.lineWidth = lw * 0.85; x.stroke();
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

    // ambient cloud shade drifting slowly across the field
    x.save();
    x.fillStyle = '#12333f';
    for (const [seed, spd, ry2, rx2, yy] of [[40, 5.5, 46, 88, 150], [230, 4, 40, 76, 372]]) {
      const cx2 = ((seed + tGlobal * spd) % (AW + 240)) - 120;
      x.globalAlpha = 0.07;
      ell(x, cx2, yy, rx2, ry2); x.fill();
      x.globalAlpha = 0.045;
      ell(x, cx2 + rx2 * 0.55, yy + 10, rx2 * 0.7, ry2 * 0.75); x.fill();
    }
    x.restore();

    // river shimmer: ripple arcs across the whole band + drifting glints
    x.save();
    x.strokeStyle = PAL.riverLt;
    x.lineWidth = 2.4;
    for (let i = 0; i < 13; i++) {
      const speed = 18 + (i % 3) * 8;
      const wx = ((i * 61 + tGlobal * speed) % (AW + 60)) - 30;
      const wy = RIVER_Y - 12 + ((i * 29) % 25);
      x.globalAlpha = 0.32 + ((i * 17) % 10) * 0.03;
      x.beginPath();
      x.moveTo(wx, wy);
      x.quadraticCurveTo(wx + 8, wy - 2.6, wx + 16, wy);
      x.stroke();
    }
    // sparkle glints pulsing as they drift
    x.fillStyle = '#eafcff';
    for (let i = 0; i < 6; i++) {
      const gx = ((i * 97 + tGlobal * 30) % (AW + 40)) - 20;
      const gy = RIVER_Y - 9 + ((i * 43) % 20);
      const tw = 0.5 + 0.5 * Math.sin(tGlobal * 5 + i * 2.3);
      x.globalAlpha = 0.55 * tw;
      ell(x, gx, gy, 1.7 + tw, 1.2 + tw * 0.6); x.fill();
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
    // overhead UI on top of all bodies so bars never get painted over
    const placedBars = [];
    for (const it of items) {
      if (it.kind === 'unit') this.drawUnitOverhead(x, it.u, placedBars);
      else this.drawTowerOverhead(x, it.tw, tGlobal);
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

    // final grade: one warm key from the upper-left, cool falloff lower-right,
    // laid over every sprite so the whole frame shares a single light
    const gradeW = x.createLinearGradient(0, 0, AW, AH);
    gradeW.addColorStop(0, 'rgba(255, 214, 140, 0.05)');
    gradeW.addColorStop(0.45, 'rgba(255, 214, 140, 0)');
    gradeW.addColorStop(0.75, 'rgba(30, 40, 90, 0)');
    gradeW.addColorStop(1, 'rgba(30, 40, 90, 0.07)');
    x.fillStyle = gradeW;
    x.fillRect(0, 0, AW, AH);

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
  }

  drawTowerOverhead(x, tw, t) {
    if (!tw.alive) return;
    const barW = tw.kind === 'king' ? 62 : 54;
    const by = tw.y - (tw.kind === 'king' ? 60 : 92);
    const T = TEAM[tw.side];
    if (tw.hp < tw.maxHp || tw.kind !== 'king') {
      // badge
      rr(x, tw.x - barW / 2 - 9, by - 8, 17, 17, 5); of(x, T.main, 3);
      outlineText(x, String(tw.level), tw.x - barW / 2 - 0.5, by + 0.5, 10.5, '#fff', 2.8);
      // bar
      rr(x, tw.x - barW / 2 + 9, by - 6, barW - 9, 13, 6); of(x, '#181228', 3);
      const k = clamp(tw.hp / tw.maxHp, 0, 1);
      if (k > 0) {
        rr(x, tw.x - barW / 2 + 10.6, by - 4.4, (barW - 12.2) * k, 9.8, 4.4);
        x.fillStyle = T.bar; x.fill();
        x.fillStyle = '#ffffff55';
        rr(x, tw.x - barW / 2 + 10.6, by - 4.4, (barW - 12.2) * k, 3.6, 2.4); x.fill();
      }
      outlineText(x, String(Math.max(0, Math.ceil(tw.hp))), tw.x + 4.5, by + 0.6, 11, '#fff', 3);
    }
    // sleeping indicator for king: stepped "Z z" floating clear of the keep
    if (tw.kind === 'king' && !tw.kingAwake) {
      const zt = (t % 2.2) / 2.2;
      const a = zt < 0.75 ? 1 : (1 - zt) / 0.25;
      x.globalAlpha = a;
      outlineText(x, 'Z', tw.x + 44 + zt * 6, tw.y - 56 - zt * 15, 16, '#ffffff', 3.6);
      x.globalAlpha = 0.85 * a;
      outlineText(x, 'z', tw.x + 56 + zt * 8, tw.y - 71 - zt * 18, 12, '#eef5ff', 3);
      x.globalAlpha = 1;
    }
  }

  drawUnitItem(x, u, b, t) {
    const T = TEAM[u.side];
    if (u.dead) {
      // brief corpse fade under the poof: squash to the ground while alpha-ing out
      const k = Math.min(1, u.deathT / 0.3);
      if (k >= 1) return;
      x.save();
      x.globalAlpha = 0.85 * (1 - k);
      x.translate(u.x, u.y);
      x.scale(1 + k * 0.2, Math.max(0.08, 1 - k * 0.85));
      x.translate(-u.x, -u.y);
      UNIT_DRAW[u.type](x, u.x, u.y, { face: u.face, walk: 0, s: unitScale(u), team: u.side });
      x.restore();
      return;
    }
    // deploy countdown: flattened progress ring on the ground around the feet
    if (u.deployT < u.deployDur) {
      const k = u.deployT / u.deployDur;
      x.fillStyle = '#00000026';
      ell(x, u.x, u.y + 2, u.radius + 4, (u.radius + 4) * 0.45); x.fill();
      const ghost = 0.45 + 0.2 * Math.sin(t * 10);
      x.globalAlpha = ghost;
      UNIT_DRAW[u.type](x, u.x, u.y, { face: u.face, walk: 0, s: unitScale(u), team: u.side });
      x.globalAlpha = 1;
      const rw = u.radius + 8;
      x.save();
      x.translate(u.x, u.y + 2);
      x.scale(1, 0.45);
      x.strokeStyle = '#181228aa'; x.lineWidth = 5;
      x.beginPath(); x.arc(0, 0, rw, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = T.bar; x.lineWidth = 3.2;
      x.beginPath(); x.arc(0, 0, rw, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); x.stroke();
      x.restore();
      return;
    }
    // shadow
    x.fillStyle = '#00000028';
    ell(x, u.x, u.y + 1.5, u.radius + 3, (u.radius + 3) * 0.42); x.fill();
    // squash & stretch + a forward lunge on melee swings
    let sy = 1, sx = 1, lgx = 0, lgy = 0;
    if (u.attackT >= 0) {
      const k = Math.sin(Math.min(1, u.attackT) * Math.PI);
      sy = 1 - k * 0.12; sx = 1 + k * 0.1;
      if (!u.projectile && u.target) {
        const dd = Math.hypot(u.target.x - u.x, u.target.y - u.y) || 1;
        lgx = ((u.target.x - u.x) / dd) * k * 5.5;
        lgy = ((u.target.y - u.y) / dd) * k * 4;
      }
    }
    x.save();
    x.translate(u.x + lgx, u.y + lgy);
    x.scale(sx, sy);
    x.translate(-u.x, -u.y);
    if (u.hitFlash > 0) x.filter = 'brightness(1.28)';
    UNIT_DRAW[u.type](x, u.x, u.y, {
      face: u.face, walk: u.walk, attack01: u.attackT >= 0 ? Math.min(1, u.attackT) : 0,
      s: unitScale(u), team: u.side,
    });
    x.restore();
  }

  drawUnitOverhead(x, u, placedBars = []) {
    if (u.dead || u.deployT < u.deployDur) return;
    if (u.hp >= u.maxHp) return; // bars appear only after first damage
    const T = TEAM[u.side];
    const bw = 24;
    let oy = u.y - unitH(u);
    // climb above any bar already drawn in this spot so clumps stay readable
    for (let tries = 0; tries < 3; tries++) {
      if (!placedBars.some((p) => Math.abs(p.x - u.x) < 28 && Math.abs(p.y - oy) < 10)) break;
      oy -= 10;
    }
    placedBars.push({ x: u.x, y: oy });
    rr(x, u.x - bw / 2 - 6.5, oy - 4.8, 10.5, 10.5, 3.2); of(x, T.main, 2.4);
    outlineText(x, String(u.level), u.x - bw / 2 - 1.3, oy + 0.4, 7.2, '#fff', 2.1);
    rr(x, u.x - bw / 2 + 4.5, oy - 3.3, bw - 4.5, 7.4, 3.3); of(x, '#181228', 2.3);
    const k = clamp(u.hp / u.maxHp, 0, 1);
    if (k > 0) {
      rr(x, u.x - bw / 2 + 5.6, oy - 2.2, (bw - 6.7) * k, 5.2, 2.4);
      x.fillStyle = T.bar; x.fill();
      x.fillStyle = '#ffffff66';
      rr(x, u.x - bw / 2 + 5.6, oy - 2.2, (bw - 6.7) * k, 2, 1.4); x.fill();
    }
  }

  drawProjectile(x, p, t) {
    if (p.kind === 'fireball') {
      x.fillStyle = '#00000020';
      ell(x, p.x, p.ty + 4, 12, 4.5); x.fill();
      const ang = Math.atan2(p.y - (p.py ?? p.y - 1), p.x - (p.px ?? p.x - 1));
      // additive heat bloom + ember ghosts trailing the ball
      x.save();
      x.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 3; i++) {
        const bx = p.x - Math.cos(ang) * i * 8, by = p.y - Math.sin(ang) * i * 8;
        const r2 = Math.max(2, 13 - i * 3.4);
        const tg = x.createRadialGradient(bx, by, 0.5, bx, by, r2);
        tg.addColorStop(0, `rgba(255, 176, 64, ${0.36 - i * 0.1})`);
        tg.addColorStop(1, 'rgba(255, 90, 20, 0)');
        x.fillStyle = tg;
        ell(x, bx, by, r2, r2); x.fill();
      }
      const gg = x.createRadialGradient(p.x, p.y, 1, p.x, p.y, 21);
      gg.addColorStop(0, 'rgba(255, 210, 120, 0.5)');
      gg.addColorStop(1, 'rgba(255, 120, 30, 0)');
      x.fillStyle = gg;
      ell(x, p.x, p.y, 21, 21); x.fill();
      x.restore();
      drawFireball(x, p.x, p.y, 9, t, ang + Math.PI);
      p.px = p.x; p.py = p.y;
      return;
    }
    if (p.kind === 'arrow') {
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.angle || 0);
      // motion streak fading behind the shaft
      const st = x.createLinearGradient(-26, 0, -5, 0);
      st.addColorStop(0, 'rgba(255, 255, 255, 0)');
      st.addColorStop(1, 'rgba(255, 255, 255, 0.45)');
      x.strokeStyle = st; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(-26, 0); x.lineTo(-5, 0); x.stroke();
      x.strokeStyle = PAL.out; x.lineWidth = 3.6;
      x.beginPath(); x.moveTo(-7, 0); x.lineTo(5, 0); x.stroke();
      x.strokeStyle = PAL.wood; x.lineWidth = 1.8;
      x.beginPath(); x.moveTo(-7, 0); x.lineTo(5, 0); x.stroke();
      x.fillStyle = '#e8e2d0';
      x.beginPath(); x.moveTo(5, -2.4); x.lineTo(9.5, 0); x.lineTo(5, 2.4); x.closePath(); x.fill();
      x.strokeStyle = PAL.out; x.lineWidth = 1.2; x.stroke();
      // steel glint on the head
      x.fillStyle = 'rgba(255, 255, 255, 0.8)';
      x.beginPath(); x.moveTo(5.8, -1.2); x.lineTo(8.4, 0); x.lineTo(5.8, 0); x.closePath(); x.fill();
      x.restore();
      return;
    }
    // magic bolt: additive core with ghost trail and sparkle cross
    const col = p.towerShot ? (p.side === 'enemy' ? '255, 138, 112' : '125, 176, 255') : '111, 220, 255';
    x.save();
    x.globalCompositeOperation = 'lighter';
    if (p.px !== undefined) {
      const dx = p.x - p.px, dy = p.y - p.py;
      for (let i = 1; i <= 3; i++) {
        const bx = p.x - dx * i * 1.7, by = p.y - dy * i * 1.7;
        const r2 = Math.max(1.6, 6.4 - i * 1.3);
        const tg = x.createRadialGradient(bx, by, 0.4, bx, by, r2);
        tg.addColorStop(0, `rgba(${col}, ${0.36 - i * 0.1})`);
        tg.addColorStop(1, `rgba(${col}, 0)`);
        x.fillStyle = tg;
        ell(x, bx, by, r2, r2); x.fill();
      }
    }
    const g = x.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, 11);
    g.addColorStop(0, 'rgba(234, 252, 255, 0.95)');
    g.addColorStop(0.4, `rgba(${col}, 0.8)`);
    g.addColorStop(1, `rgba(${col}, 0)`);
    x.fillStyle = g;
    ell(x, p.x, p.y, 11, 11); x.fill();
    x.restore();
    x.fillStyle = '#fff';
    ell(x, p.x, p.y, 2.8, 2.8); x.fill();
    x.strokeStyle = 'rgba(255, 255, 255, 0.85)'; x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(p.x - 5.2, p.y); x.lineTo(p.x + 5.2, p.y);
    x.moveTo(p.x, p.y - 5.2); x.lineTo(p.x, p.y + 5.2);
    x.stroke();
    p.px = p.x; p.py = p.y;
  }

  drawParticle(x, pt) {
    const k = pt.t / pt.life;
    if (pt.kind === 'flash') {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = 1 - k;
      const g = x.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.r * (0.5 + k));
      g.addColorStop(0, '#fff8e0');
      g.addColorStop(0.5, '#ffc93c');
      g.addColorStop(1, 'rgba(255,150,40,0)');
      x.fillStyle = g;
      ell(x, pt.x, pt.y, pt.r * (0.5 + k), pt.r * (0.5 + k)); x.fill();
      x.restore();
      return;
    }
    if (pt.kind === 'smoke') {
      const R = pt.r * (0.7 + k * 0.9);
      x.globalAlpha = (1 - k) * (pt.a0 || 0.75);
      if (pt.col2) {
        // lit core -> dark rim so plumes read as volume, not a flat mass
        const g = x.createRadialGradient(pt.x - R * 0.3, pt.y - R * 0.35, R * 0.12, pt.x, pt.y, R);
        g.addColorStop(0, pt.col2);
        g.addColorStop(1, pt.col);
        x.fillStyle = g;
      } else {
        x.fillStyle = pt.col;
      }
      ell(x, pt.x, pt.y, R, R); x.fill();
      x.globalAlpha = 1;
      return;
    }
    if (pt.kind === 'muzzle') {
      const col = pt.side === 'enemy' ? '#ff8a70' : '#8fd4ff';
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = (1 - k) * 0.95;
      const g = x.createRadialGradient(pt.x, pt.y, 0.5, pt.x, pt.y, pt.r * (0.7 + k));
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, col);
      g.addColorStop(1, col + '00');
      x.fillStyle = g;
      ell(x, pt.x, pt.y, pt.r * (0.7 + k), pt.r * (0.7 + k)); x.fill();
      // spark cross
      x.strokeStyle = '#ffffff';
      x.lineWidth = 1.6;
      const rr2 = pt.r * (0.9 + k * 0.5);
      x.beginPath();
      x.moveTo(pt.x - rr2, pt.y); x.lineTo(pt.x + rr2, pt.y);
      x.moveTo(pt.x, pt.y - rr2); x.lineTo(pt.x, pt.y + rr2);
      x.stroke();
      x.restore();
      return;
    }
    if (pt.kind === 'ring') {
      // ground shockwave: flattened expanding ring, additive
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = (1 - k) * 0.75;
      const R = pt.r * (0.18 + easeOutQuad(k) * 0.82);
      x.strokeStyle = '#ffe9b0';
      x.lineWidth = 3.4 * (1 - k) + 0.8;
      x.beginPath();
      x.ellipse(pt.x, pt.y, R, R * 0.42, 0, 0, Math.PI * 2);
      x.stroke();
      x.strokeStyle = 'rgba(255, 176, 80, 0.65)';
      x.lineWidth = 1.4;
      x.beginPath();
      x.ellipse(pt.x, pt.y, R * 1.12, R * 0.47, 0, 0, Math.PI * 2);
      x.stroke();
      x.restore();
      return;
    }
    if (pt.kind === 'scorch') {
      // brief dark burn decal that fades from the grass
      const a = k < 0.18 ? k / 0.18 : 1 - (k - 0.18) / 0.82;
      x.globalAlpha = Math.max(0, a) * 0.34;
      const g = x.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, pt.r);
      g.addColorStop(0, '#241c18');
      g.addColorStop(0.7, '#33291f');
      g.addColorStop(1, 'rgba(51, 41, 31, 0)');
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(pt.x, pt.y, pt.r, pt.r * 0.45, 0, 0, Math.PI * 2);
      x.fill();
      x.globalAlpha = 1;
      return;
    }
    if (pt.kind === 'ember') {
      // hot spark with a velocity streak, guttering from white to red
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = 1 - k * k;
      const col = k < 0.35 ? '#fff3c8' : k < 0.7 ? '#ffb148' : '#ff5c30';
      x.strokeStyle = col; x.lineWidth = pt.r * (1 - k * 0.5) * 1.6;
      x.beginPath();
      x.moveTo(pt.x - pt.vx * 0.03, pt.y - pt.vy * 0.03);
      x.lineTo(pt.x, pt.y);
      x.stroke();
      x.restore();
      return;
    }
    if (pt.kind === 'star') {
      x.save();
      x.globalAlpha = 1 - k;
      x.translate(pt.x, pt.y);
      x.rotate(pt.rot || 0);
      const r = pt.r * (0.6 + k * 0.9);
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rad = i % 2 === 0 ? r : r * 0.42;
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
      x.fillStyle = '#fff';
      x.fill();
      x.strokeStyle = '#ffd84e';
      x.lineWidth = 1.6;
      x.stroke();
      x.restore();
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
  return ({ knight: 1, ogre: 1, imp: 1.06, archer: 1, mage: 1 }[u.type] || 1) * 1.14;
}
function unitH(u) {
  return ({ knight: 46, ogre: 52, imp: 30, archer: 42, mage: 50 }[u.type] || 42) * 1.14;
}
