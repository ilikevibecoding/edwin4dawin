// Imperial colours (COORDINATION.md §10). Uses the shared PALETTE entries when the scaffold has added
// them; otherwise the same hex values, so room code always reads `IMP.grey` etc.
import * as THREE from "three";
import { PALETTE } from "../../../materials.js";

const pick = (key, hex) => PALETTE[key] || new THREE.Color(hex);

export const IMP = {
  white: pick("impWhite", "#c9ccd1"),
  grey: pick("impGrey", "#8d9198"),
  mid: pick("impMid", "#5a5e66"),
  dark: pick("impDark", "#33363c"),
  black: pick("impBlack", "#111214"),
  red: pick("impRed", "#ff2a1a"),
  blue: pick("impBlue", "#3a7bff"),
  amber: pick("impAmber", "#ffa028"),
  green: pick("impGreen", "#38d67a"),
  hullLight: pick("impHullLight", "#a7abb1"),
  hullDark: pick("impHullDark", "#6f747c"),
  // legacy shared colours still useful for trim
  steel: PALETTE.steel,
  gunmetal: PALETTE.gunmetal,
  darkMetal: PALETTE.darkMetal,
  rubber: PALETTE.rubber,
};

// Light descriptor colours (0xRRGGBB) for ctx.lights
export const LIGHT = {
  coolWhite: 0xdfe8ff,
  blue: 0x3a7bff,
  red: 0xff2a1a,
  amber: 0xffa028,
  green: 0x38d67a,
  warm: 0xffc78a,
};
