import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';
import { lerp, Rng, TAU } from '../core/math';
import { IslandDef, IslandField } from './islands';
import { barrelGeometry, crateGeometry, signGeometry } from './props';
import { glowMaterial } from '../ship/shipbuilder';

export interface OutpostStation {
  name: string;
  label: string;
  position: THREE.Vector3;
}

export interface Outpost {
  island: IslandDef;
  group: THREE.Group;
  /** Gold Hoarders tent: sell treasure here. */
  sell: THREE.Vector3;
  /** Voyage table: pick up a new dig chart. */
  voyage: THREE.Vector3;
  /** Barrels: restock planks, cannonballs and bananas. */
  resupply: THREE.Vector3;
  /** Seaward end of the pier, where the gangway meets the water. */
  dockEnd: THREE.Vector3;
  /** Deep-water berth beside the pier head, where ships spawn. */
  mooring: THREE.Vector3;
  lights: THREE.PointLight[];
}

const WOOD = 0x6b4a2c;
const WOOD_LIGHT = 0x8a6b40;
const WOOD_DARK = 0x452f1b;
const CANVAS_CREAM = 0xd9c9a4;
const CANVAS_RED = 0x8a3a2c;

const outpostMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.03 });

/**
 * Builds the little settlement on an outpost island: a pier out into the
 * shallows, the Gold Hoarders tent where treasure is sold, a voyage table, and
 * resupply barrels. Everything is placed against the live height field so it
 * sits on the ground no matter how the island generated.
 */
