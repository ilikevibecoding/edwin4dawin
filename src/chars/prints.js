/*
 * Hand-authored SVG printing for every character in the film.
 *
 * FACES  -- viewBox "0 0 512 256". The texture wraps the whole head cylinder:
 *           x = 256 is dead centre of the FRONT of the head, and one world unit
 *           of arc is 136 px, so the straight-on silhouette runs x 195..317 and
 *           anything past x 150 / 360 curls round to the back. Art therefore
 *           lives in 185..327, with the eye line at y ~ 100 (heads are 256 px
 *           tall = 1.2 units). The head caps sample the top-left pixel, so the
 *           corners must stay the plain skin colour.
 *
 * TORSOS -- viewBox "0 0 128 192", one atlas cell, filled edge to edge. The
 *           torso geometry tapers 1.48 -> 1.05 studs going up, so vertical lines
 *           in the print converge on the model: draw shoulders wide, they come
 *           out narrow. Belt line sits at y ~ 156.
 */

// Palette echoes (src/lego/palette.js) so prints stay in the LEGO colour space.
const INK = '#2a1c10';        // print outline brown-black
const BLACK = '#1b2a34';
const TRUE_BLACK = '#0d1216';
const DK_GRAY = '#6c6e68';
const LT_GRAY = '#a0a5a9';
const SILVER = '#a5a9b4';
const WHITE = '#f4f4f4';

// ---------------------------------------------------------------------------
// FACES
// ---------------------------------------------------------------------------

/** Darth Vader: the printed mask. Geometry adds the dome, flare and grille. */
export const FACE_VADER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- mask faceplate, flaring out to the jaw -->
  <path d="M196 18 L316 18 L324 104 L302 174 L284 232 L228 232 L210 174 L188 104 Z"
        fill="#26333c" stroke="#4d585f" stroke-width="3"/>
  <!-- brow band, peaked over the nose -->
  <path d="M192 20 L320 20 L314 66 L256 48 L198 66 Z" fill="#39444c"/>
  <path d="M198 62 L256 46 L314 62" fill="none" stroke="#67727a" stroke-width="4"/>
  <!-- eye lenses: light-grey rim, near-black glass, cold highlight -->
  <g>
    <path d="M203 70 L249 58 L254 114 L207 130 Z" fill="#525d65"/>
    <path d="M209 77 L245 67 L249 107 L212 121 Z" fill="#0c1114"/>
    <path d="M213 81 L242 72 L243 84 L215 92 Z" fill="#2f3b45"/>
    <path d="M309 70 L263 58 L258 114 L305 130 Z" fill="#525d65"/>
    <path d="M303 77 L267 67 L263 107 L300 121 Z" fill="#0c1114"/>
    <path d="M299 81 L270 72 L269 84 L297 92 Z" fill="#2f3b45"/>
  </g>
  <!-- nose ridge -->
  <path d="M248 62 L264 62 L268 138 L244 138 Z" fill="#333f47"/>
  <path d="M256 66 L256 134" stroke="#5d686f" stroke-width="3"/>
  <!-- cheek tusks flanking the vocoder -->
  <path d="M212 132 L236 140 L240 200 L220 210 Z" fill="#313d45"/>
  <path d="M300 132 L276 140 L272 200 L292 210 Z" fill="#313d45"/>
  <!-- vocoder grille -->
  <path d="M232 140 L280 140 L275 198 L237 198 Z" fill="#0e1418"/>
  <g stroke="#6a757c" stroke-width="4">
    <path d="M241 145 L239 194"/>
    <path d="M250 144 L249 195"/>
    <path d="M262 144 L263 195"/>
    <path d="M271 145 L273 194"/>
  </g>
  <!-- chin plate -->
  <path d="M230 202 L282 202 L278 230 L234 230 Z" fill="#2b373f"/>
  <path d="M234 206 L278 206" stroke="#59646b" stroke-width="3"/>
</svg>`;

/** Leia: level brows, firm mouth. Determined, not sweet. */
export const FACE_LEIA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- hair line peeking out under the hood, plus side sweeps -->
  <path d="M186 4 Q256 -14 326 4 L322 34 Q256 12 190 34 Z" fill="#3a2412"/>
  <path d="M186 6 L192 96 L204 74 L200 20 Z" fill="#3a2412"/>
  <path d="M326 6 L320 96 L308 74 L312 20 Z" fill="#3a2412"/>
  <!-- brows: straight and low = determined -->
  <g stroke="#4a2f16" stroke-width="7" stroke-linecap="round" fill="none">
    <path d="M204 78 Q222 70 242 74"/>
    <path d="M308 78 Q290 70 270 74"/>
  </g>
  <!-- eyes with lashes -->
  <g fill="${INK}">
    <ellipse cx="222" cy="106" rx="11" ry="14"/>
    <ellipse cx="290" cy="106" rx="11" ry="14"/>
  </g>
  <g stroke="${INK}" stroke-width="4" stroke-linecap="round">
    <path d="M209 96 L204 90"/>
    <path d="M303 96 L308 90"/>
  </g>
  <g fill="#ffffff" opacity="0.9">
    <circle cx="226" cy="101" r="3.4"/><circle cx="294" cy="101" r="3.4"/>
  </g>
  <!-- nose shadow + firm mouth -->
  <path d="M254 128 Q248 142 258 146" fill="none" stroke="#c9a52c" stroke-width="4"/>
  <path d="M234 168 Q256 160 278 168 Q256 178 234 168 Z" fill="#a3423a"/>
  <path d="M234 168 Q256 163 278 168" fill="none" stroke="#7d2b28" stroke-width="2.5"/>
  <!-- cheek + chin shaping -->
  <g fill="none" stroke="#d8b02f" stroke-width="3" opacity="0.75">
    <path d="M206 128 Q210 152 224 166"/>
    <path d="M306 128 Q302 152 288 166"/>
    <path d="M240 196 Q256 204 272 196"/>
  </g>
</svg>`;

/** Luke, farm boy: young, slight smile. */
export const FACE_LUKE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <g stroke="#6b4a1c" stroke-width="8" stroke-linecap="round" fill="none">
    <path d="M203 80 Q222 70 243 76"/>
    <path d="M309 80 Q290 70 269 76"/>
  </g>
  <g fill="${INK}">
    <ellipse cx="222" cy="108" rx="12" ry="15"/>
    <ellipse cx="290" cy="108" rx="12" ry="15"/>
  </g>
  <g fill="#ffffff" opacity="0.92">
    <circle cx="226" cy="103" r="4"/><circle cx="294" cy="103" r="4"/>
  </g>
  <!-- nose -->
  <path d="M253 126 Q246 142 257 148" fill="none" stroke="#c9a52c" stroke-width="4"/>
  <!-- slight smile, upturned at the corners -->
  <path d="M226 162 Q256 188 286 162 Q256 176 226 162 Z" fill="#3a2213"/>
  <g stroke="#3a2213" stroke-width="4" stroke-linecap="round" fill="none">
    <path d="M226 162 Q222 156 220 152"/>
    <path d="M286 162 Q290 156 292 152"/>
  </g>
  <!-- sandy fringe shading where the hairpiece meets the head -->
  <path d="M184 2 Q256 -16 328 2 L324 30 Q256 6 188 30 Z" fill="#c99a3e" opacity="0.85"/>
