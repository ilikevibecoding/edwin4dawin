// World layout ---------------------------------------------------------------
export const CHUNK_SIZE = 16;          // horizontal size of a chunk column (blocks)
export const CHUNK_HEIGHT = 256;       // world height (blocks): room for Coruscant's skyline and the Death Star
export const SEA_LEVEL = 48;           // y of the topmost water block surface in oceans/rivers
export const TOWN_GROUND = 56;         // y index of the topmost solid block in the flattened town area

// Player dimensions / camera (Minecraft values) --------------------------------
export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE = 1.62;
export const SNEAK_EYE = 1.27;
export const REACH = 4.5;
export const TICK_RATE = 20;           // physics ticks per second (Minecraft = 20)
export const TICK_DT = 1 / TICK_RATE;

// Rendering ------------------------------------------------------------------
export const DEFAULT_RENDER_DISTANCE = 7;  // chunks
export const CLOUD_HEIGHT = 140;
export const BASE_PX = 16;                  // resolution the tile painters work at (Minecraft-style 16x16 layout)
export const HD_SCALE = 4;                  // HD refinement factor (src/render/hdTiles.js)
export const TILE_PX = BASE_PX * HD_SCALE;  // texture resolution per block face in the atlas (64)
export const ATLAS_TILES = 16;              // atlas is ATLAS_TILES x ATLAS_TILES tiles

// Time ------------------------------------------------------------------------
export const DAY_LENGTH_SECONDS = 12 * 60;  // one full day/night cycle in real seconds
export const START_TIME = 0.285;            // fraction of day (0 = midnight, 0.25 = sunrise, 0.5 = noon): early morning glow

// Directions (used by mesher, lighting, raycasts) ------------------------------
// index: 0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z
export const DIRS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
