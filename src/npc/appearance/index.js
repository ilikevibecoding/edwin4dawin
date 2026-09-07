// W9 character appearance: faces, species, outfits and the deterministic composer.
//
//   import { composeAppearance, describeAppearance, APPEARANCE_STATS } from './npc/appearance/index.js';
//   const app = composeAppearance(seed, { archetype: 'senate_guard', district: 'senate' });
//   const model = buildHumanoid(app.skin, 'none');          // model.js: the 128x64 canvas maps onto the classic UVs
//   attachAppearance(model, app);                           // attach.js: geometry parts + overlays on the same material
//   model.root.scale.set(...app.model.scale);               // gender / species / child silhouette
//   if (app.eyes) attachBlink(npc, { canvas: app.skin, eyes: app.eyes, seed });
//
// Non-humanoid droids (app.model.kind === 'boxes'): buildBoxModel(app.model.parts, app.skin) from model.js, or
// buildAppearanceModel(app) from attach.js which handles both cases.
//
// Dev sheet: open /src/npc/appearance/sheet.html on the dev server, or add ?skinsheet=1 to the game URL once this
// module is imported anywhere in the game (installAppearanceDevTools polls window.game like installShipTraffic).
export { composeAppearance, getAppearance, composeUncached, chooseAppearance, paintAppearance, describeAppearance, describeChoice, parseAppearanceId, paintHeadOnly, canonicalFaceSet, appearanceCache, outfitFitsSpecies, APPEARANCE_STATS, CACHE_CAPACITY } from './compose.js';
export { SPECIES, SPECIES_BY_ID, ALIEN_SPECIES, ORGANIC_SPECIES, helmetOK, capOK } from './species.js';
export { OUTFITS, OUTFITS_BY_ID } from './outfits.js';
export { ARCHETYPES, ARCHETYPE_ALIASES, FACTION_ARCHETYPES, DISTRICTS, archetypeTable, resolveArchetype } from './archetypes.js';
export { SKIN_TONES, EYE_COLOURS, EYE_SHAPES, BROWS, NOSES, MOUTHS, FACIAL_HAIR, HAIR_STYLES, HAIR_COLOURS, AGES, MARKINGS, GENDERS, FACE_COMBINATIONS, EYE_WHITE, PUPIL, EYE_A_X, EYE_B_X, EYE_W, BRIDGE, CANONICAL_MIN_DIFF, pickFace, paintHead, faceId } from './faces.js';
export { Raster, SoftCanvas, createCanvas, setCanvasFactory, hasDomCanvas, encodePNG, rgb, hex, shade, mix, luminance } from './raster.js';
export { REG, PART, TEX_W, TEX_H, SCALE, FACE_PX, FREE_RECTS, ShelfAllocator, boxUV } from './layout.js';
export { WEAR_LEVELS } from './paint.js';
export { installAppearanceDevTools } from './devtools.js';
