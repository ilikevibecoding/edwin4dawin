// Imperial design-language palette. Every room and the exterior tint the shared texture families with these
// (vertex colours), so one material serves many surfaces and the whole ship reads as one object.
import * as THREE from "three";

const c = (hex) => new THREE.Color(hex);

export const IMP = {
  // interior plating
  plate: c("#5b6068"),
  plateDark: c("#3b3f45"),
  plateLight: c("#7f858d"),
  plateBlue: c("#4a5262"),
  plateWarm: c("#605c58"),
  black: c("#14161a"),
  trim: c("#22252a"),
  gloss: c("#0b0d10"),
  // metals
  steel: c("#9aa0a8"),
  steelDark: c("#6a7078"),
  gunmetal: c("#4a4e55"),
  darkMetal: c("#2b2e33"),
  // indicator / light colours
  white: c("#e6edff"),
  red: c("#ff3b2f"),
  blue: c("#3f8dff"),
  amber: c("#ffb547"),
  green: c("#3ad17a"),
  violet: c("#8a7cff"),
  cyan: c("#5ad8ff"),
  holo: c("#5fb8ff"),
  hazardYellow: c("#e3b53a"),
  // exterior hull greys
  hullLight: c("#b3b7bd"),
  hullMid: c("#8e9298"),
  hullDark: c("#5f6369"),
  hullBlue: c("#7f8895"),
  hullShadow: c("#3a3d42"),
  // soft goods
  fabricBlack: c("#1e2024"),
  fabricGrey: c("#5a5e66"),
  fabricOlive: c("#5c6150"),
  rubber: c("#ffffff"),
};

// Accent per room family (see PLAN.md §6). Rooms use these for strips, screens and practical lights.
export const ACCENT = {
  bridge: { strip: IMP.white, key: IMP.blue, warn: IMP.red },
  hangar: { strip: IMP.white, key: IMP.amber, warn: IMP.red },
  engineering: { strip: IMP.white, key: IMP.cyan, warn: IMP.amber },
  reactor: { strip: IMP.white, key: IMP.cyan, warn: IMP.red },
  hyperdrive: { strip: IMP.white, key: IMP.violet, warn: IMP.amber },
  medbay: { strip: IMP.white, key: IMP.white, warn: IMP.green },
  detention: { strip: IMP.white, key: IMP.red, warn: IMP.red },
  mess: { strip: IMP.white, key: IMP.amber, warn: IMP.amber },
  crew: { strip: IMP.white, key: IMP.amber, warn: IMP.blue },
  corridor: { strip: IMP.white, key: IMP.white, warn: IMP.red },
};
