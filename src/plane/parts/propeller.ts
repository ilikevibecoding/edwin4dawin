import * as THREE from 'three';
import { Batch, bladeGeometry, partsMaterial, propSectorGeometry, spinnerGeometry, type Surf } from '../geometry';
import { propBlurMaps, SURF } from '../textures';
import { at, DEG, type BuildContext } from './context';

export interface PropellerBuild {
  /** spinner + hub (always turning) */
  propHub: THREE.Mesh;
  /** the three blades (crisp up to ~1000 RPM, gone above ~1650 when the blur disc has taken over) */
  propBlades: THREE.Mesh;
  /** blur disc on its own slow pivot */
  propDisc: THREE.Mesh;
}

/** Blade geometry shared by the loft, the blur textures and the blur sectors (metres). */
export const PROP = { root: 0.16, length: 1.32, rootChord: 0.17, tipChord: 0.10, tipBand: 0.17, blades: 3 } as const;
const TIP_R = PROP.root + PROP.length;

/** Uniforms of one blur mesh (streak sectors or disc), driven per frame by `animatePropeller`. */
interface BlurUniforms {
  /** angle (rad) one blade sweeps during the eye's / camera's integration time; the smear density is chord / (r sweep) */
  uSweep: { value: number };
  /** fraction of the sector's u range the smear covers (sweep / blade spacing), 1e9 for the uniform disc */
  uSpan: { value: number };
  uOpacity: { value: number };
}

interface PropRig {
  blades: THREE.Mesh;
  bladeMat: THREE.MeshStandardMaterial;
  streaks: THREE.Mesh;
  streakU: BlurUniforms;
  disc: THREE.Mesh;
  discU: BlurUniforms;
  pivot: THREE.Group;
}
const RIGS = new WeakMap<THREE.Group, PropRig>();

/**
 * Lit, double-sided material for the blurred propeller: the polar map's alpha holds one blade's angular coverage
 * at that radius; the fragment shader scales it by the number of blades that pass a point during the sweep
 * (2 pi / sweep for the disc, i.e. all three blades every revolution, or 1 blade over its own sweep for a streak)
 * and, for a streak, fades it over the swept fraction of the sector. The polar normal map tilts the shading
 * normal by the blade angle, so the disc is brighter on the side where the blades' backs face the sun.
 */
function propBlurMaterial(maps: ReturnType<typeof propBlurMaps>, u: BlurUniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    map: maps.map, normalMap: maps.normalMap, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    roughness: 0.45, metalness: 0.0, color: 0xffffff,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSweep;\nuniform float uSpan;\nuniform float uOpacity;')
      .replace('#include <alphamap_fragment>', /* glsl */ `
        #include <alphamap_fragment>
        // the map's alpha is one blade's share of the circumference; over a sweep of uSweep radians a point is
        // covered for coverage * 2 pi / uSweep of the time (the disc: uSweep = blade spacing, all blades pass)
        float smear = min(diffuseColor.a * 6.2831853 / max(uSweep, 1e-3), 0.92);
        // a streak fades out behind the blade over the swept fraction of its sector (the eye's fading persistence)
        float tail = clamp(vMapUv.x / uSpan, 0.0, 1.0);
        smear *= pow(1.0 - tail, 0.8);
        diffuseColor.a = smear * uOpacity;
      `);
  };
  mat.customProgramCacheKey = () => 'prop-blur-v1';
  return mat;
}

/**
 * Spinner + hub and the three blades on the `propeller` group, the motion-blur streaks trailing the blades (same
 * group) and the uniform blur disc on `propDiscPivot` (both groups are the model's).
 */