</svg>`;

/** Luke / rebel pilot: helmet chin strap, comms mic, gritted determination. */
export const FACE_PILOT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- helmet ear cups and chin strap running down both sides -->
  <path d="M168 40 L196 44 L200 150 L172 158 Z" fill="${WHITE}" stroke="${DK_GRAY}" stroke-width="3"/>
  <path d="M344 40 L316 44 L312 150 L340 158 Z" fill="${WHITE}" stroke="${DK_GRAY}" stroke-width="3"/>
  <path d="M196 46 L200 148 Q216 196 256 208 Q296 196 312 148 L316 46" fill="none"
        stroke="#c8ccd0" stroke-width="9"/>
  <path d="M196 46 L200 148 Q216 196 256 208 Q296 196 312 148 L316 46" fill="none"
        stroke="${DK_GRAY}" stroke-width="2.5"/>
  <!-- brows -->
  <g stroke="#5c3d16" stroke-width="8" stroke-linecap="round" fill="none">
    <path d="M208 82 Q224 72 244 78"/>
    <path d="M304 82 Q288 72 268 78"/>
  </g>
  <g fill="${INK}">
    <ellipse cx="223" cy="110" rx="11" ry="14"/>
    <ellipse cx="289" cy="110" rx="11" ry="14"/>
  </g>
  <g fill="#ffffff" opacity="0.9">
    <circle cx="227" cy="105" r="3.6"/><circle cx="293" cy="105" r="3.6"/>
  </g>
  <path d="M253 128 Q246 142 257 148" fill="none" stroke="#c9a52c" stroke-width="4"/>
  <path d="M230 166 L282 166 Q256 182 230 166 Z" fill="#3a2213"/>
  <!-- comms mic on the left cheek -->
  <path d="M200 150 Q214 168 226 172" fill="none" stroke="#4b5257" stroke-width="6"/>
  <ellipse cx="230" cy="174" rx="12" ry="9" fill="#3b4247" stroke="${LT_GRAY}" stroke-width="2"/>
</svg>`;

/** Obi-Wan the hermit: white beard, hooded eyes, weathered. */
export const FACE_OBIWAN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- beard: jaw to jaw, past the chin, with sideburns up to the temples -->
  <path d="M192 62 L204 56 L206 120 Q206 168 226 196 Q256 224 286 196 Q306 168 306 120
           L308 56 L320 62 L318 140 Q312 206 256 240 Q200 206 194 140 Z" fill="#e8e8e2"/>
  <path d="M206 118 Q206 166 226 194 Q256 220 286 194 Q306 166 306 118
           Q286 136 256 136 Q226 136 206 118 Z" fill="#dededa"/>
  <!-- moustache -->
  <path d="M216 138 Q256 128 296 138 Q292 168 256 162 Q220 168 216 138 Z" fill="#f2f2ee"/>
  <path d="M256 140 Q248 152 256 160" fill="none" stroke="#c9c9c2" stroke-width="3"/>
  <!-- beard strands -->
  <g stroke="#c4c4bc" stroke-width="3" fill="none" opacity="0.9">
    <path d="M228 176 Q234 202 244 220"/>
    <path d="M256 178 L256 228"/>
    <path d="M284 176 Q278 202 268 220"/>
    <path d="M212 130 Q214 168 228 190"/>
    <path d="M300 130 Q298 168 284 190"/>
  </g>
  <!-- mouth in the beard -->
  <path d="M238 158 Q256 168 274 158 Q256 172 238 158 Z" fill="#5d4636"/>
  <!-- heavy brows -->
  <g stroke="#dededa" stroke-width="10" stroke-linecap="round" fill="none">
    <path d="M204 76 Q224 66 246 74"/>
    <path d="M308 76 Q288 66 266 74"/>
  </g>
  <!-- eyes, hooded -->
  <g fill="${INK}">
    <ellipse cx="224" cy="104" rx="10" ry="12"/>
    <ellipse cx="288" cy="104" rx="10" ry="12"/>
  </g>
  <g fill="#ffffff" opacity="0.85">
    <circle cx="227" cy="100" r="3"/><circle cx="291" cy="100" r="3"/>
  </g>
  <!-- crow's feet and creases -->
  <g stroke="#b8912a" stroke-width="3" fill="none" opacity="0.85">
    <path d="M206 96 L214 100"/><path d="M306 96 L298 100"/>
    <path d="M208 112 L216 110"/><path d="M304 112 L296 110"/>
    <path d="M212 60 Q232 52 250 58"/><path d="M300 60 Q280 52 262 58"/>
    <path d="M250 118 Q244 130 252 136"/>
  </g>
