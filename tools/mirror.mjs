// Are wall openings punched at the mirror of their doorway?  (owner: opus4)
//
// `src/mission/level-repair.js` warns at every load that four walk-through
// openings had a wall standing in them and had to be cut open, and the warning
// blames the local-x expression in `src/map/build.js`. The lead's read is that
// these are false positives, because a collision query at those doorways comes
// back clear — but that query runs *after* level-repair has already cut them,
// so a clear result is exactly what a real bug plus a working repair looks like.
// A collision query cannot tell the two apart.
//
// This can: it rebuilds one wall segment from the live `KIT.wallWithOpenings`
// and `deriveWalls`, with nothing else in the scene and no repair pass anywhere
// near it, then reads the world-space gap out of the result and compares it with
// where `buildOpening` puts the door frame. Pure geometry on the shipping code.
//
//   node tools/mirror.mjs
//
// A `verdict` of `mirrored` means the hole and the doorway are on opposite sides
// of the segment centre, which is the bug. `aligned` means they agree.

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);

const main = async () => {
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5181) });
  const g = await openGame({
    url: server.url, width: 480, height: 270, quality: 'low', resolutionScale: 0.5,
  });

  try {
    const report = await g.page.evaluate(async () => {
      // A bare specifier does not resolve in an evaluated script; the dev server
      // serves the real file, and it is the same module instance the game uses.
      const THREE = await import('/node_modules/three/build/three.module.js');
      const KIT = await import('/src/map/kit.js');
      const { deriveWalls } = await import('/src/map/build.js');
      const { OPENINGS, FLOOR_Y } = await import('/src/map/layout.js');
      const { SHAPE_LANGUAGE: SL } = await import('/src/art/palette.js');

      const segs = deriveWalls();
      const rows = [];

      for (const o of OPENINGS) {
        // Find the segment this opening belongs to, by the same test build.js uses.
        const seg = segs.find((s) => s.floor === o.floor
          && s.axis === o.axis
          && Math.abs(s.coord - o.coord) < 0.02
          && o.at - o.width / 2 >= s.a - 0.15
          && o.at + o.width / 2 <= s.b + 0.15);
        if (!seg) {
          rows.push({ id: o.id, axis: o.axis, floor: o.floor, verdict: 'no-segment' });
          continue;
        }

        const length = seg.b - seg.a;
        const height = 4;

        // Exactly the call build.js makes, with exactly the local x it passes.
        const wall = KIT.wallWithOpenings({
          length,
          height,
          thickness: SL.wallThickness,
          material: new THREE.MeshBasicMaterial(),
          openings: [{
            x: o.at - seg.a,
            width: o.width,
            sill: o.sill,
            head: Math.min(o.head, height - 0.02),
            spec: o,
          }],
          baseboard: false,
          metresPerTile: 2.5,
        });

        // Place and orient it the way build.js does.
        const cx = seg.axis === 'z' ? seg.coord : (seg.a + seg.b) / 2;
        const cz = seg.axis === 'z' ? (seg.a + seg.b) / 2 : seg.coord;
        wall.position.set(cx, FLOOR_Y[o.floor], cz);
        if (seg.axis === 'z') wall.rotation.y = Math.PI / 2;
        wall.updateMatrixWorld(true);

        // The gap is whatever the solid pieces do not cover. Walk the panels at
        // door height and find the along-segment interval none of them occupy.
        const alongAxis = seg.axis === 'z' ? 'z' : 'x';
        const doorY = FLOOR_Y[o.floor] + Math.min(1.2, (o.sill + o.head) / 2);
        const covered = [];
        wall.traverse((node) => {
          if (!node.isMesh) return;
          const box = new THREE.Box3().setFromObject(node);
          if (box.min.y > doorY || box.max.y < doorY) return; // head/sill piece
          covered.push([box.min[alongAxis], box.max[alongAxis]]);
        });
        covered.sort((a, b) => a[0] - b[0]);

        const gaps = [];
        let cursor = seg.a;
        for (const [lo, hi] of covered) {
          if (lo - cursor > 0.05) gaps.push([+cursor.toFixed(3), +lo.toFixed(3)]);
          cursor = Math.max(cursor, hi);
        }
        if (seg.b - cursor > 0.05) gaps.push([+cursor.toFixed(3), +seg.b.toFixed(3)]);

        // `buildOpening` puts the frame, the door and the collision hole here.
        const doorwayAt = o.at;
        const holeAt = gaps.length
          ? gaps.reduce((best, gp) => {
            const mid = (gp[0] + gp[1]) / 2;
            return Math.abs(mid - doorwayAt) < Math.abs(best - doorwayAt) ? mid : best;
          }, (gaps[0][0] + gaps[0][1]) / 2)
          : null;

        const mirrorOf = (seg.a + seg.b) - doorwayAt;
        const offBy = holeAt === null ? null : +Math.abs(holeAt - doorwayAt).toFixed(3);
        let verdict = 'aligned';
        if (holeAt === null) verdict = 'no-gap';
        else if (offBy > 0.1) {
          verdict = Math.abs(holeAt - mirrorOf) < 0.1 ? 'mirrored' : 'displaced';
        }

        rows.push({
          id: o.id,
          type: o.type,
          axis: o.axis,
          floor: o.floor,
          rooms: seg.rooms.map((r) => r.id),
          segment: [+seg.a.toFixed(2), +seg.b.toFixed(2)],
          doorwayAt: +doorwayAt.toFixed(3),
          holeAt: holeAt === null ? null : +holeAt.toFixed(3),
          mirrorOf: +mirrorOf.toFixed(3),
          offBy,
          gaps,
          verdict,
        });
      }

      // ---------------------------------------------------------------------
      // Second pass, against the level that actually got built.
      //
      // The reconstruction above assumes the segment `deriveWalls` returned is
      // the span build.js passed to the kit, but build.js splits some segments
      // further where an upper floor overlaps, and a sub-span has its own `a`.
      // So also measure the real thing: sample occupancy along each wall at door
      // height, ignoring `level-repair`'s patch meshes so what is measured is the
      // wall as `buildWalls` left it, and compare the gap with the door frame
      // `buildOpening` placed.
      const live = [];
      const game = window.__NORTHSTAR__;
      const levelGroup = game.level?.group ?? game.scene;
      const walls = [];
      levelGroup.traverse((n) => {
        if (!n.isMesh) return;
        for (let p = n; p; p = p.parent) {
          if (/opening-repair/.test(p.name || '')) return; // the repair, not the wall
        }
        walls.push(n);
      });
      const boxes = walls.map((n) => ({ node: n, box: new THREE.Box3().setFromObject(n) }));

      // Walk-through openings only. A window's own glazing is a solid box as far
      // as occupancy sampling is concerned, so a correctly built window is
      // indistinguishable from a sealed one this way; the reconstruction above is
      // the measurement for those.
      const WALKTHROUGH = new Set(['door', 'doubledoor', 'arch']);
      for (const o of OPENINGS) {
        if (o.axis !== 'z') continue; // +X maps to -Z only on these
        if (!WALKTHROUGH.has(o.type)) continue;
        const fy = FLOOR_Y[o.floor];
        const y = fy + Math.min(1.2, (o.sill + o.head) / 2);
        const seg = segs.find((s) => s.floor === o.floor && s.axis === o.axis
          && Math.abs(s.coord - o.coord) < 0.02
          && o.at - o.width / 2 >= s.a - 0.15 && o.at + o.width / 2 <= s.b + 0.15);
        if (!seg) continue;

        // Walk along the wall in 5 cm steps; a step is "open" if no wall box
        // covers the point. Probe the wall's own plane, so only that wall counts.
        const open = [];
        for (let t = seg.a; t <= seg.b; t += 0.05) {
          const p = new THREE.Vector3(o.coord, y, t);
          const blocked = boxes.some(({ box }) => box.min.x - 0.16 <= p.x && box.max.x + 0.16 >= p.x
            && box.min.y <= p.y && box.max.y >= p.y
            && box.min.z - 0.02 <= p.z && box.max.z + 0.02 >= p.z);
          if (!blocked) open.push(+t.toFixed(2));
        }
        // Collapse the open samples into runs.
        const runs = [];
        for (const t of open) {
          const last = runs[runs.length - 1];
          if (last && t - last[1] < 0.12) last[1] = t;
          else runs.push([t, t]);
        }
        const wide = runs.filter(([a, b]) => b - a >= Math.min(0.5, o.width * 0.5));
        const doorwayOpen = wide.some(([a, b]) => a <= o.at && b >= o.at);
        live.push({
          id: o.id,
          type: o.type,
          floor: o.floor,
          doorwayAt: o.at,
          mirrorOf: +((seg.a + seg.b) - o.at).toFixed(2),
          openRuns: wide.map(([a, b]) => [a, b]),
          doorwayIsOpen: doorwayOpen,
          openAtMirror: wide.some(([a, b]) => {
            const m = (seg.a + seg.b) - o.at;
            return a <= m && b >= m;
          }),
        });
      }

      return { openings: OPENINGS.length, rows, live };
    });

    const byVerdict = {};
    for (const r of report.rows) byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1;

    log(`[mirror] ${report.openings} openings; ${Object.entries(byVerdict).map(([k, v]) => `${v} ${k}`).join(', ')}`);

    const bad = report.rows.filter((r) => r.verdict === 'mirrored' || r.verdict === 'displaced');
    if (bad.length) {
      log('[mirror] openings whose hole is not where the doorway is:');
      for (const r of bad) {
        log(`[mirror]   ${r.id} (${r.type}, ${r.floor}, axis ${r.axis}, ${r.rooms.join('/')})`);
        log(`[mirror]     segment ${r.segment[0]}..${r.segment[1]}  doorway at ${r.doorwayAt}`
          + `  hole at ${r.holeAt}  mirror of doorway ${r.mirrorOf}  off by ${r.offBy} m — ${r.verdict}`);
      }
    } else {
      log('[mirror] every opening is cut where its doorway stands.');
    }

    // Whether the mirror is harmless: on a segment whose doorway is dead centre,
    // `o.at` and its mirror are the same point, so the bug cannot show.
    const symmetric = report.rows.filter((r) => r.verdict === 'aligned' && r.axis === 'z').length;
    log(`[mirror] ${symmetric} z-axis opening(s) sit close enough to their segment centre that the mirror is invisible`);

    log('');
    log('[mirror] in the level as built, walk-through openings only, level-repair\'s patches excluded:');
    const sealed = report.live.filter((r) => !r.doorwayIsOpen);
    const spurious = report.live.filter((r) => r.openAtMirror && Math.abs(r.mirrorOf - r.doorwayAt) > 0.5);
    log(`[mirror]   ${report.live.length} z-axis opening(s) measured; ${sealed.length} have no gap at the doorway`);
    for (const r of sealed) {
      log(`[mirror]     SEALED ${r.id} (${r.type}, ${r.floor}) doorway at ${r.doorwayAt}, `
        + `wall is open at ${JSON.stringify(r.openRuns)}, mirror of the doorway is ${r.mirrorOf}`);
    }
    log(`[mirror]   ${spurious.length} have a gap at the mirror of the doorway instead of / as well as at the doorway`);
    for (const r of spurious) {
      log(`[mirror]     HOLE   ${r.id} (${r.type}, ${r.floor}) unintended aperture near ${r.mirrorOf}`);
    }

    writeJson('mirror.json', { ...report, byVerdict });
  } finally {
    await g.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
