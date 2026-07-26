// Asset gallery (dev/QA only) — owner: Opus 4.
// Contract: openGallery()/closeGallery() switch to MODES.GALLERY and render
// registered assets on a turntable with id/name labels + paging.
//
// The gallery renders into the live Engine.scene but isolates itself: every
// existing scene child is hidden on open and restored on close, so a mission in
// progress survives a visit. Nothing here touches the DOM outside
// #gallery-overlay, and that node only exists while the gallery is open.

import * as THREE from 'three';
import { Engine } from './engine.js';
import { MODES, setMode, currentMode } from './state.js';
import { propIds, createProp } from '../world/props/index.js';
import { createEnemyBody, createHostageBody } from '../characters/bodies.js';
import { buildWeaponModel } from '../characters/weaponMeshes.js';
import { buildPickupModel } from '../characters/pickupModels.js';
import { MANIFEST, manifestById } from '../../assets/manifest/index.js';

const ENEMY_ASSET = { scout: 'CHR-002', trooper: 'CHR-003', heavy: 'CHR-004', marksman: 'CHR-005' };
const HOSTAGE_ASSET = ['CHR-007', 'CHR-008'];
const WEAPON_ASSET = {
  vireo: 'WPN-001', kestrel: 'WPN-002', ridgeline: 'WPN-003', boreas: 'WPN-004',
  longwatch: 'WPN-005', talon: 'WPN-006', flash: 'WPN-007', smoke: 'WPN-008',
};
const WEAPON_IDS = Object.keys(WEAPON_ASSET);
const PICKUP_TYPES = ['medkit', 'ammo', 'armor', 'keycard'];

let catalog = null;
let index = 0;
let open = false;
let stage = null;        // { group, turntable, pedestal, backdrop, floor, lights }
let current = null;      // { entry, object, box }
let overlay = null;
let hidden = [];         // scene children hidden while the gallery is up
let savedCamera = null;
let removeUpdater = null;
let keyHandler = null;
let spin = 0;

// Where the camera sits relative to the subject (a 3/4 view from above-right).
const CAMERA_DIR = new THREE.Vector3(0.62, 0.34, 1).normalize();
// Yaw that turns the camera's bearing into the object's own frame. Game models
// look down -Z, so this is what makes "face the camera" mean what it says.
const TOWARD_CAMERA = Math.atan2(CAMERA_DIR.x, CAMERA_DIR.z) + Math.PI;

// Opening pose per category, so the still frame a test captures at spin 0 is the
// readable one rather than whichever side the model happens to author forward.
function presentYaw(category) {
  if (category === 'character') return TOWARD_CAMERA;                  // front 3/4
  if (category === 'weapon' || category === 'weapon-fp') return TOWARD_CAMERA + Math.PI / 2; // profile
  return 0;
}

export function galleryAvailable() { return true; }

// ---------------------------------------------------------------- catalog
function buildCatalog() {
  const list = [];
  for (const type of Object.keys(ENEMY_ASSET)) {
    list.push({
      id: `enemy_${type}`, category: 'character', assetId: ENEMY_ASSET[type],
      make: () => posedBody(createEnemyBody(type)),
    });
  }
  HOSTAGE_ASSET.forEach((assetId, i) => {
    list.push({
      id: `hostage_${i}`, category: 'character', assetId,
      make: () => posedBody(createHostageBody(i)),
    });
  });
  for (const id of WEAPON_IDS) {
    list.push({ id: `weapon_${id}`, category: 'weapon', assetId: WEAPON_ASSET[id], make: () => buildWeaponModel(id, { firstPerson: false }) });
  }
  for (const id of WEAPON_IDS) {
    list.push({ id: `weapon_${id}_fp`, category: 'weapon-fp', assetId: WEAPON_ASSET[id], make: () => buildWeaponModel(id, { firstPerson: true }) });
  }
  for (const type of PICKUP_TYPES) {
    list.push({ id: `pickup_${type}`, category: 'pickup', assetId: 'PROP-000', make: () => buildPickupModel(type) });
  }
  for (const id of propIds()) {
    list.push({ id: `prop_${id}`, category: 'prop', propId: id, make: () => createProp(id) });
  }
  return list;
}

function posedBody(body) {
  body.setCrouch(0);
  body.setAimPitch(0);
  body.update(0.05);
  return body.group;
}

export function galleryCatalog() {
  if (!catalog) catalog = buildCatalog();
  return catalog.map((e, i) => ({ index: i, id: e.id, category: e.category }));
}