</svg>`;

/** Stormtrooper helmet print: lenses, brow, frown vent, tear vents, ear cups. */
export const FACE_TROOPER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- helmet shell shading so the sides read as curved armour -->
  <path d="M150 0 L186 0 L192 256 L150 256 Z" fill="#dcdcd6"/>
  <path d="M326 0 L362 0 L362 256 L320 256 Z" fill="#dcdcd6"/>
  <!-- brow ridge -->
  <path d="M186 36 Q256 16 326 36 L322 62 Q256 44 190 62 Z" fill="#e2e2dc"
        stroke="${DK_GRAY}" stroke-width="2.5"/>
  <!-- eye lenses -->
  <g fill="${TRUE_BLACK}">
    <path d="M196 66 Q222 58 246 66 L250 116 Q222 128 200 118 Z"/>
    <path d="M316 66 Q290 58 266 66 L262 116 Q290 128 312 118 Z"/>
  </g>
  <g fill="#39414a" opacity="0.85">
    <path d="M202 72 Q222 66 242 72 L243 82 Q222 76 204 84 Z"/>
    <path d="M310 72 Q290 66 270 72 L269 82 Q290 76 308 84 Z"/>
  </g>
  <!-- black brow line linking the lenses over the nose -->
  <path d="M246 64 L266 64 L264 88 L248 88 Z" fill="${TRUE_BLACK}"/>
  <!-- nose ridge -->
  <path d="M248 88 L264 88 L268 132 L244 132 Z" fill="#e8e8e2" stroke="${DK_GRAY}" stroke-width="2"/>
  <!-- tear-drop vents -->
  <g fill="${TRUE_BLACK}">
    <path d="M212 128 L228 128 L222 156 L214 156 Z"/>
    <path d="M300 128 L284 128 L290 156 L298 156 Z"/>
  </g>
  <!-- the frown: black vent with six teeth -->
  <path d="M226 140 L286 140 L280 196 L232 196 Z" fill="${TRUE_BLACK}"/>
  <g stroke="#e8e8e2" stroke-width="5">
    <path d="M235 148 L237 190"/>
    <path d="M245 146 L246 191"/>
    <path d="M256 145 L256 192"/>
    <path d="M267 146 L266 191"/>
    <path d="M277 148 L275 190"/>
  </g>
  <!-- chin plate + neck seal -->
  <path d="M224 198 Q256 214 288 198 L286 222 Q256 234 226 222 Z" fill="#e8e8e2"
        stroke="${DK_GRAY}" stroke-width="2.5"/>
  <path d="M186 226 Q256 250 326 226 L326 256 L186 256 Z" fill="${BLACK}"/>
  <!-- ear cups -->
  <g fill="#c9c9c2" stroke="${DK_GRAY}" stroke-width="3">
    <path d="M178 74 L200 80 L200 150 L178 158 Z"/>
    <path d="M334 74 L312 80 L312 150 L334 158 Z"/>
  </g>
  <g fill="${DK_GRAY}">
    <rect x="182" y="92" width="14" height="10"/>
    <rect x="182" y="112" width="14" height="10"/>
    <rect x="316" y="92" width="14" height="10"/>
    <rect x="316" y="112" width="14" height="10"/>
  </g>
  <!-- cheek seams -->
  <g fill="none" stroke="${DK_GRAY}" stroke-width="2.5">
    <path d="M200 118 Q206 176 226 206"/>
    <path d="M312 118 Q306 176 286 206"/>
  </g>
</svg>`;

/** Rebel fleet trooper: moustache, chin strap of the tall helmet. */
export const FACE_REBEL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- helmet chin strap -->
  <path d="M190 20 L204 22 L206 150 Q222 190 256 200 Q290 190 306 150 L308 22 L322 20
           L320 156 Q296 208 256 216 Q216 208 192 156 Z" fill="#5f6a72" opacity="0.95"/>
  <path d="M204 24 L206 148 Q222 186 256 196 Q290 186 306 148 L308 24" fill="none"
        stroke="#8b959b" stroke-width="3"/>
  <g stroke="#4c3316" stroke-width="8" stroke-linecap="round" fill="none">
    <path d="M210 80 Q226 70 246 76"/>
    <path d="M302 80 Q286 70 266 76"/>
  </g>
  <g fill="${INK}">
    <ellipse cx="224" cy="108" rx="11" ry="14"/>
    <ellipse cx="288" cy="108" rx="11" ry="14"/>
  </g>
  <g fill="#ffffff" opacity="0.9">
    <circle cx="228" cy="103" r="3.5"/><circle cx="292" cy="103" r="3.5"/>
  </g>
  <path d="M253 126 Q246 140 257 146" fill="none" stroke="#c9a52c" stroke-width="4"/>
  <!-- moustache -->
  <path d="M222 148 Q256 138 290 148 Q288 172 256 164 Q224 172 222 148 Z" fill="#4c3316"/>
  <path d="M256 150 Q250 158 256 164" fill="none" stroke="#2f1f0c" stroke-width="3"/>
  <!-- mouth under it -->
  <path d="M238 172 Q256 180 274 172 Q256 186 238 172 Z" fill="#3a2213"/>
</svg>`;

/** Imperial officer: stern, humourless. */
export const FACE_OFFICER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- angry brows, slanting down toward the nose -->
  <g stroke="#3f2a12" stroke-width="9" stroke-linecap="round" fill="none">
    <path d="M204 72 L246 88"/>
    <path d="M308 72 L266 88"/>
  </g>
  <g fill="${INK}">
    <ellipse cx="222" cy="112" rx="10" ry="13"/>
    <ellipse cx="290" cy="112" rx="10" ry="13"/>
  </g>
  <g fill="#ffffff" opacity="0.85">
    <circle cx="225" cy="108" r="3"/><circle cx="293" cy="108" r="3"/>
  </g>
  <!-- eye bags / hard cheekbones -->
  <g stroke="#c19a26" stroke-width="3.5" fill="none">
    <path d="M210 126 Q222 134 236 128"/>
    <path d="M302 126 Q290 134 276 128"/>
    <path d="M206 140 Q214 168 228 182"/>
    <path d="M306 140 Q298 168 284 182"/>
  </g>
  <path d="M252 122 Q244 140 256 148" fill="none" stroke="#c19a26" stroke-width="4"/>
  <!-- thin, flat, disapproving mouth -->
  <path d="M228 176 L284 176 L282 184 L230 184 Z" fill="#5a3a24"/>
  <path d="M228 176 Q256 170 284 176" fill="none" stroke="#7a5433" stroke-width="3"/>
  <!-- scar over the right brow -->
  <path d="M300 52 L312 84" fill="none" stroke="#c07a4a" stroke-width="3.5"/>
  <!-- sideburns -->
  <path d="M188 8 L204 14 L206 78 L190 84 Z" fill="#3f2a12" opacity="0.9"/>
  <path d="M324 8 L308 14 L306 78 L322 84 Z" fill="#3f2a12" opacity="0.9"/>
</svg>`;

