// Raycast interactions: hover highlight + prompt, and per-item actions. Items are
// { object, material, id, label, key, action?: async (api) => void }. The legacy Kestrel actions
// (sleep / eat / wash up) are kept as built-ins for items without an `action`.
import * as THREE from "three";

const REACH = 2.8;
const HIGHLIGHT = new THREE.Color("#4a9dff");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Interactions {
  constructor({ camera, interactables = [], lighting, space, player, hud, audio }) {
    this.camera = camera;
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
    this.enabled = true;
    this.setItems(interactables);
    this._onKey = (e) => {
      if (e.code === "KeyE" && !e.repeat) this.activate();
    };
    document.addEventListener("keydown", this._onKey);
  }

  /** Replace the active item list (called when the visible sector set changes). */
  setItems(items) {
    this.items = items;
    this.targets = [];
    for (const it of this.items) {
      it.object.traverse((o) => {
        if (o.isMesh) {
          o.userData.interactable = it;
          this.targets.push(o);
        }
      });
      if (it.baseEmissive === undefined) {
        it.baseEmissive = it.material && it.material.emissive ? it.material.emissive.clone() : new THREE.Color(0, 0, 0);
        it.baseEmissiveIntensity = it.material ? it.material.emissiveIntensity : 1;
      }
    }
    if (this.hovered && !this.items.includes(this.hovered)) this.setHovered(null);
  }

  update() {
    if (this.busy || !this.enabled) {
      this.setHovered(null);
      return;
    }
    if (!this.targets.length) {
      this.setHovered(null);
      return;
    }
    this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.ray.intersectObjects(this.targets, false);
    const hit = hits.length ? hits[0].object.userData.interactable : null;
    this.setHovered(hit);
    if (this.hovered && this.hovered.material && this.hovered.material.emissive) {
      const k = 0.1 + 0.05 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
      this.hovered.material.emissive.copy(HIGHLIGHT).multiplyScalar(k);
    }
  }

  setHovered(item) {
    if (item === this.hovered) return;
    if (this.hovered && this.hovered.material && this.hovered.material.emissive) {
      this.hovered.material.emissive.copy(this.hovered.baseEmissive);
      this.hovered.material.emissiveIntensity = this.hovered.baseEmissiveIntensity;
    }
    this.hovered = item;
    if (item) {
      if (item.material && item.material.emissive) {
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
    this.run(item);
    return true;
  }

  async run(item) {
    this.busy = true;
    this.player.frozen = true;
    this.setHovered(null);
    if (this.audio) this.audio.event("console_beep", item.object.getWorldPosition(new THREE.Vector3()));
    try {
      if (item.action) await item.action({ hud: this.hud, player: this.player, lighting: this.lighting, space: this.space, audio: this.audio, wait });
      else if (item.id === "bed") await this.sleep();
      else if (item.id === "galley") await this.eat();
      else if (item.id === "bathroom") await this.wash();
    } finally {
      this.player.frozen = false;
      this.busy = false;
    }
  }

  async sleep() {
    this.hud.setStatus("Lying down...");
    await this.hud.fadeIn(900);
    await this.hud.showFadeText("8 HOURS PASS", 2000);
    this.space.setTime(this.space.state.time + 240);
    if (this.lighting) this.lighting.setRest(1, true);
    await this.hud.fadeOut(1200);
    this.hud.setStatus("You slept 8 hours. Rest cycle lighting engaged.");
    if (this.restTimer) clearTimeout(this.restTimer);
    this.restTimer = setTimeout(() => {
      if (this.lighting) {
        this.lighting.state.speed = 0.22;
        this.lighting.setRest(0);
      }
      this.hud.setStatus("Day cycle resumed. Systems nominal. Cruising.");
    }, 9000);
  }

  async eat() {
    this.hud.setStatus("Dispensing ration...");
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
