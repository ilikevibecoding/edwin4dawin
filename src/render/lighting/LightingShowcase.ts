import * as THREE from 'three';
import { Groups, setHitMeta, type GameContext } from '../../core/GameContext';
import type { IMaterialLibrary, ISky } from '../../core/Interfaces';
import { registerVantages } from '../../core/Vantage';

/**
 * A test range for the lighting rig, built when the url carries
 * `showcase=lighting`.
 *
 * Every element exists to make one specific failure impossible to miss:
 *
 *  - **Colonnade.** Long raking shadows at a low sun, the case where acne and
 *    peter-panning both show first, and the one place a slope-scaled bias is
 *    actually tested rather than assumed.
 *  - **Doorway and interior.** A room with one opening. If sky occlusion is not
 *    working the back wall is as bright as the street, which is the single most
 *    recognisable tell of an unfinished WebGL scene. If the bounce probes are
 *    not working the interior is neutral grey instead of taking the warm cast
 *    of the sunlit ground outside it.
 *  - **Box clusters at 6, 26, 58 and 108 metres.** Straddles every cascade
 *    split, so a seam or a resolution step reads immediately.
 *  - **Sphere grid.** Roughness sweep in dielectric and metal. Blown or black
 *    image-based lighting is obvious the moment the two rows disagree.
 *  - **Thin pole and sign.** A caster one shadow texel wide. Too much depth
 *    bias and its shadow detaches; front-face culling and it vanishes.
 *  - **Awning.** A flat slab over open ground: the cleanest read on whether the
 *    sky-visibility volume produces a gradient rather than a hard step.
 *
 * The range sits three times the map's own width east of the town, past the
 * last terrain triangle, so the two showcases never intersect and the pad is
 * the only ground out here.
 */

/** Far enough east of `MAP.outerMaxX` that no terrain reaches it. */
const ORIGIN = new THREE.Vector3(240, 0, 0);
/** Edge of the flat pad the range stands on, and how deep the block is. */
const PAD = 220;
const PAD_DEPTH = 24;

export interface LightingShowcase {
  root: THREE.Group;
  /** Everything that casts, so the cascades know what to fit their depth to. */
  bounds: THREE.Box3;
  /**
   * The part worth probing, which is much smaller than `bounds`.
   *
   * Probe spacing is the volume's extent over a fixed budget, so including the
   * 108 m box stack costs resolution everywhere — and at 8 m spacing a 12 x 9 m
   * room is not resolved at all, which shows up as an interior lit like the
   * street. The distant stacks need cascades, not probes.
   */
  probeBounds: THREE.Box3;
  dispose(): void;
}

