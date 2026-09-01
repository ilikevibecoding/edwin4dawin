// Raycast interactions: hover highlight + prompt, and the three scripted actions
// (sleep / eat / wash up) with fades, status text and the rest-cycle lighting shift.
import * as THREE from "three";

const REACH = 2.6;
const HIGHLIGHT = new THREE.Color("#4fd8cc");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export class Interactions {
  constructor({ camera, interactables, lighting, space, player, hud }) {
    this.camera = camera;
    this.items = interactables;
    this.lighting = lighting;
    this.space = space;
    this.player = player;
    this.hud = hud;
    this.ray = new THREE.Raycaster();
    this.ray.far = REACH;
    this.hovered = null;
    this.busy = false;
    this.restTimer = null;
    this.targets = [];
    for (const it of this.items) {
      it.object.traverse((o) => {
        if (o.isMesh) {
          o.userData.interactable = it;
          this.targets.push(o);
        }
      });
      it.baseEmissive = it.material.emissive ? it.material.emissive.clone() : new THREE.Color(0, 0, 0);
      it.baseEmissiveIntensity = it.material.emissiveIntensity;
    }
    this._onKey = (e) => {
      if (e.code === "KeyE" && !e.repeat) this.activate();
    };
    document.addEventListener("keydown", this._onKey);
  }

  update() {
    if (this.busy) {
      this.setHovered(null);
      return;
    }
    this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.ray.intersectObjects(this.targets, false);
    const hit = hits.length ? hits[0].object.userData.interactable : null;
    this.setHovered(hit);
  }

  setHovered(item) {
    if (item === this.hovered) return;
    if (this.hovered) {
      this.hovered.material.emissive.copy(this.hovered.baseEmissive);
      this.hovered.material.emissiveIntensity = this.hovered.baseEmissiveIntensity;
    }
    this.hovered = item;
    if (item) {
      item.material.emissive.copy(HIGHLIGHT).multiplyScalar(0.28);
      item.material.emissiveIntensity = 1;
      this.hud.showPrompt(item.key, item.label);
    } else {
      this.hud.hidePrompt();
    }
    this.hud.setCrosshair(!!item);
  }

  activate(id = null) {
    const item = id ? this.items.find((i) => i.id === id) : this.hovered;
    if (!item || this.busy) return false;
    if (!id && !this.player.locked) return false;
    this.run(item.id);
    return true;
  }

  async run(id) {
    this.busy = true;
    this.player.frozen = true;
    this.setHovered(null);
    try {
      if (id === "bed") await this.sleep();
      else if (id === "galley") await this.eat();
      else if (id === "bathroom") await this.wash();
    } finally {
      this.player.frozen = false;
      this.busy = false;
    }
  }

  async sleep() {
    this.hud.setStatus("Lying down...");
    await this.hud.fadeIn(900);
    await this.hud.showFadeText("8 HOURS PASS", 2000);
    // the ship kept flying: jump the far field ahead and switch to the night watch lighting
    this.space.setTime(this.space.state.time + 240);
    this.lighting.setRest(1, true);
    await this.hud.fadeOut(1200);
    this.hud.setStatus("You slept 8 hours. Rest cycle lighting engaged.");
    if (this.restTimer) clearTimeout(this.restTimer);
    this.restTimer = setTimeout(() => {
      this.lighting.state.speed = 0.22;
      this.lighting.setRest(0);
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
