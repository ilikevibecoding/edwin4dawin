/** Barrel export: everything a scene module needs, from one import. */
export * as THREE from 'three';
export { Bricks, brickMaterial, chamferBox, groundPlate, singleBrick, PITCH, PLATE, BRICK, STUD_R, STUD_H } from './brick.js';
export { COLORS, FINISH, KIT, hexToRgb } from './palette.js';
export { Rng, mulberry32, hash11, noise1, fbm1 } from './rng.js';
export { extrudeSVG, flatSVG, svgTexture, svgImage, parseSVG } from './svg.js';
export { makeTextTexture, FONT_STACK } from './overlay.js';
export {
  Starfield,
  BoltPool,
  BrickBurst,
  Sparks,
  Fireball,
  Thruster,
  Beam,
  Hyperspace,
  Smoke,
  hologramMaterial,
  glowSprite,
  additiveMaterial,
  radialTexture,
  flareTexture,
  shake,
} from './fx.js';
export * as ease from './ease.js';
export { standardLights, cameraRig, handheld, nebulaBackdrop } from './stage.js';