export function buildPropeller(ctx: BuildContext, propeller: THREE.Group, propDiscPivot: THREE.Group): PropellerBuild {
  const { mesh, root, materials } = ctx;
  const { parts } = ctx.mat;
  // ------------------------------------------------------------ propeller: spinner + hub, 3 blades, blur streaks, blur disc
  propeller.position.set(4.62, 0.02, 0);
  root.add(propeller);
  // ogival polished spinner over a dark hub barrel; the blade shanks emerge from the barrel's rim
  const hub = new Batch();
  hub.add(spinnerGeometry(0.27, 0.58, 28), at([0.0, 0, 0]), SURF.spinner);
  hub.add(new THREE.CylinderGeometry(0.27, 0.29, 0.18, 28), at([-0.09, 0, 0], [0, 0, Math.PI / 2]), SURF.darkMetal);
  const propHub = mesh(hub.build(), parts, { parent: propeller, receive: false });
  // three blades: round shank at the hub, widest chord around 40 % radius, elliptically rounded tips. Painted
  // black (non-metal) with the outer 0.17 m yellow; the leading edge of the outer two thirds is eroded to bare
  // metal by rain and spray (a floatplane prop), a thin bright line that reads in the sun. All per-vertex, so
  // the bands follow the twisted planform.
  const blades = new Batch();
  const bladeGeo = bladeGeometry(PROP.length, PROP.rootChord, PROP.tipChord);
  const paint: Surf = { color: 0x1c1d20, roughness: 0.42, metalness: 0.0 };
  const tip: Surf = { color: 0xf2c230, roughness: 0.48, metalness: 0.0 };
  const erosion: Surf = { color: 0xb4b8bc, roughness: 0.32, metalness: 0.9 };
  // tagged by the blade's own UV (u = position around the section starting at the leading edge, v = radial
  // fraction) before the batch bakes each blade's rotation, so the bands need no position lookup
  {
    const uvAttr = bladeGeo.getAttribute('uv') as THREE.BufferAttribute;
    const n = uvAttr.count, col = new Float32Array(n * 3), sf = new Float32Array(n * 2), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const j = uvAttr.getX(i), t = uvAttr.getY(i);
      const s = t > 1 - PROP.tipBand / PROP.length ? tip : t > 0.34 && (j < 0.045 || j > 0.955) ? erosion : paint;
      c.set(s.color);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; sf[i * 2] = s.roughness; sf[i * 2 + 1] = s.metalness;
    }
    bladeGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bladeGeo.setAttribute('aSurf', new THREE.BufferAttribute(sf, 2));
  }
  for (let i = 0; i < PROP.blades; i++) {
    const pivot = new THREE.Matrix4().makeRotationX((i / PROP.blades) * Math.PI * 2);
    blades.add(bladeGeo, pivot.multiply(new THREE.Matrix4().makeTranslation(0, PROP.root, 0)));
  }
  // the blades get their own parts material so they can fade as the RPM rises (animatePropeller cross-fades them
  // into the blur disc between ~1050 and ~1650 RPM, where the blade-passing frequency crosses flicker fusion);
  // drawn just before the blur so the blur composites over them
  const bladeMat = partsMaterial();
  bladeMat.transparent = true;
  materials.push(bladeMat);
  const propBlades = mesh(blades.build(), bladeMat, { parent: propeller, receive: false });
  propBlades.renderOrder = 14;
  // motion-blur streaks: one sector per blade, trailing it over the whole blade spacing (the shader limits the
  // visible tail to the current sweep). They turn with the blades, so the smear always sits behind the blade
  // that made it; the fading end is what a 1/60 s exposure of an idling prop shows.
  const maps = propBlurMaps(PROP.root * 0.6, TIP_R + 0.01, PROP.root, PROP.length, PROP.rootChord, PROP.tipChord, PROP.tipBand);
  const streakU: BlurUniforms = { uSweep: { value: 1.0 }, uSpan: { value: 0.5 }, uOpacity: { value: 0 } };
  const streakMat = propBlurMaterial(maps, streakU);
  materials.push(streakMat);
  const sectors = new Batch();
  const spacing = (Math.PI * 2) / PROP.blades;
  for (let i = 0; i < PROP.blades; i++) sectors.add(propSectorGeometry(PROP.root * 0.6, TIP_R + 0.01, i * spacing, spacing, 20, 6));
  const streaks = new THREE.Mesh(sectors.build(), streakMat);
  streaks.position.x = 0.01;
  streaks.castShadow = false; streaks.receiveShadow = false;
  streaks.renderOrder = 15;
  propeller.add(streaks);
  // The uniform disc hangs off its own pivot at the hub, not off the spinning propeller group: a texture with
  // radial streaks at 2500 RPM turns ~250 degrees per 60 Hz frame and strobed as a flicker at the nose. The
  // pivot turns slowly so the hairline streaks still drift.
  const discU: BlurUniforms = { uSweep: { value: spacing }, uSpan: { value: 1e9 }, uOpacity: { value: 0 } };
  const discMat = propBlurMaterial(maps, discU);
  materials.push(discMat);
  const propDisc = new THREE.Mesh(propSectorGeometry(PROP.root * 0.6, TIP_R + 0.01, 0, Math.PI * 2, 64, 6), discMat);
  propDisc.position.x = 0.05;
  propDisc.castShadow = false; propDisc.receiveShadow = false;
  propDisc.renderOrder = 15;
  propDiscPivot.position.copy(propeller.position);
  propDiscPivot.add(propDisc);
  root.add(propDiscPivot);
  RIGS.set(propeller, { blades: propBlades, bladeMat, streaks, streakU, disc: propDisc, discU, pivot: propDiscPivot });
  return { propHub, propBlades, propDisc };
}

/**
 * RPM states of the propeller (called from animate): the propeller group turns at the engine speed; below the
 * flicker-fusion band (blade-passing frequency 3 rpm / 60 < ~50 Hz, i.e. under ~1000 RPM) the blades are drawn
 * crisp with a streak of motion smear behind each one whose length is the angle swept in 1/60 s and whose density
 * is chord / (r sweep); across ~1050-1650 RPM the blades and streaks fade into the uniform disc, which carries the
 * time-averaged coverage (3 chord / 2 pi r) and a sun-angle-dependent shading from the blade-tilt normal map.
 */
export function animatePropeller(propeller: THREE.Group, rpm: number, dt: number): void {
  const rig = RIGS.get(propeller);
  if (!rig) return;
  propeller.rotation.x += rpm * (Math.PI * 2 / 60) * dt;
  rig.pivot.rotation.x += 1.7 * dt;
  const fused = THREE.MathUtils.smoothstep(rpm, 1050, 1650);
  const turning = THREE.MathUtils.smoothstep(rpm, 120, 420);
  // the blade's angular travel during the eye's integration time (~1/60 s)
  const sweepDeg = Math.min(rpm * 6 / 60, 118);
  const spacing = (Math.PI * 2) / PROP.blades;
  rig.bladeMat.opacity = 1 - fused;
  rig.blades.visible = fused < 0.999;
  rig.blades.castShadow = fused < 0.5;
  rig.streakU.uSweep.value = Math.max(sweepDeg * DEG, 0.02);
  rig.streakU.uSpan.value = Math.max((sweepDeg * DEG) / spacing, 0.02);
  rig.streakU.uOpacity.value = turning * (1 - fused);
  rig.streaks.visible = rig.streakU.uOpacity.value > 0.002;
  rig.discU.uOpacity.value = fused;
  rig.disc.visible = fused > 0.002;
}