/** C-3PO: gold plating, sunken photoreceptors, mouth grille. */
export const FACE_C3PO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <!-- face plate seam -->
  <path d="M192 0 L320 0 L326 120 Q302 216 256 246 Q210 216 186 120 Z"
        fill="#e2c469" stroke="#8f7526" stroke-width="3"/>
  <!-- brow bar -->
  <path d="M192 46 Q256 28 320 46 L316 72 Q256 56 196 72 Z" fill="#c9a949"
        stroke="#8f7526" stroke-width="2.5"/>
  <!-- photoreceptor sockets -->
  <g fill="#2b2415" stroke="#8f7526" stroke-width="3">
    <circle cx="220" cy="106" r="26"/>
    <circle cx="292" cy="106" r="26"/>
  </g>
  <g fill="#f6e6a2">
    <circle cx="220" cy="106" r="15"/>
    <circle cx="292" cy="106" r="15"/>
  </g>
  <g fill="#ffffff" opacity="0.85">
    <circle cx="215" cy="100" r="5"/><circle cx="287" cy="100" r="5"/>
  </g>
  <!-- nose plate -->
  <path d="M247 128 L265 128 L269 168 L243 168 Z" fill="#c9a949" stroke="#8f7526" stroke-width="2"/>
  <!-- mouth grille -->
  <path d="M222 174 L290 174 L284 208 L228 208 Z" fill="#2b2415"/>
  <g stroke="#e2c469" stroke-width="4">
    <path d="M231 180 L233 202"/><path d="M242 179 L243 203"/>
    <path d="M256 178 L256 204"/>
    <path d="M270 179 L269 203"/><path d="M281 180 L279 202"/>
  </g>
  <!-- cheek panel lines + rivets -->
  <g fill="none" stroke="#8f7526" stroke-width="2.5">
    <path d="M196 78 Q200 150 222 196"/>
    <path d="M316 78 Q312 150 290 196"/>
    <path d="M236 218 Q256 230 276 218"/>
  </g>
  <g fill="#8f7526">
    <circle cx="200" cy="90" r="4"/><circle cx="312" cy="90" r="4"/>
    <circle cx="204" cy="150" r="4"/><circle cx="308" cy="150" r="4"/>
  </g>
</svg>`;

/** Jawa: nothing but two glowing eyes in the dark of the hood. */
export const FACE_JAWA = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 256">
  <defs>
    <radialGradient id="jg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff6b0"/>
      <stop offset="45%" stop-color="#ffd21e"/>
      <stop offset="100%" stop-color="#7a5a00" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- hood shadow: the whole face is in darkness -->
  <path d="M170 0 L342 0 L336 130 Q296 226 256 246 Q216 226 176 130 Z" fill="#0a0d10"/>
  <g fill="url(#jg)">
    <ellipse cx="224" cy="112" rx="34" ry="26"/>
    <ellipse cx="288" cy="112" rx="34" ry="26"/>
  </g>
  <g fill="#fffbd8">
    <ellipse cx="224" cy="112" rx="14" ry="9"/>
    <ellipse cx="288" cy="112" rx="14" ry="9"/>
  </g>
  <!-- suggestion of a snout under the hood -->
  <path d="M240 158 Q256 170 272 158" fill="none" stroke="#1d232a" stroke-width="4"/>
</svg>`;

// ---------------------------------------------------------------------------
// TORSOS
// ---------------------------------------------------------------------------

/** Vader: chest control box, shoulder armour, wide belt with boxes. */
export const TORSO_VADER_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <!-- neck ring + armour collar -->
  <rect x="0" y="0" width="128" height="192" fill="${BLACK}"/>
  <path d="M40 0 L88 0 L88 12 Q64 22 40 12 Z" fill="#39444c"/>
  <path d="M4 6 L36 0 L34 40 L2 52 Z" fill="#22303a" stroke="#3f4a52" stroke-width="1.6"/>
  <path d="M124 6 L92 0 L94 40 L126 52 Z" fill="#22303a" stroke="#3f4a52" stroke-width="1.6"/>
  <!-- chest plate seam -->
  <path d="M22 26 Q64 14 106 26 L104 96 L24 96 Z" fill="#202d36" stroke="#454f57" stroke-width="1.8"/>
  <!-- control box -->
  <rect x="34" y="34" width="60" height="46" rx="4" fill="#2c383f" stroke="#69737a" stroke-width="2"/>
  <rect x="38" y="38" width="52" height="16" rx="2" fill="#101820"/>
  <g>
    <rect x="41" y="41" width="9" height="10" fill="#c91a09"/>
    <rect x="53" y="41" width="9" height="10" fill="#0055bf"/>
    <rect x="65" y="41" width="9" height="10" fill="#4b9f4a"/>
    <rect x="77" y="41" width="9" height="10" fill="#f2cd37"/>
  </g>
  <g fill="${SILVER}">
    <rect x="39" y="58" width="20" height="4"/>
    <rect x="39" y="66" width="14" height="4"/>
    <rect x="69" y="58" width="20" height="4"/>
  </g>
  <g fill="#c91a09"><circle cx="63" cy="68" r="3"/></g>
  <g fill="${LT_GRAY}"><circle cx="76" cy="68" r="3"/><circle cx="85" cy="68" r="3"/></g>
  <!-- ribbed abdomen -->
  <g stroke="#3d474f" stroke-width="2.5" fill="none">
    <path d="M28 104 Q64 98 100 104"/>
    <path d="M28 114 Q64 108 100 114"/>
    <path d="M28 124 Q64 118 100 124"/>
    <path d="M28 134 Q64 128 100 134"/>
  </g>
  <!-- belt -->
  <rect x="0" y="144" width="128" height="26" fill="#141f27" stroke="#3d474f" stroke-width="1.5"/>
  <rect x="48" y="146" width="32" height="22" fill="#2c383f" stroke="${SILVER}" stroke-width="2"/>
  <g fill="${SILVER}"><rect x="56" y="152" width="16" height="4"/><rect x="56" y="160" width="16" height="3"/></g>
  <g fill="#39444c" stroke="#5c666e" stroke-width="1.4">
    <rect x="10" y="147" width="24" height="20" rx="2"/>
    <rect x="94" y="147" width="24" height="20" rx="2"/>
  </g>
  <rect x="0" y="170" width="128" height="22" fill="#18242c"/>
</svg>`;

export const TORSO_VADER_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="${BLACK}"/>
  <path d="M20 20 Q64 8 108 20 L104 140 L24 140 Z" fill="#202d36" stroke="#454f57" stroke-width="1.8"/>
  <rect x="46" y="30" width="36" height="60" rx="3" fill="#2c383f" stroke="#5c666e" stroke-width="1.8"/>
  <g stroke="#3d474f" stroke-width="2.5" fill="none">
    <path d="M30 100 Q64 94 98 100"/><path d="M30 112 Q64 106 98 112"/>
    <path d="M30 124 Q64 118 98 124"/>
  </g>
  <rect x="0" y="144" width="128" height="26" fill="#141f27" stroke="#3d474f" stroke-width="1.5"/>
  <rect x="0" y="170" width="128" height="22" fill="#18242c"/>
</svg>`;

