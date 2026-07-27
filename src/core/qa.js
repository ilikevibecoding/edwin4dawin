// Development-only QA mode (enabled with ?qa=1). Exposes window.__qa. Not part of the player build
// surface: no intrusive debug UI unless invoked.
import * as THREE from 'three';
import { CHECKPOINTS } from '../map/layout.js';
import { listAssets } from './assets.js';
import { Enemy } from '../ai/enemy.js';
import { makeTextSprite } from '../map/builder.js';

export function installQa(game) {
  const m = () => game.mission;
  let collisionViz = null;
  let navViz = null;
  let assetLabels = null;
  let gallery = null;

  const qa = {
    // ---- flow ----
    quickStart(difficulty = 'operator', primary = null, seed = 1337) {
      game.testMode = true;
      game.chosen.difficulty = difficulty;
      if (primary) game.chosen.loadout.primary = primary;
      m().reset({ difficulty, loadout: { ...game.chosen.loadout }, seed });
      game.setState('playing');
      return 'playing';
    },
    resetMission() {
      m().reset({ difficulty: game.chosen.difficulty, loadout: { ...game.chosen.loadout }, seed: 1337 });
      if (game.state !== 'playing') game.setState('playing');
      return 'reset';
    },
    setState(s) { game.setState(s); return game.state; },

    // ---- player ----
    teleport(name, yawDeg = null) {
      const p = m().player;
      if (typeof name === 'string') {
        const cp = CHECKPOINTS[name];
        if (!cp) return 'unknown checkpoint: ' + name + ' (' + Object.keys(CHECKPOINTS).join(', ') + ')';
        // NS-10: snap to the nearest navmesh node so checkpoints always land on real floor,
        // never on furniture tops (which bake as tiny unreachable islands).
        const nav = m().nav;
        const idx = nav ? nav.nearestNode(cp[0], cp[1], cp[2], 2.5) : -1;
        const mainRegion = nav && nav.regionOf ? nav.regionOf[nav.nearestNode(26, 0, 42.5, 3)] : -1;
        if (idx >= 0 && (!nav.regionOf || nav.regionOf[idx] === mainRegion)) {
          p.pos.set(nav.nodes[idx].x, nav.nodes[idx].y + 0.05, nav.nodes[idx].z);
        } else if (idx >= 0) {
          // nearest node is an island (furniture top): search wider for a main-region node
          let best = -1, bestD = Infinity;
          for (let i = 0; i < nav.nodes.length; i++) {
            if (nav.regionOf[i] !== mainRegion) continue;
            const n = nav.nodes[i];
            const d = (n.x - cp[0]) ** 2 + (n.z - cp[2]) ** 2 + Math.abs(n.y - cp[1]) * 4;
            if (d < bestD) { bestD = d; best = i; }
          }
          if (best >= 0) p.pos.set(nav.nodes[best].x, nav.nodes[best].y + 0.05, nav.nodes[best].z);
          else p.pos.set(cp[0], cp[1] + 0.05, cp[2]);
        } else {
          p.pos.set(cp[0], cp[1] + 0.05, cp[2]);
        }
        p.yaw = THREE.MathUtils.degToRad(yawDeg != null ? yawDeg : cp[3]);
      } else if (Array.isArray(name)) {
        p.pos.set(name[0], name[1], name[2]);
        if (yawDeg != null) p.yaw = THREE.MathUtils.degToRad(yawDeg);
      }
      // avoid landing inside characters: nudge to a free ring spot
      const overlapping = () => {
        const hits = m().world.query(
          { x: p.pos.x - 0.35, y: p.pos.y + 0.1, z: p.pos.z - 0.35 },
          { x: p.pos.x + 0.35, y: p.pos.y + 1.7, z: p.pos.z + 0.35 }, []);
        return hits.some((c) => c.blockMove && c.tag === 'enemy');
      };
      if (overlapping()) {
        const x0 = p.pos.x, z0 = p.pos.z;
        outer: for (const r of [1.0, 1.6, 2.2]) {
          for (let a = 0; a < 8; a++) {
            p.pos.x = x0 + Math.cos((a / 8) * Math.PI * 2) * r;
            p.pos.z = z0 + Math.sin((a / 8) * Math.PI * 2) * r;
            if (!overlapping()) break outer;
          }
        }
      }
      p.vel.set(0, 0, 0);
      p.pitch = 0;
      return [p.pos.x, p.pos.y, p.pos.z];
    },
    checkpoints: () => Object.keys(CHECKPOINTS),
    pos() { const p = m().player.pos; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; },
    look(dx, dy) { game.input.vLook(dx, dy); },
    setYawPitch(yawDeg, pitchDeg = 0) {
      m().player.yaw = THREE.MathUtils.degToRad(yawDeg);
      m().player.pitch = THREE.MathUtils.degToRad(pitchDeg);
    },
    noclip(on = true) { m().player.noclip = on; return on; },
    god(on = true) { m().player.godMode = on; return on; },
    hurt(amount = 25) { m().player.damage(amount, null, 'debug'); },

    // ---- input injection ----
    press(code) { game.input.vPress(code); },
    release(code) { game.input.vRelease(code); },
    releaseAll() { game.input.vClearAll(); },
    mouse(button, down) { game.input.vMouse(button, down); },

    // ---- weapons ----
    giveWeapon(id) {
      return m().player.arsenal.giveWeapon(id);
    },
    selectPrimary(id) {
      game.chosen.loadout.primary = id;
      const a = m().player.arsenal;
      a.equipLoadout(game.chosen.loadout);
      return id;
    },
    selectSlot(n) { m().player.arsenal.trySwitch(n); return { requested: n, active: m().player.arsenal.active }; },
    refillAmmo() { for (const k of Object.keys(m().player.arsenal.slots)) m().player.arsenal.slots[k].refill(); },

    // ---- AI ----
    freezeAI(on = true) { m().aiFrozen = on; return on; },
    spawnEnemy(type = 'trooper', at = null, patrol = null) {
      const mm = m();
      let pos;
      if (typeof at === 'string' && CHECKPOINTS[at]) pos = [CHECKPOINTS[at][0], CHECKPOINTS[at][1], CHECKPOINTS[at][2]];
      else if (Array.isArray(at)) pos = at;
      else { const p = mm.player.pos; const f = mm.player.forwardVec(); pos = [p.x + f.x * 5, p.y, p.z + f.z * 5]; }
      const spec = { id: 'qa-' + type + '-' + Math.floor(Math.random() * 1e5), type, pos, patrol: patrol || [pos] };
      const e = new Enemy(mm, spec, mm.difficulty);
      mm.enemies.push(e);
      return e.id;
    },
    killEnemies() {
      let n = 0;
      for (const e of m().enemies) if (e.alive) { e.damage(9999, null, 'debug'); n++; }
      return n;
    },
    listEnemies() { return m().enemies.map((e) => e.textState(m().player.pos)); },

    // ---- objectives ----
    setObjective(stage) {
      const mm = m();
      const p = mm.player;
      const secureAll = () => {
        for (const h of mm.hostages) {
          h.discovered = true;
          if (h.state === 'captive') { h.state = 'following'; h.rig.setPose('stand'); }
        }
      };
      switch (stage) {
        case 'infiltrated': qa.teleport('lobby'); break;
        case 'located': for (const h of mm.hostages) h.discovered = true; break;
        case 'secured': secureAll(); break;
        case 'escorted': {
          secureAll();
          qa.teleport('garage');
          let i = 0;
          for (const h of mm.hostages) {
            h.pos.set(5.2 + (i === 0 ? -0.9 : 0.9), 0, 7.8);
            i++;
          }
          break;
        }
        case 'victory': mm._endMission('victory', 'QA: forced victory.'); break;
        case 'defeat': mm._endMission('defeat', 'QA: forced defeat.'); break;
        default: return 'stages: infiltrated|located|secured|escorted|victory|defeat';
      }
      return stage;
    },

    // ---- lighting / visualization ----
    setLighting(scenario) { m().map.lights.setScenario(scenario); return scenario; },
    showAssetIds(on = true) {
      m().map.labels.visible = on;
      if (on && !assetLabels) {
        assetLabels = new THREE.Group();
        m().scene.add(assetLabels);
      }
      if (assetLabels) assetLabels.visible = on;
      return on;
    },
    showCollision(on = true) {
      const mm = m();
      if (on && !collisionViz) {
        const boxes = [];
        for (const c of mm.world.colliders) {
          if (c.tag === 'ground') continue;
          boxes.push(new THREE.Box3(
            new THREE.Vector3(c.min.x, c.min.y, c.min.z),
            new THREE.Vector3(c.max.x, c.max.y, c.max.z)));
        }
        const geo = new THREE.BufferGeometry();
        const positions = [];
        for (const b of boxes) {
          const pts = boxEdges(b);
          for (const p of pts) positions.push(p.x, p.y, p.z);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        collisionViz = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x27e08a, transparent: true, opacity: 0.35 }));
        mm.scene.add(collisionViz);
      }
      if (collisionViz) collisionViz.visible = on;
      return on;
    },
    showNav(on = true) {
      const mm = m();
      if (on && !navViz) {
        const positions = [];
        for (const n of mm.nav.nodes) positions.push(n.x, n.y + 0.06, n.z);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        navViz = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x39b3ff, size: 0.09 }));
        mm.scene.add(navViz);
      }
      if (navViz) navViz.visible = on;
      return on ? m().nav.nodes.length : false;
    },

    // ---- repeatable cameras ----
    camera(nameOrPos, yawDeg = 0, pitchDeg = -8, fov = 68) {
      let pos;
      if (typeof nameOrPos === 'string') {
        const cp = CHECKPOINTS[nameOrPos];
        if (!cp) return 'unknown checkpoint';
        pos = [cp[0], cp[1] + 1.66, cp[2]];
        yawDeg = arguments.length > 1 ? yawDeg : cp[3];
      } else pos = nameOrPos;
      const yaw = THREE.MathUtils.degToRad(yawDeg);
      const pitch = THREE.MathUtils.degToRad(pitchDeg);
      game.cameraOverride = (cam) => {
        cam.position.set(pos[0], pos[1], pos[2]);
        cam.rotation.set(pitch, yaw, 0, 'YXZ');
        if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      };
      return pos;
    },
    cameraOrbit(cx, cy, cz, radius = 8, height = 3, angleDeg = 0, fov = 60) {
      const a = THREE.MathUtils.degToRad(angleDeg);
      game.cameraOverride = (cam) => {
        cam.position.set(cx + Math.cos(a) * radius, cy + height, cz + Math.sin(a) * radius);
        cam.lookAt(cx, cy, cz);
        if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
      };
    },
    cameraOff() { game.cameraOverride = null; },

    // ---- asset gallery ----
    gallery(idOrCmd = 'list') {
      const assets = listAssets();
      if (idOrCmd === 'list') return assets.map((a) => a.id);
      if (idOrCmd === 'off') {
        if (gallery) { gallery.visible = false; }
        qa.cameraOff();
        return 'off';
      }
      const asset = assets.find((a) => a.id === idOrCmd);
      if (!asset) return 'unknown asset id';
      if (!gallery) {
        gallery = new THREE.Group();
        gallery.position.set(24, 40, 18); // isolated high above the map
        const floor = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.1, 40), new THREE.MeshStandardMaterial({ color: 0x5a6570, roughness: 0.9 }));
        gallery.add(floor);
        const key = new THREE.DirectionalLight(0xffffff, 2.6);
        key.position.set(3, 5, 2);
        const fill = new THREE.HemisphereLight(0xdfe9f2, 0x445055, 1.4);
        gallery.add(key, fill);
        m().scene.add(gallery);
        gallery.userData.slot = new THREE.Group();
        gallery.userData.slot.position.y = 0.1;
        gallery.add(gallery.userData.slot);
        const label = makeTextSprite('ASSET', '');
        label.position.set(0, 2.6, 0);
        gallery.add(label);
        gallery.userData.label = label;
      }
      gallery.visible = true;
      const slot = gallery.userData.slot;
      slot.clear();
      if (asset.build) {
        const built = asset.build();
        slot.add(built.group || built);
      }
      qa.cameraOrbit(24, 40.6, 18, 2.6, 1.1, 30);
      return asset.id + (asset.build ? '' : ' (no builder registered; inspect in place)');
    },
    listAssets: () => listAssets().map((a) => ({ id: a.id, name: a.name, category: a.category, status: a.status || 'in-progress' })),

    // ---- nav diagnostics ----
    navPath(fromCp, toCp) {
      const a = typeof fromCp === 'string' ? CHECKPOINTS[fromCp] : fromCp;
      const b = typeof toCp === 'string' ? CHECKPOINTS[toCp] : toCp;
      if (!a || !b) return 'bad checkpoint';
      const path = m().nav.pathBetween({ x: a[0], y: a[1], z: a[2] }, { x: b[0], y: b[1], z: b[2] });
      return path ? { waypoints: path.length, path: path.map((p) => [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]) } : null;
    },
    navStats() { return { nodes: m().nav.nodes.length, bakeMs: +m().nav.bakeMs.toFixed(0) }; },
    navConnected(a, b) {
      const nav = m().nav;
      const ai = nav.nearestNode(a[0], a[1], a[2]);
      const bi = nav.nearestNode(b[0], b[1], b[2]);
      if (ai < 0 || bi < 0) return { aNode: ai, bNode: bi, connected: false, reason: 'no node' };
      const seen = new Set([ai]);
      const stack = [ai];
      let found = false;
      while (stack.length && seen.size < 60000) {
        const cur = stack.pop();
        if (cur === bi) { found = true; break; }
        for (const nb of nav.nodes[cur].edges) {
          if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
        }
      }
      return {
        aNode: [nav.nodes[ai].x, +nav.nodes[ai].y.toFixed(2), nav.nodes[ai].z],
        bNode: [nav.nodes[bi].x, +nav.nodes[bi].y.toFixed(2), nav.nodes[bi].z],
        connected: found, regionSize: seen.size,
      };
    },
    navNodesNear(x, y, z, r = 1.5) {
      const nav = m().nav;
      const out = [];
      for (const n of nav.nodes) {
        const d = Math.hypot(n.x - x, n.z - z);
        if (d < r && Math.abs(n.y - y) < 2.2) out.push({ p: [+n.x.toFixed(2), +n.y.toFixed(2), +n.z.toFixed(2)], edges: n.edges.length });
      }
      return out.slice(0, 24);
    },

    // ---- info ----
    state() { return JSON.parse(window.render_game_to_text()); },
    perf() { return { ...game.engine.perf, drawCalls: game.renderer.renderer.info.render.calls, triangles: game.renderer.renderer.info.render.triangles }; },
    errors() { return window.__consoleErrors; },
  };

  window.__qa = qa;
  return qa;
}

function boxEdges(b) {
  const { min, max } = b;
  const c = [
    [min.x, min.y, min.z], [max.x, min.y, min.z], [max.x, min.y, max.z], [min.x, min.y, max.z],
    [min.x, max.y, min.z], [max.x, max.y, min.z], [max.x, max.y, max.z], [min.x, max.y, max.z],
  ].map((a) => new THREE.Vector3(...a));
  const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const pts = [];
  for (const [i, j] of E) pts.push(c[i], c[j]);
  return pts;
}
