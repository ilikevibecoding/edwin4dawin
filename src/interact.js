// Raycast interactions: hover highlight + prompt, and scripted actions. Items come from the RoomManager
// (rooms register { object, material, id, label, key, action }); built-in actions cover the crew basics.
import * as THREE from "three";

const REACH = 3.0;
const HIGHLIGHT = new THREE.Color("#4f9bff");

// slab ray/AABB test: entry distance or null
function rayBox(o, d, min, max) {
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const k of ["x", "y", "z"]) {
    const inv = 1 / d[k];
    let t1 = (min[k] - o[k]) * inv;
    let t2 = (max[k] - o[k]) * inv;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmax < tmin) return null;
  }
  return tmax < 0 ? null : Math.max(tmin, 0);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Interactions {
  constructor({ camera, rooms, lighting, space, player, hud, audio = null }) {
    this.camera = camera;
    this.rooms = rooms;
    this.lighting = lighting;
    this.space = space;
    this.player = player;
    this.hud = hud;
    this.audio = audio;
    this.ray = new THREE.Raycaster();
    this.ray.far = REACH;
    this.hovered = null;
    this.busy = false;
    this.restTimer = null;
    this.targets = [];
    this.version = -1;
    this._onKey = (e) => {
      if (e.code === "KeyE" && !e.repeat) this.activate();
    };
    document.addEventListener("keydown", this._onKey);
  }

  get items() {
    return this.rooms.interactables;
  }

  refreshTargets() {
    this.targets = [];
    for (const it of this.items) {
      if (it.baseEmissive === undefined) {
        it.baseEmissive = it.material.emissive ? it.material.emissive.clone() : new THREE.Color(0, 0, 0);
        it.baseEmissiveIntensity = it.material.emissiveIntensity;
      }
      it.object.traverse((o) => {
        if (o.isMesh) {
          o.userData.interactable = it;
          this.targets.push(o);
        }
      });
    }
    this.version = this.rooms.interactablesVersion;
  }

  update() {
    if (this.version !== this.rooms.interactablesVersion) this.refreshTargets();
    if (this.busy || !this.player.enabled) {
      this.setHovered(null);
      return;
    }
    this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);
    let hit = null;
    if (this.targets.length) {
      const hits = this.ray.intersectObjects(this.targets, false);
      for (const h of hits) {
        // only visible rooms' objects count
        let o = h.object;
        let vis = true;
        while (o) {
          if (!o.visible) {
            vis = false;
            break;
          }
          o = o.parent;
        }
        if (!vis) continue;
        // occlusion: a wall / partition collider between the eye and the target hides the prompt
        if (this.occluded(h.distance)) continue;
        hit = h.object.userData.interactable;
        break;
      }
    }
    this.setHovered(hit);
    if (this.hovered && this.hovered.material.emissive) {
      const k = 0.1 + 0.05 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
      this.hovered.material.emissive.copy(HIGHLIGHT).multiplyScalar(k);
    }
  }

  /** True when an active collider (excluding low furniture and floors) blocks the ray before `dist`. */
  occluded(dist) {
    const o = this.ray.ray.origin;
    const d = this.ray.ray.direction;
    for (const c of this.rooms.activeColliders) {
      if (c.enabled === false) continue;
      // ignore floors and anything a person can see over (tables, consoles, railings)
      if (c.max.y - c.min.y < 1.3 || c.max.y < o.y - 0.2) continue;
      const t = rayBox(o, d, c.min, c.max);
      if (t !== null && t > 0.05 && t < dist - 0.05) return true;
    }
    return false;
  }

  setHovered(item) {
    if (item === this.hovered) return;
    if (this.hovered && this.hovered.material.emissive) {
      this.hovered.material.emissive.copy(this.hovered.baseEmissive);
      this.hovered.material.emissiveIntensity = this.hovered.baseEmissiveIntensity;
    }
    this.hovered = item;
    if (item) {
      if (item.material.emissive) {
        item.material.emissive.copy(HIGHLIGHT).multiplyScalar(0.12);
        item.material.emissiveIntensity = 1;
      }
      this.hud.showPrompt(item.key || "E", item.label);
    } else {
      this.hud.hidePrompt();
    }
    this.hud.setCrosshair(!!item);
  }

  activate(id = null) {
    const item = id ? this.items.find((i) => i.id === id) : this.hovered;
    if (!item || this.busy) return false;
    if (!id && !this.player.locked) return false;
    if (this.hud.menuOpen && this.hud.menuOpen()) return false;
    this.run(item);
    return true;
  }

  async run(item) {
    if (item.action) {
      // custom actions manage their own busy state (menus, toggles)
      await item.action({ hud: this.hud, player: this.player, lighting: this.lighting, space: this.space, audio: this.audio, item });
      return;
    }
    this.busy = true;
    this.player.frozen = true;
    this.setHovered(null);
    try {
      const kind = item.kind || item.id;
      if (kind === "bunk" || kind === "bed") await this.sleep();
      else if (kind === "mess" || kind === "galley") await this.eat();
      else if (kind === "refresher" || kind === "bathroom") await this.wash();
    } finally {
      this.player.frozen = false;
      this.busy = false;
    }
  }

  async sleep() {
    this.hud.setStatus("Lying down…");
    await this.hud.fadeIn(900);
    await this.hud.showFadeText("8 HOURS PASS", 2000);
    this.space.setTime(this.space.state.time + 240);
    this.lighting.setRest(1, true);
    await this.hud.fadeOut(1200);
    this.hud.setStatus("You slept 8 hours. Rest-cycle lighting engaged.");
    if (this.restTimer) clearTimeout(this.restTimer);
    this.restTimer = setTimeout(() => {
      this.lighting.state.speed = 0.22;
      this.lighting.setRest(0);
      this.hud.setStatus("Duty cycle resumed. All stations nominal.");
    }, 9000);
  }

  async eat() {
    this.hud.setStatus("Dispensing ration…");
    await wait(700);
    this.hud.setStatus("You eat. Energy restored.");
    await wait(300);
  }

  async wash() {
    await this.hud.fadeIn(700);
    await this.hud.showFadeText("REFRESHED", 1300);
    await this.hud.fadeOut(900);
    this.hud.setStatus("Refreshed.");
  }
}