/** Leia: white senatorial gown, hood yoke, silver disc belt. */
export const TORSO_LEIA_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="${WHITE}"/>
  <!-- hood yoke over the shoulders -->
  <path d="M0 0 L128 0 L128 34 Q64 46 0 34 Z" fill="#e6e6de" stroke="#c9c9c0" stroke-width="1.6"/>
  <!-- high collar -->
  <path d="M42 0 Q64 16 86 0 L86 10 Q64 26 42 10 Z" fill="#d8d8d0" stroke="#bcbcb2" stroke-width="1.6"/>
  <!-- gown folds -->
  <g stroke="#dcdcd3" stroke-width="3" fill="none">
    <path d="M30 40 Q26 100 32 148"/>
    <path d="M46 42 Q44 100 46 148"/>
    <path d="M64 44 L64 148"/>
    <path d="M82 42 Q84 100 82 148"/>
    <path d="M98 40 Q102 100 96 148"/>
  </g>
  <g stroke="#cfcfc6" stroke-width="1.6" fill="none">
    <path d="M22 52 Q64 60 106 52"/>
    <path d="M20 92 Q64 100 108 92"/>
  </g>
  <!-- silver disc belt -->
  <rect x="0" y="148" width="128" height="18" fill="#e0e0d8"/>
  <g fill="${SILVER}" stroke="#7f838c" stroke-width="1.4">
    <path d="M8 150 L20 150 L24 157 L20 164 L8 164 L4 157 Z"/>
    <path d="M28 150 L40 150 L44 157 L40 164 L28 164 L24 157 Z"/>
    <path d="M48 150 L60 150 L64 157 L60 164 L48 164 L44 157 Z"/>
    <path d="M68 150 L80 150 L84 157 L80 164 L68 164 L64 157 Z"/>
    <path d="M88 150 L100 150 L104 157 L100 164 L88 164 L84 157 Z"/>
    <path d="M108 150 L120 150 L124 157 L120 164 L108 164 L104 157 Z"/>
  </g>
  <!-- skirt below the belt -->
  <rect x="0" y="166" width="128" height="26" fill="#eeeee6"/>
  <g stroke="#dcdcd3" stroke-width="3" fill="none">
    <path d="M34 168 L32 192"/><path d="M64 168 L64 192"/><path d="M94 168 L96 192"/>
  </g>
</svg>`;

/** Luke: cream tunic wrap, brown belt. */
export const TORSO_LUKE_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#e8e6da"/>
  <!-- collar / V-neck -->
  <path d="M40 0 L64 34 L88 0 L96 0 L96 14 L64 48 L32 14 L32 0 Z" fill="#d6d2c0"/>
  <path d="M64 34 L88 0 L104 6 L96 30 L64 48 Z" fill="#dcd8c8" stroke="#bfb9a4" stroke-width="1.6"/>
  <path d="M64 34 L40 0 L24 6 L32 30 L64 48 Z" fill="#e4e0d2" stroke="#bfb9a4" stroke-width="1.6"/>
  <!-- undershirt in the V -->
  <path d="M46 6 L64 30 L82 6 Q64 18 46 6 Z" fill="#c9c2ab"/>
  <!-- tunic wrap: right panel crosses over the left -->
  <path d="M64 44 L106 30 L108 148 L64 148 Z" fill="#eeece0" stroke="#c6c0aa" stroke-width="1.8"/>
  <path d="M64 44 L22 30 L20 148 L64 148 Z" fill="#e2dfd0" stroke="#c6c0aa" stroke-width="1.8"/>
  <g stroke="#cfc9b4" stroke-width="2.4" fill="none">
    <path d="M34 56 Q32 104 36 142"/>
    <path d="M50 60 Q48 106 50 144"/>
    <path d="M78 60 Q80 106 78 144"/>
    <path d="M94 56 Q96 104 92 142"/>
  </g>
  <!-- belt -->
  <rect x="0" y="146" width="128" height="24" fill="#8c5c3b" stroke="#5f3d25" stroke-width="1.6"/>
  <rect x="46" y="148" width="36" height="20" fill="#a5a9b4" stroke="#6f737c" stroke-width="2"/>
  <rect x="54" y="153" width="20" height="10" fill="#8b8f98"/>
  <g fill="#6f4726">
    <rect x="14" y="150" width="18" height="16" rx="2"/>
    <rect x="96" y="150" width="18" height="16" rx="2"/>
  </g>
  <!-- tunic hem below the belt -->
  <rect x="0" y="170" width="128" height="22" fill="#e4e1d4"/>
  <g stroke="#cfc9b4" stroke-width="2.4" fill="none">
    <path d="M40 172 L38 192"/><path d="M64 172 L64 192"/><path d="M88 172 L90 192"/>
  </g>
</svg>`;

/** Rebel pilot / Luke pilot: orange flight suit, harness, chest box. */
export const TORSO_PILOT_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#f07f16"/>
  <!-- collar of the flak vest -->
  <path d="M34 0 L64 20 L94 0 L94 12 L64 34 L34 12 Z" fill="#c96a10"/>
  <path d="M46 0 L64 18 L82 0 Z" fill="#e4e4dc"/>
  <!-- white harness straps -->
  <g fill="#e8e8e0" stroke="#b9b9b0" stroke-width="1.4">
    <path d="M30 12 L44 8 L74 150 L58 154 Z"/>
    <path d="M98 12 L84 8 L54 150 L70 154 Z"/>
  </g>
  <!-- life-support chest box -->
  <rect x="28" y="52" width="46" height="40" rx="3" fill="#5b6165" stroke="#2f353a" stroke-width="2"/>
  <rect x="32" y="56" width="38" height="14" rx="2" fill="#20262b"/>
  <g>
    <rect x="35" y="59" width="7" height="8" fill="#c91a09"/>
    <rect x="45" y="59" width="7" height="8" fill="#f2cd37"/>
    <rect x="55" y="59" width="7" height="8" fill="#4b9f4a"/>
  </g>
  <g fill="${SILVER}">
    <rect x="33" y="76" width="16" height="4"/>
    <rect x="33" y="84" width="10" height="4"/>
    <circle cx="60" cy="80" r="4"/><circle cx="68" cy="85" r="3"/>
  </g>
  <!-- right chest pocket -->
  <rect x="82" y="54" width="26" height="26" rx="2" fill="#d97512" stroke="#a75708" stroke-width="1.6"/>
  <path d="M82 62 L108 62" stroke="#a75708" stroke-width="1.6"/>
  <!-- zip -->
  <path d="M64 34 L64 146" stroke="#c96a10" stroke-width="3"/>
  <!-- belt with pouches -->
  <rect x="0" y="146" width="128" height="24" fill="#4a4f52" stroke="#2b2f33" stroke-width="1.6"/>
  <rect x="50" y="148" width="28" height="20" fill="${SILVER}" stroke="#6f737c" stroke-width="1.8"/>
  <g fill="#37474f" stroke="#20262b" stroke-width="1.4">
    <rect x="12" y="149" width="22" height="18" rx="2"/>
    <rect x="94" y="149" width="22" height="18" rx="2"/>
  </g>
  <rect x="0" y="170" width="128" height="22" fill="#e07211"/>
