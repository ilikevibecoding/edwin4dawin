// Pixel-art icons for the administrator panel, drawn as inline SVG rectangles so they stay crisp at any size
// and need no image assets. Each icon is an ASCII map: one character per pixel, '.' = transparent, anything
// else is looked up in the icon's palette ('#' maps to currentColor so monochrome glyphs follow the text colour).
const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  // wave: foam crest curling over deep water (tsunami / flood)
  tsunami: {
    palette: { W: '#eef7ff', L: '#4f9dff', B: '#2457c5' },
    rows: [
      '................',
      '......WWWW......',
      '....WWLLLLW.....',
      '...WLLLLLLLW....',
      '..WLLBB.LLLLW...',
      '..WLB....LLLW...',
      '..WL.....LLLLW..',
      '.........LLLLW..',
      '........LLLLLLW.',
      '.......LLLLLLLW.',
      '......LLLLLLLLLW',
      '....LLLLLLLLLLLL',
      '..LLLLLLLLLLLLLL',
      'WWWWWWWWWWWWWWWW',
      'BBBBBBBBBBBBBBBB',
      'BBBBBBBBBBBBBBBB',
    ],
  },
  // funnel: storm deck, banded funnel narrowing to a dust skirt (tornado)
  tornado: {
    palette: { D: '#4b4b5a', G: '#a0a0b0', H: '#dadae6', S: '#b98b52' },
    rows: [
      '................',
      '.DDDDDDDDDDDDDD.',
      'DDDDDDDDDDDDDDDD',
      '.DDGGGGGGGGGGDD.',
      '...GGGHHGGGGG...',
      '....GGGHHGGGG...',
      '.....GGHHGGG....',
      '.....GGGHHGG....',
      '......GGHHG.....',
      '......GGGHG.....',
      '.......GHG......',
      '.......GGG......',
      '........GG......',
      '........G.......',
      '......SSGSS.....',
      '.....SSSSSSS....',
    ],
  },
  // dish: orbital ring station, descending beam and glowing crater (orbital beam)
  beam: {
    palette: { R: '#cfd3e6', K: '#3b3b4d', Y: '#ffe86a', O: '#ff9a3c', C: '#5a3b2a' },
    rows: [
      '....RRRRRRRR....',
      '..RRKKKKKKKKRR..',
      '.RKK..YYYY..KKR.',
      '.RK...YYYY...KR.',
      '..RRKKYYYYKKRR..',
      '....RRYYYYRR....',
      '......YYYY......',
      '......YYYY......',
      '......YYYY......',
      '......YYYY......',
      '......YYYY......',
      '.....OYYYYO.....',
      '....OOYYYYOO....',
      '..CCOOOOOOOOCC..',
      '.CCCCOOOOOOCCCC.',
      'CCCCCCCCCCCCCCCC',
    ],
  },
  // warning triangle: fallback for disaster types without a dedicated icon
  hazard: {
    palette: { Y: '#ffd23f', K: '#2a2a2a' },
    rows: [
      '.......YY.......',
      '......YYYY......',
      '......YYYY......',
      '.....YYYYYY.....',
      '.....YYKKYY.....',
      '....YYYKKYYY....',
      '....YYYKKYYY....',
      '...YYYYKKYYYY...',
      '...YYYYKKYYYY...',
      '..YYYYYKKYYYYY..',
      '..YYYYYYYYYYYY..',
      '.YYYYYYKKYYYYYY.',
      '.YYYYYYKKYYYYYY.',
      'YYYYYYYYYYYYYYYY',
      'YYYYYYYYYYYYYYYY',
      '................',
    ],
  },
  // padlock (permission denied)
  lock: {
    rows: [
      '.....######.....',
      '....##....##....',
      '....##....##....',
      '....##....##....',
      '..############..',
      '..############..',
      '..#####..#####..',
      '..#####..#####..',
      '..######.#####..',
      '..######.#####..',
      '..############..',
      '..############..',
    ],
  },
  // person ("use my position")
  me: {
    rows: [
      '...##...',
      '..####..',
      '..####..',
      '...##...',
      '.######.',
      '########',
      '.##..##.',
      '.##..##.',
    ],
  },
  // crosshair ("use crosshair target")
  target: {
    rows: [
      '....#....',
      '....#....',
      '..#####..',
      '.##...##.',
      '###.#.###',
      '.##...##.',
      '..#####..',
      '....#....',
      '....#....',
    ],
  },
  // die showing three pips (randomize seed)
  dice: {
    rows: [
      '#########',
      '#.......#',
      '#.#.....#',
      '#.......#',
      '#...#...#',
      '#.......#',
      '#.....#.#',
      '#.......#',
      '#########',
    ],
  },
  // two overlapping sheets (copy)
  copy: {
    rows: [
      '######...',
      '#....#...',
      '#....#...',
      '#..######',
      '#..#....#',
      '#..#....#',
      '####....#',
      '...#....#',
      '...######',
    ],
  },
};

// Builds an <svg> for the named icon. Horizontal runs of one colour are merged into a single <rect>.
export function pixelIcon(name, size = 16) {
  const icon = ICONS[name] || ICONS.hazard;
  const rows = icon.rows;
  const w = rows[0].length, hgt = rows.length;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('ap-icon', 'ap-icon-' + name);
  for (let y = 0; y < hgt; y++) {
    const row = rows[y];
    for (let x = 0; x < w;) {
      const ch = row[x];
      if (ch === '.') { x++; continue; }
      let x2 = x + 1;
      while (x2 < w && row[x2] === ch) x2++;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(x2 - x));
      rect.setAttribute('height', '1');
      rect.setAttribute('fill', icon.palette && icon.palette[ch] ? icon.palette[ch] : 'currentColor');
      svg.appendChild(rect);
      x = x2;
    }
  }
  return svg;
}

export function hasDisasterIcon(type) { return type === 'tsunami' || type === 'tornado' || type === 'beam'; }
export function disasterIcon(type, size = 40) { return pixelIcon(hasDisasterIcon(type) ? type : 'hazard', size); }