export function buildOutpost(island: IslandDef, islands: IslandField, scene: THREE.Scene): Outpost {
  const group = new THREE.Group();
  group.name = `outpost-${island.id}`;
  const builder = new MeshBuilder();
  const rng = new Rng(island.seed * 31 + 7);
  const lights: THREE.PointLight[] = [];
  const glows: { position: THREE.Vector3; size: number; color: number }[] = [];

  // Find the gentlest stretch of shore to build the pier on.
  let bestAngle = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * TAU;
    const shoreX = island.x + Math.cos(angle) * island.radius * 0.92;
    const shoreZ = island.z + Math.sin(angle) * island.radius * 0.92;
    const height = islands.heightAt(shoreX, shoreZ);
    const slope = islands.slopeAt(shoreX, shoreZ);
    // Prefer a shallow beach: low ground, gentle slope.
    const score = -Math.abs(height - 0.6) * 2 - slope * 6;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }

  const outward = new THREE.Vector3(Math.cos(bestAngle), 0, Math.sin(bestAngle));
  const alongside = new THREE.Vector3(-outward.z, 0, outward.x);
  const shoreDistance = island.radius * 0.88;
  const shore = new THREE.Vector3(
    island.x + outward.x * shoreDistance,
    0,
    island.z + outward.z * shoreDistance,
  );
  shore.y = islands.heightAt(shore.x, shore.z);

  // ------------------------------------------------------------------ pier
  const deckHeight = Math.max(1.6, shore.y + 1.2);
  // Run the pier out until there is enough water under it for a sloop to moor,
  // otherwise ships spawn beached on the sand.
  let pierLength = 24;
  for (let distance = 10; distance < 90; distance += 2) {
    const x = shore.x + outward.x * distance;
    const z = shore.z + outward.z * distance;
    if (islands.heightAt(x, z) < -5) {
      pierLength = distance + 4;
      break;
    }
  }
  pierLength = Math.min(pierLength, 92);
  const pierWidth = 3.4;
  const local = (alongDist: number, sideDist: number, y: number): THREE.Vector3 =>
    new THREE.Vector3(
      shore.x + outward.x * alongDist + alongside.x * sideDist,
      y,
      shore.z + outward.z * alongDist + alongside.z * sideDist,
    );

  const planks = Math.max(18, Math.round(pierLength / 1.2));
  for (let i = 0; i < planks; i++) {
    const t0 = (i / planks) * pierLength - 2;
    const centre = local(t0 + pierLength / planks / 2, 0, deckHeight);
    const box = new MeshBuilder();
    box.addBox(
      { x: 0, y: 0, z: 0 },
      { x: pierLength / planks - 0.06, y: 0.16, z: pierWidth },
      i % 2 === 0 ? WOOD_LIGHT : WOOD,
    );
    const geometry = box.build();
    const matrix = new THREE.Matrix4().compose(
      centre,
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -bestAngle),
      new THREE.Vector3(1, 1, 1),
    );
    builder.addGeometry(geometry, undefined, matrix);
    geometry.dispose();
  }

  // Pilings and hand rails.
  const pilingPairs = Math.max(6, Math.round(pierLength / 7));
  for (let i = 0; i <= pilingPairs; i++) {
    const alongDist = lerp(-1.5, pierLength - 2, i / pilingPairs);
    for (const side of [-1, 1] as const) {
      const top = local(alongDist, side * (pierWidth / 2 - 0.2), deckHeight);
      const seabed = islands.heightAt(top.x, top.z);
      const post = new THREE.CylinderGeometry(0.16, 0.18, deckHeight - seabed + 1.2, 6);
      builder.addGeometry(
        post,
        WOOD_DARK,
        new THREE.Matrix4().makeTranslation(top.x, (deckHeight + seabed) / 2 + 0.2, top.z),
      );
      post.dispose();
      // Rail posts and top rail on the outer half of the pier.
      if (i > 1) {
        const railPost = new THREE.CylinderGeometry(0.07, 0.07, 1.0, 5);
        builder.addGeometry(railPost, WOOD, new THREE.Matrix4().makeTranslation(top.x, deckHeight + 0.55, top.z));
        railPost.dispose();
      }
    }
  }

  const dockEnd = local(pierLength - 4, 0, deckHeight);

  // A berth alongside the pier head with real water under it.
  let mooringDistance = pierLength + 6;
  for (let distance = pierLength; distance < pierLength + 90; distance += 3) {
    const p = local(distance, 16, 0);
    if (islands.heightAt(p.x, p.z) < -8) {
      mooringDistance = distance;
      break;
    }
  }
  const mooring = local(mooringDistance, 16, 0);
  mooring.y = 0;

  // Mooring bollards and a lantern at the pier head.
  for (const side of [-1, 1] as const) {
    const p = local(pierLength - 3, side * (pierWidth / 2 + 0.1), deckHeight);
    const bollard = new THREE.CylinderGeometry(0.16, 0.2, 0.8, 7);
    builder.addGeometry(bollard, WOOD_DARK, new THREE.Matrix4().makeTranslation(p.x, deckHeight + 0.4, p.z));
    bollard.dispose();
  }
  {
    const p = local(pierLength - 2.2, 0, deckHeight);
    const pole = new THREE.CylinderGeometry(0.08, 0.1, 2.6, 6);
    builder.addGeometry(pole, WOOD_DARK, new THREE.Matrix4().makeTranslation(p.x, deckHeight + 1.3, p.z));
    pole.dispose();
    glows.push({ position: new THREE.Vector3(p.x, deckHeight + 2.5, p.z), size: 0.32, color: 0xffd08a });
    const light = new THREE.PointLight(0xffb45a, 0, 28, 1);
    light.position.set(p.x, deckHeight + 2.5, p.z);
    group.add(light);
    lights.push(light);
  }

  // ------------------------------------------------- shore-side settlement
  const plazaCentre = new THREE.Vector3(
    island.x + outward.x * island.radius * 0.42,
    0,
    island.z + outward.z * island.radius * 0.42,
  );
  plazaCentre.y = islands.heightAt(plazaCentre.x, plazaCentre.z);

  /** Canvas tent with a trestle table underneath. */
  const addTent = (centre: THREE.Vector3, canvasColor: number, rotation: number): void => {
    const tent = new MeshBuilder();
    const w = 3.4;
    const d = 3.0;
    const h = 2.4;
    for (const [dx, dz] of [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      tent.addBox({ x: (dx * w) / 2, y: h / 2, z: (dz * d) / 2 }, { x: 0.14, y: h, z: 0.14 }, WOOD_DARK);
    }
    // Ridge beam and two sloping canvas panels.
    tent.addBox({ x: 0, y: h + 0.6, z: 0 }, { x: w + 0.5, y: 0.12, z: 0.12 }, WOOD_DARK);
    for (const side of [-1, 1] as const) {
      const a = new THREE.Vector3(-w / 2 - 0.25, h + 0.6, 0);
      const b = new THREE.Vector3(w / 2 + 0.25, h + 0.6, 0);
      const c = new THREE.Vector3(w / 2 + 0.25, h - 0.15, (side * (d + 0.7)) / 2);
      const dd = new THREE.Vector3(-w / 2 - 0.25, h - 0.15, (side * (d + 0.7)) / 2);
      // Wind each panel so its normal faces the sky, not the ground.
      if (side > 0) tent.addQuad(dd, c, b, a, canvasColor);
      else tent.addQuad(a, b, c, dd, canvasColor);
    }
    // Trestle table.
    tent.addBox({ x: 0, y: 0.95, z: -0.4 }, { x: 2.4, y: 0.12, z: 1.0 }, WOOD_LIGHT);
    for (const dx of [-1, 1]) {
      tent.addBox({ x: dx * 1.0, y: 0.48, z: -0.4 }, { x: 0.14, y: 0.95, z: 0.8 }, WOOD_DARK);
    }
    const geometry = tent.build();
    builder.addGeometry(
      geometry,
      undefined,
      new THREE.Matrix4().compose(
        centre,
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    geometry.dispose();

    const light = new THREE.PointLight(0xffb45a, 0, 20, 1);
    light.position.set(centre.x, centre.y + 2.2, centre.z);
    group.add(light);
    lights.push(light);
  };

  const sellSpot = plazaCentre.clone().addScaledVector(alongside, -5.5);
  sellSpot.y = islands.heightAt(sellSpot.x, sellSpot.z);
  addTent(sellSpot, CANVAS_RED, -bestAngle + Math.PI / 2);

  const voyageSpot = plazaCentre.clone().addScaledVector(alongside, 5.5);
  voyageSpot.y = islands.heightAt(voyageSpot.x, voyageSpot.z);
  addTent(voyageSpot, CANVAS_CREAM, -bestAngle + Math.PI / 2);

  // Resupply barrels between the two tents.
  const resupplySpot = plazaCentre.clone().addScaledVector(outward, -2.5);
  resupplySpot.y = islands.heightAt(resupplySpot.x, resupplySpot.z);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * TAU;
    const p = resupplySpot.clone().add(new THREE.Vector3(Math.cos(angle) * 1.5, 0, Math.sin(angle) * 1.5));
    p.y = islands.heightAt(p.x, p.z);
    const geometry = i % 2 === 0 ? barrelGeometry() : crateGeometry(rng);
    builder.addGeometry(
      geometry,
      undefined,
      new THREE.Matrix4().compose(
        new THREE.Vector3(p.x, p.y + (i % 2 === 0 ? 0.56 : 0), p.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.float(0, TAU)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    geometry.dispose();
  }

  // Signpost by the pier head on land.
  {
    const signSpot = shore.clone().addScaledVector(outward, -3).addScaledVector(alongside, 2.6);
    signSpot.y = islands.heightAt(signSpot.x, signSpot.z);
    const geometry = signGeometry();
    builder.addGeometry(
      geometry,
      undefined,
      new THREE.Matrix4().compose(
        signSpot,
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -bestAngle),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    geometry.dispose();
  }

  // A few torch posts to light the plaza at night.
  for (let i = 0; i < 3; i++) {
    const angle = -bestAngle + (i - 1) * 0.9;
    const p = plazaCentre.clone().add(new THREE.Vector3(Math.cos(angle) * 7, 0, Math.sin(angle) * 7));
    p.y = islands.heightAt(p.x, p.z);
    const post = new THREE.CylinderGeometry(0.09, 0.11, 2.8, 6);
    builder.addGeometry(post, WOOD_DARK, new THREE.Matrix4().makeTranslation(p.x, p.y + 1.4, p.z));
    post.dispose();
    glows.push({ position: new THREE.Vector3(p.x, p.y + 2.9, p.z), size: 0.26, color: 0xffc070 });
    const light = new THREE.PointLight(0xff9a40, 0, 18, 1);
    light.position.set(p.x, p.y + 2.9, p.z);
    group.add(light);
    lights.push(light);
  }

  const mesh = new THREE.Mesh(builder.build(), outpostMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  for (const glow of glows) {
    const flame = new THREE.Mesh(new THREE.BoxGeometry(glow.size, glow.size * 1.2, glow.size), glowMaterial(glow.color));
    flame.position.copy(glow.position);
    group.add(flame);
  }
  scene.add(group);

  return {
    island,
    group,
    sell: sellSpot.clone().setY(sellSpot.y + 1),
    voyage: voyageSpot.clone().setY(voyageSpot.y + 1),
    resupply: resupplySpot.clone().setY(resupplySpot.y + 1),
    dockEnd,
    mooring,
    lights,
  };
}

/** Turns outpost lanterns up at night and during storms. */
export function updateOutpostLights(outposts: Outpost[], nightFactor: number, storm: number): void {
  const intensity = Math.max(nightFactor, storm * 0.7) * 8;
  for (const outpost of outposts) {
    for (const light of outpost.lights) light.intensity = intensity;
  }
}