</svg>`;

export const TORSO_PILOT_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#f07f16"/>
  <g fill="#e8e8e0" stroke="#b9b9b0" stroke-width="1.4">
    <path d="M28 6 L44 2 L48 148 L32 150 Z"/>
    <path d="M100 6 L84 2 L80 148 L96 150 Z"/>
    <rect x="32" y="60" width="64" height="14"/>
  </g>
  <rect x="40" y="86" width="48" height="52" rx="3" fill="#5b6165" stroke="#2f353a" stroke-width="2"/>
  <g fill="#20262b"><rect x="46" y="92" width="36" height="10"/><rect x="46" y="108" width="36" height="8"/></g>
  <rect x="0" y="146" width="128" height="24" fill="#4a4f52" stroke="#2b2f33" stroke-width="1.6"/>
  <rect x="0" y="170" width="128" height="22" fill="#e07211"/>
</svg>`;

/** Obi-Wan: layered Jedi robe over tunic, wide leather belt. */
export const TORSO_OBIWAN_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#8c6a42"/>
  <!-- inner tunic, cream, crossed over -->
  <path d="M40 0 L64 40 L88 0 L88 10 L64 54 L40 10 Z" fill="#c9b98c"/>
  <path d="M64 46 L92 20 L96 150 L64 150 Z" fill="#d8c79a" stroke="#a08f66" stroke-width="1.6"/>
  <path d="M64 46 L36 20 L32 150 L64 150 Z" fill="#cdbb8c" stroke="#a08f66" stroke-width="1.6"/>
  <!-- outer robe panels -->
  <path d="M0 0 L34 14 L28 150 L0 150 Z" fill="#6f4b28" stroke="#4c3218" stroke-width="1.8"/>
  <path d="M128 0 L94 14 L100 150 L128 150 Z" fill="#6f4b28" stroke="#4c3218" stroke-width="1.8"/>
  <path d="M34 14 L30 150" stroke="#4c3218" stroke-width="2"/>
  <path d="M94 14 L98 150" stroke="#4c3218" stroke-width="2"/>
  <g stroke="#5c3d1f" stroke-width="2.4" fill="none">
    <path d="M12 24 Q8 90 14 148"/>
    <path d="M116 24 Q120 90 114 148"/>
  </g>
  <!-- tunic folds -->
  <g stroke="#b3a071" stroke-width="2.2" fill="none">
    <path d="M48 58 Q46 104 48 146"/>
    <path d="M80 58 Q82 104 80 146"/>
    <path d="M64 54 L64 146"/>
  </g>
  <!-- obi sash + belt -->
  <rect x="0" y="132" width="128" height="14" fill="#c9b98c" opacity="0.9"/>
  <rect x="0" y="146" width="128" height="26" fill="#5f3d25" stroke="#3d2614" stroke-width="1.6"/>
  <rect x="46" y="148" width="34" height="22" fill="#a5a9b4" stroke="#6f737c" stroke-width="2"/>
  <rect x="54" y="154" width="18" height="10" fill="#8b8f98"/>
  <g fill="#4c3218">
    <rect x="16" y="150" width="20" height="18" rx="2"/>
    <rect x="92" y="150" width="20" height="18" rx="2"/>
  </g>
  <!-- robe hem -->
  <rect x="0" y="172" width="128" height="20" fill="#7a5430"/>
</svg>`;

export const TORSO_OBIWAN_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#6f4b28"/>
  <path d="M0 0 L128 0 L128 192 L0 192 Z" fill="#6f4b28"/>
  <g stroke="#4c3218" stroke-width="2.4" fill="none">
    <path d="M24 0 Q20 90 26 172"/>
    <path d="M104 0 Q108 90 102 172"/>
    <path d="M64 0 L64 172"/>
  </g>
  <path d="M0 0 L128 0 L128 28 Q64 40 0 28 Z" fill="#7a5430" stroke="#4c3218" stroke-width="1.8"/>
  <rect x="0" y="146" width="128" height="26" fill="#5f3d25" stroke="#3d2614" stroke-width="1.6"/>
  <rect x="0" y="172" width="128" height="20" fill="#7a5430"/>
</svg>`;

/** Stormtrooper: white plastoid plates, black ab band, grey belt boxes. */
export const TORSO_TROOPER_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="${WHITE}"/>
  <!-- black neck seal -->
  <path d="M34 0 L94 0 L94 14 Q64 26 34 14 Z" fill="${BLACK}"/>
  <!-- shoulder bells -->
  <path d="M0 0 L30 0 L26 44 L0 50 Z" fill="#e8e8e0" stroke="${DK_GRAY}" stroke-width="2"/>
  <path d="M128 0 L98 0 L102 44 L128 50 Z" fill="#e8e8e0" stroke="${DK_GRAY}" stroke-width="2"/>
  <!-- chest plate outline -->
  <path d="M28 18 Q64 32 100 18 L98 104 L30 104 Z" fill="#eeeee6" stroke="${DK_GRAY}" stroke-width="2.2"/>
  <path d="M64 30 L64 104" stroke="${DK_GRAY}" stroke-width="1.8"/>
  <!-- pectoral vent boxes -->
  <rect x="34" y="30" width="24" height="16" rx="2" fill="${TRUE_BLACK}"/>
  <rect x="70" y="30" width="24" height="16" rx="2" fill="${TRUE_BLACK}"/>
  <g fill="${LT_GRAY}">
    <rect x="37" y="34" width="18" height="3"/>
    <rect x="37" y="40" width="12" height="3"/>
    <rect x="73" y="34" width="18" height="3"/>
    <rect x="73" y="40" width="12" height="3"/>
  </g>
  <!-- chest plate detail lines -->
  <g stroke="${DK_GRAY}" stroke-width="1.8" fill="none">
    <path d="M32 58 Q64 68 96 58"/>
    <path d="M34 78 Q64 88 94 78"/>
  </g>
  <!-- abdominal plate -->
  <rect x="22" y="106" width="84" height="36" fill="${TRUE_BLACK}"/>
  <g stroke="#5c666e" stroke-width="2.4">
    <path d="M38 108 L38 140"/><path d="M52 108 L52 140"/>
    <path d="M64 108 L64 140"/>
    <path d="M76 108 L76 140"/><path d="M90 108 L90 140"/>
  </g>
  <path d="M22 106 L106 106" stroke="${DK_GRAY}" stroke-width="2"/>
  <!-- belt -->
  <rect x="0" y="142" width="128" height="26" fill="#eeeee6" stroke="${DK_GRAY}" stroke-width="2"/>
  <rect x="48" y="144" width="32" height="22" fill="${TRUE_BLACK}"/>
  <rect x="55" y="149" width="18" height="12" fill="#5c666e"/>
  <g fill="#4a5259">
    <rect x="12" y="145" width="22" height="20" rx="2"/>
    <rect x="94" y="145" width="22" height="20" rx="2"/>
  </g>
  <!-- hip plates -->
  <path d="M0 168 L128 168 L128 192 L0 192 Z" fill="#e8e8e0"/>
  <path d="M40 168 L40 192" stroke="${DK_GRAY}" stroke-width="2"/>
  <path d="M88 168 L88 192" stroke="${DK_GRAY}" stroke-width="2"/>