// ------------------------------------------------------------------ stage
function buildStage() {
  const group = new THREE.Group();
  group.name = 'gallery_stage';

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x11181f, roughness: 0.92, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x1b2530, roughness: 1, metalness: 0 }),
  );
  group.add(backdrop);

  const pedestal = new THREE.Group();
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.06, 1, 40),
    new THREE.MeshStandardMaterial({ color: 0x2b3540, roughness: 0.55, metalness: 0.25 }),
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.012, 6, 56),
    new THREE.MeshStandardMaterial({ color: 0x7fd2ff, roughness: 0.45, metalness: 0.2, emissive: 0x1d4a63, emissiveIntensity: 0.8 }),
  );
  rim.rotation.x = -Math.PI / 2;
  // Painted contact shadow rather than a real one: it reads the same at every
  // quality preset (the low preset has shadow maps off) and costs one quad.
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: contactTexture(), transparent: true, opacity: 0.55, depthWrite: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.renderOrder = 1;
  pedestal.add(drum, rim, contact);
  group.add(pedestal);

  // neutral three-point set: warm key, cool fill, cold rim, soft sky bounce
  const key = new THREE.DirectionalLight(0xfff1dd, 3.4);
  const fill = new THREE.DirectionalLight(0xa9c9e4, 1.4);
  const rimLight = new THREE.DirectionalLight(0xd4ebff, 2.1);
  const sky = new THREE.HemisphereLight(0x9fc2dc, 0x1b2229, 1.1);
  for (const l of [key, fill, rimLight]) l.castShadow = false;
  group.add(key, fill, rimLight, sky);

  const turntable = new THREE.Group();
  group.add(turntable);

  return { group, turntable, pedestal, drum, rim, contact, floor, backdrop, lights: { key, fill, rimLight } };
}

// Soft round gradient, generated once, used as the painted contact shadow.
let contactTex = null;
function contactTexture() {
  if (contactTex) return contactTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // Broad core: most of the disc sits under the asset, so the part that has to
  // read is the ring peeking out past the silhouette.
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.8, 'rgba(0,0,0,0.2)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  contactTex = new THREE.CanvasTexture(c);
  contactTex.colorSpace = THREE.SRGBColorSpace;
  return contactTex;
}

// Frame the asset: sit it on the pedestal, centre it, then pull the camera back
// far enough that its bounding sphere fits the current vertical fov.
function frame(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(box.min.x) || box.isEmpty()) box.set(new THREE.Vector3(-0.2, 0, -0.2), new THREE.Vector3(0.2, 0.4, 0.2));
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  object.position.set(-centre.x, -box.min.y, -centre.z);

  const height = Math.max(0.12, size.y);
  const footprint = Math.max(0.3, size.x, size.z);
  const target = new THREE.Vector3(0, height * 0.52, 0);
  // Fit the asset *and* its pedestal: a hand-sized prop on a 0.85 m turntable is
  // framed by the turntable, not by the prop.
  const pr = Math.max(0.42, footprint * 0.62);
  const radius = 0.5 * Math.hypot(
    Math.max(size.x, pr * 2.1), Math.max(size.y, 0.3) + 0.16, Math.max(size.z, pr * 2.1),
  );
  const fov = THREE.MathUtils.degToRad(Engine.camera.fov);
  const dist = Math.max(0.5, (radius / Math.sin(Math.min(1.2, fov / 2))) * 1.06);

  const dir = CAMERA_DIR.clone();
  Engine.camera.position.copy(target).addScaledVector(dir, dist);
  Engine.camera.lookAt(target);
  Engine.camera.near = Math.max(0.02, dist * 0.02);
  Engine.camera.far = Math.max(60, dist * 12);
  Engine.camera.updateProjectionMatrix();

  const { pedestal, drum, rim, contact, floor, backdrop, lights } = stage;
  drum.scale.set(pr, 0.16, pr);
  drum.position.y = -0.08;
  // edge ring sits just above the drum face (never coplanar: no z-fighting)
  rim.scale.set(pr, pr, 1);
  rim.position.y = 0.004;
  // Wider than the silhouette (otherwise the asset hides its own shadow) but
  // inside the drum, so it reads as contact rather than as a stain on the floor.
  const cr = Math.min(pr * 1.95, Math.max(0.3, footprint * 1.45));
  contact.scale.set(cr, cr, 1);
  contact.position.y = 0.002;
  contact.material.opacity = 0.85;
  pedestal.position.set(0, 0, 0);

  floor.scale.set(dist * 24, dist * 24, 1);
  floor.position.y = -0.162;
  // upright studio wall behind the subject, turned to face the camera in plan
  backdrop.scale.set(dist * 14, dist * 9, 1);
  backdrop.position.copy(target).addScaledVector(dir, -dist * 2.6);
  backdrop.position.y = dist * 1.6;
  backdrop.rotation.set(0, Math.atan2(dir.x, dir.z), 0);

  lights.key.position.set(dist * 1.1, dist * 1.5, dist * 1.0);
  lights.fill.position.set(-dist * 1.3, dist * 0.7, dist * 0.8);
  lights.rimLight.position.set(-dist * 0.5, dist * 1.0, -dist * 1.3);
  // light targets live outside the scene graph: refresh their world matrix by hand
  for (const l of Object.values(lights)) {
    l.target.position.copy(target);
    l.target.updateMatrixWorld();
  }

  return box;
}

