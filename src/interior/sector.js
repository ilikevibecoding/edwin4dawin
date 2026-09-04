// A Sector is one room / corridor / lobby / lift cab of the interior: it owns a merged-geometry group,
// its colliders (world space), its lights, animations and interactables, and can be shown / hidden
// by the visibility graph. Geometry is built lazily (deck streaming) in deck-local coordinates.
import * as THREE from "three";
import { Kit } from "../kit.js";

export class Sector {
  constructor(def, deck, interior) {
    this.def = def;
    this.id = def.id;
    this.deck = deck;
    this.interior = interior;
    this.built = false;
    this.visible = false;
    this.group = new THREE.Group();
    this.group.name = "sector_" + def.id;
    this.group.position.set(...deck.origin);
    this.group.visible = false;
    this.colliders = [];
    this.lights = [];
    this.anims = [];
    this.interactables = [];
    this.markers = []; // NPC / gameplay anchors: { id, kind, pos: [x,y,z] (deck-local), yaw }
    this.audioZones = [];
    this.neighbors = new Set(); // sector ids reachable through a door
    this.links = new Set(); // sector ids reachable through an open portal (co-visible)
    this.doors = []; // Door objects touching this sector
    const [min, max] = def.bounds;
    const o = deck.origin;
    this.worldMin = new THREE.Vector3(min[0] + o[0], min[1] + o[1], min[2] + o[2]);
    this.worldMax = new THREE.Vector3(max[0] + o[0], max[1] + o[1], max[2] + o[2]);
    this.worldCenter = this.worldMin.clone().add(this.worldMax).multiplyScalar(0.5);
    this.floorY = o[1] + (def.floor ?? 0);
  }

  containsWorld(p, margin = 0.05) {
    return p.x >= this.worldMin.x - margin && p.x <= this.worldMax.x + margin && p.z >= this.worldMin.z - margin && p.z <= this.worldMax.z + margin && p.y >= this.worldMin.y - 3 && p.y <= this.worldMax.y + 1;
  }

  /** Default standing position (world) + yaw (deg). */
  spawn() {
    const o = this.deck.origin;
    const s = this.def.spawn;
    if (s) return { x: s[0] + o[0], y: this.floorY, z: s[1] + o[2], yaw: s[2] || 0 };
    return { x: this.worldCenter.x, y: this.floorY, z: this.worldCenter.z, yaw: 0 };
  }

  ensureBuilt() {
    if (this.built) return this;
    this.built = true;
    const interior = this.interior;
    const materials = interior.materials;
    const kit = new Kit(materials);
    const sector = this;
    const ctx = {
      kit,
      materials,
      sector: this.def,
      deck: this.deck,
      bounds: this.def.bounds,
      doors: interior.doorDefsFor(this.id),
      traffic: interior.traffic,
      audio: interior.audio,
      floorY: this.def.floor ?? 0,
      seed: 7 + this.def.id.length * 13 + this.deck.index * 101,
      // Lights are virtual: they are not added to the scene. The interior copies the nearest ones
      // into a fixed pool of real lights every frame, so the shader light count (and therefore the
      // compiled program set) never changes when moving between rooms. Animating `l.intensity` /
      // `l.color` / `l.position` on the returned object still works.
      light(l) {
        sector.lights.push(l);
        l.userData.baseIntensity = l.intensity;
        l.userData.baseColor = l.color.clone();
        l.userData.sector = sector;
        return l;
      },
      mesh(obj) {
        sector.group.add(obj);
        return obj;
      },
      anim(fn) {
        sector.anims.push(fn);
      },
      interactable(item) {
        sector.interactables.push(item);
        if (item.object && !item.object.parent) sector.group.add(item.object);
      },
      audioZone(spec) {
        sector.audioZones.push(spec);
      },
      /** Register an NPC / gameplay anchor in deck-local coordinates: { id?, kind, pos:[x,y,z], yaw? }. */
      marker(m) {
        const id = m.id || `${sector.id}_${m.kind || "stand"}_${sector.markers.length}`;
        sector.markers.push({ id, kind: m.kind || "stand", pos: [...m.pos], yaw: m.yaw || 0, data: m.data || null });
        return id;
      },
      // convenience: register an extra collider in deck-local coordinates
      collider(min, max, tag) {
        kit.collider(min, max, tag);
      },
    };
    const t0 = performance.now();
    try {
      interior.runBuilder(this, ctx);
    } catch (e) {
      console.error(`sector ${this.id} build failed`, e);
    }
    kit.build(this.group, { castShadow: true, receiveShadow: true });
    // colliders to world space
    const o = this.deck.origin;
    for (const c of kit.colliders) {
      const cc = { ...c, min: c.min.clone(), max: c.max.clone() };
      cc.min.x += o[0];
      cc.min.y += o[1];
      cc.min.z += o[2];
      cc.max.x += o[0];
      cc.max.y += o[1];
      cc.max.z += o[2];
      if (cc.type === "region") cc.floor += o[1];
      if (cc.type === "ramp") {
        cc.y0 += o[1];
        cc.y1 += o[1];
      }
      this.colliders.push(cc);
    }
    this.buildMs = performance.now() - t0;
    interior.group.add(this.group);
    return this;
  }

  /** World position of a marker (or null). */
  markerWorld(id) {
    const m = this.markers.find((x) => x.id === id);
    if (!m) return null;
    const o = this.deck.origin;
    return new THREE.Vector3(m.pos[0] + o[0], m.pos[1] + o[1], m.pos[2] + o[2]);
  }

  setVisible(v) {
    if (v && !this.built) this.ensureBuilt();
    if (this.visible === v) return;
    this.visible = v;
    this.group.visible = v;
  }

  runAnims(dt, t) {
    for (const fn of this.anims) fn(dt, t);
  }
}
