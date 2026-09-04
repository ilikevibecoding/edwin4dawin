// Raycast interactions: hover highlight + prompt for whatever interactable is under the crosshair,
// and generic activation. Interactables are { object, material, id, label, key, onActivate(api) } —
// each with its own material instance so the highlight tint never leaks into merged geometry.
import * as THREE from "three";

const REACH = 3.2;
const HIGHLIGHT = new THREE.Color("#4d8dff");

export class Interactions {
  constructor({ camera, player, hud }) {
    this.camera = camera;
    this.player = player;
    this.hud = hud;
    this.ray = new THREE.Raycaster();
    this.ray.far = REACH;
    this.hovered = null;
    this.busy = false;
    this.items = [];
    this.targets = [];
    this.enabled = true;
    this._onKey = (e) => {
      if (e.code === "KeyE" && !e.repeat) this.activate();
    };
    document.addEventListener("keydown", this._onKey);
  }

  // Replace the active set (the zone manager hands over the visible rooms' interactables)
  setItems(items) {
    if (items.length === this.items.length && items.every((it, i) => it === this.items[i])) return;
    if (this.hovered && !items.includes(this.hovered)) this.setHovered(null);
    this.items = items;
    this.targets = [];
    for (const it of items) {
      if (!it.baseEmissive) {
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
  }

  update() {
    if (this.busy || !this.enabled) {
      this.setHovered(null);
      return;
    }
    this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hits = this.ray.intersectObjects(this.targets, false);
    const hit = hits.length ? hits[0].object.userData.interactable : null;
    this.setHovered(hit);
    if (this.hovered && this.hovered.material.emissive) {
      const k = 0.1 + 0.05 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004));
      this.hovered.material.emissive.copy(HIGHLIGHT).multiplyScalar(k);
    }
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
      this.hud.showPrompt(item.key || "E", typeof item.label === "function" ? item.label() : item.label);
    } else {
      this.hud.hidePrompt();
    }
    this.hud.setCrosshair(!!item);
  }

  activate(id = null) {
    const item = id ? this.items.find((i) => i.id === id) : this.hovered;
    if (!item || this.busy) return false;
    if (!id && !this.player.locked) return false;
    if (this.hud.menuVisible && this.hud.menuVisible() && !id) return false;
    const result = item.onActivate ? item.onActivate(this, item) : false;
    if (result && result.then) {
      this.busy = true;
      result.finally(() => (this.busy = false));
    }
    // a changed label (e.g. "Authorize" -> "Locked") should refresh immediately
    if (this.hovered === item) this.hud.showPrompt(item.key || "E", typeof item.label === "function" ? item.label() : item.label);
    return true;
  }
}
