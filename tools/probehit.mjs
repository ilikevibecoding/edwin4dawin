// What is the view probe actually hitting?  (owner: opus4)
//
// `tools/audit.mjs` reports 100% untagged rays at `insertion`, `garage` and
// `extraction`, and — the tell — `nearest` and `farthest` both 0.00 at the first
// two. Forty-five rays spread across the whole frame cannot all hit real level
// geometry at exactly zero metres, so before filing "the courtyard is untagged"
// against the map owner, find out what is in the way.
//
//   node tools/probehit.mjs

import { parseArgs, startServer, openGame, writeJson } from './lib/session.mjs';

const args = parseArgs();
const log = (...p) => process.stdout.write(`${p.join(' ')}\n`);

const main = async () => {
  const server = args.url
    ? { url: String(args.url), stop: async () => {}, reused: true }
    : await startServer({ port: Number(args.port ?? 5183) });
  const g = await openGame({
    url: server.url, width: 640, height: 360, quality: 'medium', resolutionScale: 0.5,
  });
  const { qa, advance, page } = g;

  try {
    await qa('forcePlay', { difficulty: 'operator', loadout: { primary: 'carbine' } });
    await page.waitForFunction(() => window.__NORTHSTAR__.state === 'playing', null, { timeout: 60_000 });
    await advance(700);

    const out = {};
    for (const checkpoint of (args.at ? [String(args.at)] : ['insertion', 'garage', 'extraction', 'openoffice', 'weststair'])) {
      await qa('teleport', checkpoint);
      await advance(400);
      out[checkpoint] = await page.evaluate(async () => {
        // A bare specifier does not resolve in an evaluated script; the dev
        // server serves the real file, and it is the same module instance the
        // game already imported.
        const THREE = await import('/node_modules/three/build/three.module.js');
        const game = window.__NORTHSTAR__;
        const { camera, scene } = game;
        const rc = new THREE.Raycaster();
        rc.far = 40;
        const ndc = new THREE.Vector2();
        const tally = new Map();

        // Same 9x5 grid the QA probe uses, but keep the whole hit list per ray
        // and describe the object rather than only asking for its asset id.
        for (let iy = 0; iy < 5; iy++) {
          for (let ix = 0; ix < 9; ix++) {
            ndc.set(((ix / 8) * 2 - 1) * 0.86, ((iy / 4) * 2 - 1) * 0.86);
            rc.setFromCamera(ndc, camera);
            const hits = rc.intersectObject(scene, true);
            const hit = hits.find((h) => !/^(qa|nav|gallery):/.test(h.object?.name || ''));
            if (!hit) continue;

            // Where does this object live? Walk up to a named ancestor, and note
            // whether the camera itself is one of them: geometry parented to the
            // camera is the view model, and it travels with the probe.
            const chain = [];
            let onCamera = false;
            for (let n = hit.object; n; n = n.parent) {
              if (n === camera) onCamera = true;
              chain.push(n.name || n.type);
            }
            const key = [
              hit.object.name || hit.object.type,
              onCamera ? 'PARENTED-TO-CAMERA' : chain.slice(1, 4).join(' < '),
              hit.object.material?.name || '',
            ].join(' | ');
            const o = hit.object;
            const mat = Array.isArray(o.material) ? o.material[0] : o.material;
            const row = tally.get(key) || {
              what: key, rays: 0, onCamera, minDist: Infinity, maxDist: 0,
              assetId: null, visible: o.visible, frustumCulled: o.frustumCulled,
              // Enough to identify a mystery object without guessing: what kind of
              // renderable it is, which side its material draws, how big it is and
              // where it sits relative to the camera.
              objectType: o.type,
              isPoints: !!o.isPoints,
              isSprite: !!o.isSprite,
              geometry: o.geometry?.type ?? null,
              vertexCount: o.geometry?.attributes?.position?.count ?? null,
              materialType: mat?.type ?? null,
              materialSide: mat?.side ?? null,
              depthWrite: mat?.depthWrite ?? null,
              parentName: o.parent?.name || o.parent?.type || null,
              worldPos: (() => {
                const v = new THREE.Vector3();
                o.getWorldPosition(v);
                return v.toArray().map((n) => +n.toFixed(2));
              })(),
              boundsSize: (() => {
                const b = new THREE.Box3().setFromObject(o);
                const s = b.getSize(new THREE.Vector3());
                return s.toArray().map((n) => +n.toFixed(1));
              })(),
            };
            row.rays++;
            row.minDist = Math.min(row.minDist, hit.distance);
            row.maxDist = Math.max(row.maxDist, hit.distance);
            for (let n = hit.object; n && !row.assetId; n = n.parent) {
              if (n.userData?.assetId) row.assetId = n.userData.assetId;
            }
            tally.set(key, row);
          }
        }

        // Anything whose bounds enclose the camera will answer a ray at ~0 m from
        // every direction, which is the signature the audit was seeing.
        const enclosing = [];
        const box = new THREE.Box3();
        scene.traverse((n) => {
          if (!n.isMesh && !n.isPoints) return;
          box.setFromObject(n);
          if (!box.containsPoint(camera.position)) return;
          const size = box.getSize(new THREE.Vector3());
          enclosing.push({
            name: n.name || n.type,
            type: n.type,
            parent: n.parent?.name || n.parent?.type || null,
            assetId: n.userData?.assetId ?? null,
            size: size.toArray().map((v) => +v.toFixed(1)),
            visible: n.visible,
          });
        });

        return {
          room: game.rooms?.roomAt?.(game.player.position)?.id ?? null,
          cameraPos: camera.position.toArray().map((n) => +n.toFixed(2)),
          cameraChildren: camera.children.map((c) => c.name || c.type),
          enclosing,
          hits: [...tally.values()]
            .map((r) => ({ ...r, minDist: +r.minDist.toFixed(3), maxDist: +r.maxDist.toFixed(3) }))
            .sort((a, b) => b.rays - a.rays),
        };
      });
    }

    for (const [checkpoint, data] of Object.entries(out)) {
      log(`[probehit] ${checkpoint} (room ${data.room}) camera at ${data.cameraPos.join(',')}`);
      log(`[probehit]   camera children: ${data.cameraChildren.join(', ') || 'none'}`);
      log(`[probehit]   objects whose bounds enclose the camera: ${data.enclosing.length}`);
      for (const e of data.enclosing) {
        log(`[probehit]     ${e.type} "${e.name}" parent=${e.parent} assetId=${e.assetId ?? 'none'} `
          + `size ${e.size.join('x')} visible=${e.visible}`);
      }
      for (const h of data.hits) {
        log(`[probehit]   ${String(h.rays).padStart(2)} rays  ${h.minDist}–${h.maxDist} m  `
          + `${h.onCamera ? '[view model] ' : ''}assetId=${h.assetId ?? 'none'}  ${h.what}`);
        log(`[probehit]        ${h.objectType} / ${h.geometry} (${h.vertexCount} verts) / `
          + `${h.materialType} side=${h.materialSide} depthWrite=${h.depthWrite} / `
          + `parent=${h.parentName} / at ${h.worldPos?.join(',')} size ${h.boundsSize?.join('x')}`);
      }
    }

    writeJson('probe-hits.json', out);
  } finally {
    await g.close();
    await server.stop();
  }
};

main().catch((err) => {
  process.stderr.write(`${err.stack || err}\n`);
  process.exit(1);
});