// ------------------------------------------------------------------- API
export function openGallery() {
  if (open) return galleryInfo();
  if (!catalog) catalog = buildCatalog();
  open = true;

  hidden = [];
  for (const child of Engine.scene.children) {
    if (child.visible) { hidden.push(child); child.visible = false; }
  }
  savedCamera = {
    position: Engine.camera.position.clone(),
    quaternion: Engine.camera.quaternion.clone(),
    near: Engine.camera.near,
    far: Engine.camera.far,
  };

  stage = buildStage();
  Engine.scene.add(stage.group);
  buildOverlay();

  keyHandler = (e) => {
    if (currentMode() !== MODES.GALLERY) return;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { page(1); e.preventDefault(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { page(-1); e.preventDefault(); }
    else if (e.code === 'Escape') { closeGallery(); e.preventDefault(); }
  };
  window.addEventListener('keydown', keyHandler);

  // Turntable spin is driven by the sim step, so `advanceTime` rotates it
  // exactly like real time does — screenshots stay reproducible.
  removeUpdater = Engine.addUpdater((dt) => {
    if (!open) return;
    spin += dt * 0.5;
    stage.turntable.rotation.y = spin;
  }, 90);

  setMode(MODES.GALLERY);
  show(index);
  return galleryInfo();
}

export function closeGallery() {
  if (!open) return;
  open = false;
  if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
  if (removeUpdater) { removeUpdater(); removeUpdater = null; }
  if (overlay) { overlay.remove(); overlay = null; }
  if (stage) { Engine.scene.remove(stage.group); stage = null; }
  current = null;
  for (const child of hidden) child.visible = true;
  hidden = [];
  if (savedCamera) {
    Engine.camera.position.copy(savedCamera.position);
    Engine.camera.quaternion.copy(savedCamera.quaternion);
    Engine.camera.near = savedCamera.near;
    Engine.camera.far = savedCamera.far;
    Engine.camera.updateProjectionMatrix();
    savedCamera = null;
  }
  if (currentMode() === MODES.GALLERY) setMode(MODES.TITLE);
}

// idOrIndex: catalog index, entry id ('prop_desk_standard'), bare prop id
// ('desk_standard') or a manifest asset id ('CHR-003').
export function galleryShow(idOrIndex) {
  if (!catalog) catalog = buildCatalog();
  const i = resolve(idOrIndex);
  if (i < 0) return null;
  if (!open) { index = i; return openGallery(); }
  show(i);
  return galleryInfo();
}

export function galleryInfo() {
  if (!open || !current) return null;
  const e = current.entry;
  const size = current.box.getSize(new THREE.Vector3());
  const asset = lookupAsset(e.assetId);
  return {
    index, total: catalog.length,
    id: e.id,
    category: e.category,
    assetId: e.assetId || null,
    propId: e.propId || null,
    name: asset ? asset.entry.name : null,
    manifestEntryId: asset ? asset.entry.id : null,
    inManifest: !!asset,
    exactManifestId: !!asset?.exact,
    size: [round(size.x), round(size.y), round(size.z)],
  };
}

// Manifest entries are authored per prop FAMILY, so an asset id like FURN-002
// often lives inside the FURN-001 family entry's name rather than as its own row.
function lookupAsset(assetId) {
  if (!assetId) return null;
  const exact = manifestById(assetId);
  if (exact) return { entry: exact, exact: true };
  const family = MANIFEST.find((a) => typeof a.name === 'string' && a.name.includes(assetId));
  return family ? { entry: family, exact: false } : null;
}

function resolve(idOrIndex) {
  if (typeof idOrIndex === 'number') {
    if (!Number.isFinite(idOrIndex)) return -1;
    return ((idOrIndex % catalog.length) + catalog.length) % catalog.length;
  }
  const s = String(idOrIndex);
  let i = catalog.findIndex((e) => e.id === s);
  if (i < 0) i = catalog.findIndex((e) => e.propId === s);
  if (i < 0) i = catalog.findIndex((e) => e.assetId === s);
  return i;
}

function page(dir) {
  show(index + dir);
}

function show(i) {
  index = ((i % catalog.length) + catalog.length) % catalog.length;
  const entry = catalog[index];
  stage.turntable.clear();
  spin = 0;
  stage.turntable.rotation.y = 0;
  let object;
  try {
    object = entry.make();
  } catch (err) {
    console.error(`[gallery] failed to build '${entry.id}'`, err);
    object = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshStandardMaterial({ color: 0x883333 }));
  }
  object.traverse?.((o) => { o.visible = true; if (o.isMesh) o.castShadow = false; });
  object.rotation.y = presentYaw(entry.category);
  stage.turntable.add(object);
  // the entry may declare a manifest id, or the factory may stamp one on
  if (!entry.assetId && object.userData?.assetId) entry.assetId = object.userData.assetId;
  const box = frame(object);
  current = { entry, object, box };
  paintOverlay();
  Engine.render();
}

// ---------------------------------------------------------------- overlay
function buildOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'gallery-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:60;pointer-events:none;font-family:var(--font-sans,system-ui,sans-serif);';
  overlay.innerHTML = `
    <div class="panel" id="gallery-card" style="position:absolute;left:24px;bottom:24px;min-width:360px;max-width:520px;pointer-events:auto;background:rgba(6,11,17,0.86);border:1px solid rgba(127,210,255,0.28);padding:14px 16px;">
      <div style="font:600 10px/1 var(--font-mono,monospace);letter-spacing:0.32em;color:#7fd2ff;">ASSET GALLERY — DEV BUILD</div>
      <div id="gal-asset" style="font:700 20px/1.2 var(--font-mono,monospace);color:#e8f1f8;margin-top:9px;">—</div>
      <div id="gal-name" style="font:400 13px/1.45 system-ui,sans-serif;color:#9db4c6;margin-top:5px;">—</div>
      <div id="gal-meta" style="font:500 11px/1.5 var(--font-mono,monospace);color:#5d7284;margin-top:8px;letter-spacing:0.08em;">—</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:12px;">
        <button id="gallery-prev" style="pointer-events:auto;font:600 11px var(--font-mono,monospace);letter-spacing:0.14em;color:#cfe4f2;background:rgba(16,28,40,0.9);border:1px solid rgba(127,210,255,0.3);padding:7px 12px;cursor:pointer;">◀ PREV</button>
        <button id="gallery-next" style="pointer-events:auto;font:600 11px var(--font-mono,monospace);letter-spacing:0.14em;color:#cfe4f2;background:rgba(16,28,40,0.9);border:1px solid rgba(127,210,255,0.3);padding:7px 12px;cursor:pointer;">NEXT ▶</button>
        <button id="gallery-back" style="pointer-events:auto;font:600 11px var(--font-mono,monospace);letter-spacing:0.14em;color:#ffd9a0;background:rgba(28,20,12,0.9);border:1px solid rgba(255,180,84,0.35);padding:7px 12px;cursor:pointer;margin-left:auto;">BACK (ESC)</button>
      </div>
      <div style="font:400 10.5px/1.5 var(--font-mono,monospace);color:#4d6070;margin-top:9px;">← → or A / D page · Esc returns to title</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#gallery-prev').addEventListener('click', () => page(-1));
  overlay.querySelector('#gallery-next').addEventListener('click', () => page(1));
  overlay.querySelector('#gallery-back').addEventListener('click', () => closeGallery());
}

function paintOverlay() {
  if (!overlay || !current) return;
  const info = galleryInfo();
  overlay.querySelector('#gal-asset').textContent = info.assetId ? `${info.assetId} · ${info.id}` : info.id;
  overlay.querySelector('#gal-name').textContent = info.name || '(no manifest entry — id only)';
  overlay.querySelector('#gal-meta').textContent =
    `${info.category.toUpperCase()}  ·  ${info.index + 1} / ${info.total}  ·  ${info.size[0]}×${info.size[1]}×${info.size[2]} m`;
  const card = overlay.querySelector('#gallery-card');
  card.dataset.assetId = info.assetId || '';
  card.dataset.entryId = info.id;
  card.dataset.index = String(info.index);
}

function round(n) { return Math.round(n * 100) / 100; }