</svg>`;

export const TORSO_TROOPER_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="${WHITE}"/>
  <path d="M34 0 L94 0 L94 14 Q64 26 34 14 Z" fill="${BLACK}"/>
  <path d="M24 16 Q64 30 104 16 L102 104 L26 104 Z" fill="#eeeee6" stroke="${DK_GRAY}" stroke-width="2.2"/>
  <path d="M64 26 L64 104" stroke="${DK_GRAY}" stroke-width="1.8"/>
  <rect x="22" y="106" width="84" height="36" fill="${TRUE_BLACK}"/>
  <g stroke="#5c666e" stroke-width="2.4">
    <path d="M42 108 L42 140"/><path d="M64 108 L64 140"/><path d="M86 108 L86 140"/>
  </g>
  <rect x="0" y="142" width="128" height="26" fill="#eeeee6" stroke="${DK_GRAY}" stroke-width="2"/>
  <rect x="44" y="144" width="40" height="22" fill="#4a5259"/>
  <path d="M0 168 L128 168 L128 192 L0 192 Z" fill="#e8e8e0"/>
</svg>`;

/** Rebel fleet trooper: tan flak vest over the blue-grey uniform. */
export const TORSO_REBEL_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#6074a1"/>
  <!-- collar -->
  <path d="M38 0 L64 22 L90 0 L90 10 L64 34 L38 10 Z" fill="#4e6088"/>
  <!-- tan flak vest, open down the middle -->
  <path d="M0 0 L44 10 L40 168 L0 168 Z" fill="#e4cd9e" stroke="#b09a68" stroke-width="2"/>
  <path d="M128 0 L84 10 L88 168 L128 168 Z" fill="#e4cd9e" stroke="#b09a68" stroke-width="2"/>
  <g stroke="#c3ad7c" stroke-width="2" fill="none">
    <path d="M14 20 Q10 92 16 164"/>
    <path d="M114 20 Q118 92 112 164"/>
  </g>
  <!-- vest pockets -->
  <g fill="#d6bd88" stroke="#a8925f" stroke-width="1.6">
    <rect x="8" y="46" width="26" height="24" rx="2"/>
    <rect x="94" y="46" width="26" height="24" rx="2"/>
    <rect x="8" y="88" width="26" height="24" rx="2"/>
    <rect x="94" y="88" width="26" height="24" rx="2"/>
  </g>
  <g stroke="#a8925f" stroke-width="1.6">
    <path d="M8 54 L34 54"/><path d="M94 54 L120 54"/>
    <path d="M8 96 L34 96"/><path d="M94 96 L120 96"/>
  </g>
  <!-- uniform placket + buttons -->
  <path d="M64 30 L64 146" stroke="#4e6088" stroke-width="4"/>
  <g fill="#3d4c6d"><circle cx="64" cy="52" r="3.4"/><circle cx="64" cy="76" r="3.4"/><circle cx="64" cy="100" r="3.4"/></g>
  <!-- belt -->
  <rect x="0" y="146" width="128" height="24" fill="#3d2614" stroke="#241608" stroke-width="1.6"/>
  <rect x="48" y="148" width="32" height="20" fill="${SILVER}" stroke="#6f737c" stroke-width="1.8"/>
  <g fill="#2b1a0c">
    <rect x="16" y="149" width="20" height="18" rx="2"/>
    <rect x="92" y="149" width="20" height="18" rx="2"/>
  </g>
  <rect x="0" y="170" width="128" height="22" fill="#556a95"/>
</svg>`;

/** Imperial officer: olive-grey tunic, rank plaque, code cylinders. */
export const TORSO_OFFICER_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#5c5f52"/>
  <!-- stand-up collar -->
  <path d="M30 0 L98 0 L98 16 Q64 28 30 16 Z" fill="#4b4e42" stroke="#383a30" stroke-width="1.6"/>
  <path d="M40 2 L56 2 L56 12 L40 12 Z" fill="#2b2d26"/>
  <path d="M72 2 L88 2 L88 12 L72 12 Z" fill="#2b2d26"/>
  <!-- tunic front closure, offset to the wearer's right -->
  <path d="M0 6 L54 20 L52 170 L0 170 Z" fill="#666a5a" stroke="#3f4238" stroke-width="1.8"/>
  <path d="M128 6 L60 20 L62 170 L128 170 Z" fill="#5c5f52" stroke="#3f4238" stroke-width="1.8"/>
  <path d="M54 20 L52 170" stroke="#3f4238" stroke-width="2.4"/>
  <!-- rank plaque, 3x2 -->
  <rect x="12" y="42" width="34" height="22" rx="2" fill="#2b2d26" stroke="#8d9182" stroke-width="1.6"/>
  <g>
    <rect x="16" y="46" width="8" height="6" fill="#c91a09"/>
    <rect x="26" y="46" width="8" height="6" fill="#c91a09"/>
    <rect x="36" y="46" width="8" height="6" fill="#0055bf"/>
    <rect x="16" y="55" width="8" height="6" fill="#0055bf"/>
    <rect x="26" y="55" width="8" height="6" fill="#f2cd37"/>
    <rect x="36" y="55" width="8" height="6" fill="#4b9f4a"/>
  </g>
  <!-- code cylinders in the pocket -->
  <g fill="${SILVER}" stroke="#5f636c" stroke-width="1.4">
    <rect x="14" y="72" width="7" height="26" rx="3"/>
    <rect x="25" y="72" width="7" height="26" rx="3"/>
  </g>
  <!-- shoulder seams + folds -->
  <g stroke="#484b3f" stroke-width="2" fill="none">
    <path d="M78 24 Q86 90 80 166"/>
    <path d="M104 20 Q112 90 106 166"/>
    <path d="M22 110 Q20 140 24 166"/>
  </g>
  <!-- belt -->
  <rect x="0" y="146" width="128" height="26" fill="#1b2a34" stroke="#0d1216" stroke-width="1.6"/>
  <rect x="48" y="148" width="32" height="22" fill="#3a3f45" stroke="${SILVER}" stroke-width="1.8"/>
  <rect x="56" y="154" width="16" height="10" fill="#6c6e68"/>
  <rect x="0" y="172" width="128" height="20" fill="#4b4e42"/>
</svg>`;