interface Builder {
  group: THREE.Group;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

function place(
  builder: Builder,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  rotY = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  builder.group.add(mesh);
  return mesh;
}

function own(builder: Builder, geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  builder.geometries.push(geometry);
  return geometry;
}

function ownMaterial<T extends THREE.Material>(builder: Builder, material: T): T {
  builder.materials.push(material);
  return material;
}

export function buildShowcase(ctx: GameContext): LightingShowcase {
  const lib = ctx.tryGet<IMaterialLibrary>('materials');
  const group = new THREE.Group();
  group.name = 'LightingShowcase';
  group.position.copy(ORIGIN);
  const builder: Builder = { group, geometries: [], materials: [] };

  const surface = (name: string, fallback: number, rough: number, metal = 0): THREE.Material => {
    if (lib) {
      try {
        return lib.clone(name as never);
      } catch {
        /* Fall through to the greybox material below. */
      }
    }
    return ownMaterial(
      builder,
      new THREE.MeshStandardMaterial({ color: fallback, roughness: rough, metalness: metal }),
    );
  };

  const sand = lib
    ? lib.forSize('sand', 40, 40)
    : ownMaterial(builder, new THREE.MeshStandardMaterial({ color: 0x8d7a58, roughness: 1 }));
  const stone = lib ? lib.forSize('concrete', 4, 7) : surface('concrete', 0x9a9083, 0.85);
  const plasterOut = lib ? lib.forSize('stucco_sand', 6, 5) : surface('stucco_sand', 0xbfa887, 0.9);
  const plasterIn = lib ? lib.forSize('plaster', 6, 5) : surface('plaster', 0xcdc4b6, 0.92);
  const crate = lib ? lib.forSize('wood_crate', 1.4, 1.4) : surface('wood_crate', 0x8a6a42, 0.8);
  const steel = lib ? lib.get('steel_plate') : surface('steel_plate', 0x777b80, 0.45, 1);

  /* --------------------------------- ground -------------------------------- */

  /* A pedestal rather than a plane, so the range reads as standing on something
     when the horizon is in frame and the near edge cannot show sky through it.
     It does not cast — a 220 m box in the atlas is a depth wall across every
     cascade — and nothing needs it to. */
  const ground = new THREE.Mesh(own(builder, new THREE.BoxGeometry(PAD, PAD_DEPTH, PAD)), sand);
  ground.position.y = -PAD_DEPTH / 2;
  ground.receiveShadow = true;
  ground.castShadow = false;
  group.add(ground);

  /* ------------------------------- colonnade ------------------------------- */

  const shaft = own(builder, new THREE.CylinderGeometry(0.58, 0.68, 6.2, 20, 1));
  const plinth = own(builder, new THREE.BoxGeometry(1.9, 0.45, 1.9));
  const capital = own(builder, new THREE.BoxGeometry(1.6, 0.35, 1.6));
  for (let i = 0; i < 9; i++) {
    const x = -28 + i * 7;
    place(builder, plinth, stone, x, 0.225, -14);
    place(builder, shaft, stone, x, 3.55, -14);
    place(builder, capital, stone, x, 6.83, -14);
  }
  place(builder, own(builder, new THREE.BoxGeometry(63, 1.1, 2.3)), stone, 0, 7.55, -14);
  /* A run of low steps under the colonnade: the shallow risers are where a
     slope-scaled bias either holds or produces stripes. */
  for (let s = 0; s < 3; s++) {
    place(
      builder,
      own(builder, new THREE.BoxGeometry(64 - s * 1.2, 0.18, 4.4 - s * 1.2)),
      stone,
      0,
      0.09 + s * 0.18,
      -10.2 - s * 0.6,
    );
  }

  /* -------------------------------- interior ------------------------------- */

  const roomX = 16;
  const roomZ = 13;
  /* Depth from the doorway, kept under nine metres so a 16° sun through a 3 m
     opening reaches the back wall instead of dying on the floor out of sight.
     The shaft is the point of the room. */
  const w = 8.5;
  const d = 9;
  const h = 4.4;
  const t = 0.4;
  /* The opening faces west, on the -x wall, because that is the only direction
     this sky ever puts the sun low enough to reach through a doorway. Facing it
     south gave a front wall in permanent shade and a shaft that never landed —
     which tests nothing except that the room is dark. */
  const front = roomX - w / 2;

  place(builder, own(builder, new THREE.BoxGeometry(w, t, d)), plasterIn, roomX, h + t / 2, roomZ);
  place(builder, own(builder, new THREE.BoxGeometry(t, h, d)), plasterIn, roomX + w / 2, h / 2, roomZ);
  const endWall = own(builder, new THREE.BoxGeometry(w, h, t));
  place(builder, endWall, plasterIn, roomX, h / 2, roomZ - d / 2);
  place(builder, endWall, plasterIn, roomX, h / 2, roomZ + d / 2);
  /* West wall in three pieces, leaving a 2.4 x 3.0 doorway on the axis. */
  const jamb = own(builder, new THREE.BoxGeometry(t, 3, (d - 2.4) / 2));
  place(builder, jamb, plasterOut, front, 1.5, roomZ - (d + 2.4) / 4);
  place(builder, jamb, plasterOut, front, 1.5, roomZ + (d + 2.4) / 4);
  place(builder, own(builder, new THREE.BoxGeometry(t, h - 3, d)), plasterOut, front, 3 + (h - 3) / 2, roomZ);
  /* Hood over the door: the sharpest read on the sky-visibility gradient, since
     the ground under it is otherwise identical to the ground beside it. */
  place(builder, own(builder, new THREE.BoxGeometry(1.4, 0.3, d + 1.2)), plasterOut, front - 0.5, h + 0.3, roomZ);

  /* Something inside worth lighting: without it the room is an empty box and
     the bounce has nothing to land on. */
  place(builder, own(builder, new THREE.BoxGeometry(1.1, 0.9, 2.2)), crate, roomX + 1.5, 0.45, roomZ - 3, 0.3);
  place(builder, own(builder, new THREE.BoxGeometry(1.1, 1.1, 1.1)), crate, roomX + 2.4, 0.55, roomZ + 3.2, -0.5);
  place(builder, own(builder, new THREE.SphereGeometry(0.85, 32, 20)), steel, roomX - 1.2, 0.85, roomZ);

  /* --------------------------- cascade transition -------------------------- */

  const cube = own(builder, new THREE.BoxGeometry(1.3, 1.3, 1.3));
  const slab = own(builder, new THREE.BoxGeometry(5.5, 3.2, 0.5));
  /* Distance, lateral offset and scale per cluster. The offsets fan outwards
     faster than the distances grow, because a constant lateral offset is a
     constant screen angle and the four clusters would stack into one silhouette;
     the scales hold their apparent size roughly steady so the shadow of the far
     cluster is judged against the near one rather than against its own size. */
  const clusters = [
    { z: 7, x: -6.7, scale: 1 },
    { z: 26, x: -2.6, scale: 1.5 },
    { z: 58, x: 8, scale: 2.2 },
    { z: 108, x: 30.5, scale: 3.2 },
  ];
  for (const { z, x, scale } of clusters) {
    for (let s = 0; s < 3; s++) {
      const box = place(builder, cube, crate, x + s * 0.18 * scale, 0, z, 0.2 + s * 0.35);
      box.scale.setScalar(scale);
      box.position.y = (0.65 + s * 1.3) * scale;
    }
    const wall = place(builder, slab, stone, x - 6 * scale, 1.6 * scale, z, 0.15);
    wall.scale.setScalar(scale);
  }

  /* ------------------------------ sphere grid ------------------------------ */

  const sphere = own(builder, new THREE.SphereGeometry(0.85, 40, 24));
  place(builder, own(builder, new THREE.BoxGeometry(16, 0.5, 6)), stone, -24, 0.25, 6);
  for (let i = 0; i < 6; i++) {
    const roughness = 0.04 + i * 0.19;
    for (let row = 0; row < 2; row++) {
      const material = ownMaterial(
        builder,
        new THREE.MeshStandardMaterial({
          color: row === 0 ? 0xb9b3a8 : 0xc8c2b4,
          roughness,
          metalness: row,
          envMapIntensity: 1,
        }),
      );
      place(builder, sphere, material, -31 + i * 2.8, 1.35, 4.2 + row * 2.6);
    }
  }

  /* -------------------------- thin caster + awning ------------------------- */

  const pole = own(builder, new THREE.CylinderGeometry(0.035, 0.035, 4.4, 10));
  const rail = own(builder, new THREE.BoxGeometry(4.4, 0.05, 0.05));
  for (let i = 0; i < 3; i++) place(builder, pole, steel, 1 + i * 2.2, 2.2, -4);
  place(builder, rail, steel, 3.2, 3.6, -4);
  place(builder, rail, steel, 3.2, 1.9, -4);
  /* A sheet 3 cm thick. Any depth bias large enough to detach a shadow from its
     caster erases this one entirely. */
  place(builder, own(builder, new THREE.BoxGeometry(1.5, 0.95, 0.03)), steel, 5.6, 2.4, -4);

  const post = own(builder, new THREE.BoxGeometry(0.22, 3.1, 0.22));
  place(builder, post, stone, -3, 1.55, 3);
  place(builder, post, stone, -3, 1.55, 8);
  place(builder, own(builder, new THREE.BoxGeometry(4.2, 0.22, 5.6)), stone, -1.1, 3.2, 5.5);

  /* -------------------------------- lights --------------------------------- */

  /* One shadow-casting hero spot in the doorway and one fill inside. Local
     light intensity is kilocandela, so 6 here is a bright practical lamp, not
     a floodlight — the units are the same ones the sun uses. */
  const spot = new THREE.SpotLight(0xffb37a, 7, 22, 0.62, 0.45, 2);
  spot.position.set(front + 1.2, 3.7, roomZ);
  spot.target.position.set(roomX + 4, 0.6, roomZ + 1.5);
  spot.castShadow = true;
  group.add(spot);
  group.add(spot.target);

  const lamp = new THREE.PointLight(0xffd7a8, 2.6, 11, 2);
  lamp.position.set(roomX + 3.4, 3.1, roomZ - 2.6);
  group.add(lamp);

  setHitMeta(group, { group: Groups.WORLD, surface: 'concrete' });
  ctx.scene.add(group);
  /* Physics bakes collision from world matrices, and the renderer is what
     normally updates those — which does not happen until after the first
     update, by which point the range would have been registered at the origin
     and every probe ray fired out here would have missed it. */
  group.updateMatrixWorld(true);

  /* Registered here, during `init`, and not on the first frame. Static collision
     has a hard triangle ceiling and the level alone reaches it, so a root handed
     over after the level's is silently dropped whole — which showed up as a
     sky-visibility bake that found no walls and an interior lit like the street.
     Registering from inside `init` puts the range ahead of `WorldSystem` (order
     30) in the bake queue and it gets its few thousand triangles. */
  ctx.tryGet<{ addStatic(o: THREE.Object3D): void }>('physics')?.addStatic(group);

  const lighting = ctx.tryGet<{
    addLocalLight?(light: THREE.Light, radius: number): void;
  }>('lighting');
  lighting?.addLocalLight?.(spot, 22);
  lighting?.addLocalLight?.(lamp, 11);

  const bounds = new THREE.Box3(
    new THREE.Vector3(ORIGIN.x - 60, -3, ORIGIN.z - 26),
    new THREE.Vector3(ORIGIN.x + 40, 14, ORIGIN.z + 122),
  );
  /* Colonnade, sphere grid, awning and the room, and nothing beyond them. */
  const probeBounds = new THREE.Box3(
    new THREE.Vector3(ORIGIN.x - 40, -1, ORIGIN.z - 19),
    new THREE.Vector3(ORIGIN.x + 26, 10, ORIGIN.z + 26),
  );

  registerVantages(makeVantages(ctx));

  return {
    root: group,
    bounds,
    probeBounds,
    dispose(): void {
      group.removeFromParent();
      for (const geometry of builder.geometries) geometry.dispose();
      for (const material of builder.materials) material.dispose();
      builder.geometries.length = 0;
      builder.materials.length = 0;
    },
  };
}

/**
 * Camera placements.
 *
 * The sky puts the afternoon sun in the west, so a shadow on flat ground runs
 * almost due `+x`: 21 m of it from a 6 m column at 16.9h. Every vantage here is
 * placed across that direction or down it. A camera looking the other way sees
 * each shadow hidden behind its own caster, which is how a rig with working
 * shadows produces a set of screenshots that appear to have none.
 */
function makeVantages(ctx: GameContext): Parameters<typeof registerVantages>[0] {
  /** Positions are given relative to the range, not to the world origin. */
  const at = (x: number, y: number, z: number): THREE.Vector3 =>
    new THREE.Vector3(ORIGIN.x + x, y, ORIGIN.z + z);

  /*
   * The sky owns the conditions, so a shot that needs particular light asks the
   * sky for it rather than posing a light of its own. Everything downstream —
   * key colour, cascades, probes, aerial perspective — follows from these two
   * calls.
   *
   * Weather goes through a named preset rather than `setWeather`, for two
   * reasons. The harness runs every shot in one browser session, so a vantage
   * that changes the weather and does not restore it silently relights every
   * later shot; naming the preset on all of them makes the set order-independent.
   * And a preset is the only path that rebuilds the cloud profile: `setWeather`
   * with just a cover leaves the deck as it was, so an overcast shot comes out
   * looking exactly like the clear one it was meant to contrast with.
   *
   * `golden` is the boot preset, so naming it changes nothing but the guarantee.
   */
  const look = (preset: string, hours: number) => () => {
    const sky = ctx.tryGet<ISky>('sky');
    sky?.applyPreset?.(preset);
    sky?.setTimeOfDay(hours);
  };

  return [
    {
      /* Down-sun of the colonnade looking back along it, so the shadows rake
         across the frame towards the camera and both ends of each one are in
         view. From up-sun they recede to a point and neither the contact at the
         base nor the softening at the tip can be judged. */
      name: 'lit_colonnade',
      position: at(19, 1.7, 1.5),
      lookAt: at(3.2, 1.6, -4.2),
      fov: 62,
      hideViewmodel: true,
      note: 'Raking low sun down a colonnade: acne, peter-panning and contact hardening.',
      setup: look('golden', 16.9),
    },
    {
      name: 'lit_interior',
      position: at(2.4, 1.7, 13),
      lookAt: at(21, 1.5, 13.4),
      fov: 66,
      hideViewmodel: true,
      note: 'Through a doorway into a lit room: sky occlusion, bounce, hero spot.',
      setup: look('golden', 16.9),
    },
    {
      /* Raised, because at eye height a 4 m box stack hides its own shadow. The
         extra elevation also drags both cascade splits across open ground where
         a resolution step would be visible. */
      name: 'lit_cascades',
      position: at(-7.5, 7.5, -8),
      lookAt: at(6, 0.8, 44),
      fov: 62,
      hideViewmodel: true,
      note: 'Box clusters at 7, 26, 58 and 108 m, fanned out; watch each split.',
      setup: look('golden', 15.6),
    },
    {
      name: 'lit_ibl',
      position: at(-24.5, 2.5, -4.5),
      lookAt: at(-25.5, 1.35, 6),
      fov: 52,
      hideViewmodel: true,
      note: 'Roughness sweep, dielectric over metal, against the prefiltered probe.',
      setup: look('golden', 16.9),
    },
    {
      /* Close, and across the shadow direction. A 3.5 cm shadow is three pixels
         wide at eight metres and nothing at twenty, so a wider shot cannot tell a
         detached shadow from a thin one. */
      name: 'lit_bias',
      position: at(6.5, 1.15, 3.2),
      lookAt: at(3.2, 0.5, -4),
      fov: 52,
      hideViewmodel: true,
      note: 'Thin poles, a rail and a 3 cm sheet at close range: bias and contact.',
      setup: look('golden', 16.9),
    },
    {
      /* Deliberately the same pose and hour as lit_colonnade, so the weather is
         the only variable between the two frames. Under a full deck the key
         should lose most of its intensity and all of its edge, and the frame
         should end up carried by the sky and bounce terms — which is the case
         that exposes an ambient term faked as a constant. */
      name: 'lit_overcast',
      position: at(19, 1.7, 1.5),
      lookAt: at(3.2, 1.6, -4.2),
      fov: 62,
      hideViewmodel: true,
      note: 'lit_colonnade under a full deck: key dims, sky and bounce carry it.',
      setup: look('overcast', 16.9),
    },
    {
      name: 'lit_night',
      position: at(2.4, 1.7, 13),
      lookAt: at(21, 1.5, 13.4),
      fov: 66,
      hideViewmodel: true,
      note: 'Moon key with the hero spot carrying the frame.',
      setup: look('night', 23.2),
    },
    {
      name: 'lit_shimmer',
      position: at(19.42, 1.7, 1.94),
      lookAt: at(3.2, 1.6, -4.2),
      fov: 62,
      hideViewmodel: true,
      note: 'lit_colonnade nudged 60 cm: shadow edges must land on the same texels.',
      setup: look('golden', 16.9),
    },
  ];
}