/** C-3PO: gold plating with the exposed wiring at the midriff. */
export const TORSO_C3PO_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#dcbe61"/>
  <!-- neck collar ring -->
  <path d="M36 0 L92 0 L92 14 Q64 24 36 14 Z" fill="#c9a949" stroke="#8f7526" stroke-width="1.8"/>
  <!-- shoulder plates -->
  <path d="M0 0 L32 4 L28 46 L0 52 Z" fill="#e6ca75" stroke="#8f7526" stroke-width="1.8"/>
  <path d="M128 0 L96 4 L100 46 L128 52 Z" fill="#e6ca75" stroke="#8f7526" stroke-width="1.8"/>
  <!-- chest plates -->
  <path d="M26 18 Q64 32 102 18 L100 92 L28 92 Z" fill="#e2c469" stroke="#8f7526" stroke-width="2"/>
  <path d="M64 30 L64 92" stroke="#8f7526" stroke-width="1.8"/>
  <g fill="none" stroke="#8f7526" stroke-width="1.6">
    <path d="M32 48 Q64 58 96 48"/>
    <path d="M34 70 Q64 80 94 70"/>
  </g>
  <g fill="#a8862e">
    <circle cx="34" cy="26" r="3"/><circle cx="94" cy="26" r="3"/>
    <circle cx="34" cy="88" r="3"/><circle cx="94" cy="88" r="3"/>
  </g>
  <!-- exposed wiring at the midriff -->
  <rect x="24" y="96" width="80" height="44" rx="3" fill="#241d10"/>
  <g fill="none" stroke-width="4" stroke-linecap="round">
    <path d="M30 104 Q48 118 34 134" stroke="#c91a09"/>
    <path d="M44 100 Q58 122 46 136" stroke="#0055bf"/>
    <path d="M58 102 Q70 116 60 134" stroke="#f2cd37"/>
    <path d="M72 100 Q84 122 74 136" stroke="#4b9f4a"/>
    <path d="M86 104 Q98 118 88 132" stroke="#a5a9b4"/>
  </g>
  <g fill="#5c4a1c">
    <rect x="24" y="96" width="80" height="5"/>
    <rect x="24" y="135" width="80" height="5"/>
  </g>
  <!-- hip plate + pelvic panel -->
  <rect x="0" y="142" width="128" height="26" fill="#d8b957" stroke="#8f7526" stroke-width="1.8"/>
  <rect x="46" y="144" width="36" height="22" rx="2" fill="#c9a949" stroke="#8f7526" stroke-width="1.6"/>
  <rect x="0" y="168" width="128" height="24" fill="#e2c469"/>
  <path d="M40 168 L40 192" stroke="#8f7526" stroke-width="1.8"/>
  <path d="M88 168 L88 192" stroke="#8f7526" stroke-width="1.8"/>
</svg>`;

export const TORSO_C3PO_BACK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#dcbe61"/>
  <path d="M36 0 L92 0 L92 14 Q64 24 36 14 Z" fill="#c9a949" stroke="#8f7526" stroke-width="1.8"/>
  <path d="M24 16 Q64 30 104 16 L102 100 L26 100 Z" fill="#e2c469" stroke="#8f7526" stroke-width="2"/>
  <path d="M64 26 L64 100" stroke="#8f7526" stroke-width="1.8"/>
  <rect x="30" y="104" width="68" height="36" rx="3" fill="#c9a949" stroke="#8f7526" stroke-width="1.8"/>
  <g stroke="#8f7526" stroke-width="1.6"><path d="M30 116 L98 116"/><path d="M30 128 L98 128"/></g>
  <rect x="0" y="142" width="128" height="26" fill="#d8b957" stroke="#8f7526" stroke-width="1.8"/>
  <rect x="0" y="168" width="128" height="24" fill="#e2c469"/>
</svg>`;

/** Jawa: layered brown robe, bandolier of scavenged junk. */
export const TORSO_JAWA_FRONT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="#3f2a12"/>
  <!-- hood shadow falling over the chest -->
  <path d="M0 0 L128 0 L128 40 Q64 60 0 40 Z" fill="#2b1c0a"/>
  <!-- robe folds -->
  <g stroke="#523618" stroke-width="3" fill="none">
    <path d="M22 30 Q18 100 24 190"/>
    <path d="M44 34 Q42 104 44 190"/>
    <path d="M64 36 L64 190"/>
    <path d="M84 34 Q86 104 84 190"/>
    <path d="M106 30 Q110 100 104 190"/>
  </g>
  <!-- bandolier across the chest -->
  <path d="M6 40 L26 26 L118 140 L100 156 Z" fill="#54381a" stroke="#2b1c0a" stroke-width="2"/>
  <g fill="#2b1c0a">
    <rect x="26" y="48" width="14" height="12" rx="2" transform="rotate(38 33 54)"/>
    <rect x="50" y="78" width="14" height="12" rx="2" transform="rotate(38 57 84)"/>
    <rect x="74" y="108" width="14" height="12" rx="2" transform="rotate(38 81 114)"/>
  </g>
  <g fill="#a5a9b4" opacity="0.8">
    <circle cx="40" cy="62" r="3"/><circle cx="64" cy="92" r="3"/><circle cx="88" cy="122" r="3"/>
  </g>
  <!-- rope belt -->
  <rect x="0" y="150" width="128" height="14" fill="#54381a" stroke="#2b1c0a" stroke-width="1.6"/>
  <g stroke="#2b1c0a" stroke-width="1.6">
    <path d="M12 150 L18 164"/><path d="M32 150 L38 164"/><path d="M52 150 L58 164"/>
    <path d="M72 150 L78 164"/><path d="M92 150 L98 164"/><path d="M112 150 L118 164"/>
  </g>
</svg>`;

/** Generic dark side panel for torso sides that need armour seams. */
export const TORSO_SIDE_TROOPER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 192">
  <rect x="0" y="0" width="128" height="192" fill="${WHITE}"/>
  <path d="M0 0 L128 0 L128 16 Q64 26 0 16 Z" fill="${BLACK}"/>
  <rect x="0" y="106" width="128" height="36" fill="${TRUE_BLACK}"/>
  <rect x="0" y="142" width="128" height="26" fill="#eeeee6" stroke="${DK_GRAY}" stroke-width="2"/>
  <rect x="40" y="145" width="48" height="20" rx="2" fill="#4a5259"/>
</svg>`;
