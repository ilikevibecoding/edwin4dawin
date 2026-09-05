#!/usr/bin/env node
// Measure how regular the ground's directional grain is.
//
// "The ribbing is a regular, evenly spaced corrugation" is a claim about a
// spectrum, and scoring it by eye at a 3x magnification turned out to be the
// least reliable step in the loop: three successive passes all looked "better but
// still there" while the numbers underneath moved a long way. A periodic
// corrugation puts a sharp isolated peak in the 2D power spectrum. Broken ground
// puts energy everywhere and no peak. So report the ratio of the strongest
// non-DC peak to the median power at the same radius — high means machined, low
// means dirt — alongside the total high-frequency energy, which is the thing that
// must *not* collapse while the peak comes down.
//
//   node tools/gndrib.mjs shots/m1/rear.png shots/gd_22/rear.png
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: gndrib.mjs <png> [png...]');
  process.exit(1);
}

// The foreground band of a 640x360 beauty frame: running surface, below the truck
// and clear of the dust plume on the left.
const CROP = process.env.GNDRIB_CROP || '260:80:40:270';

const py = `
import sys, numpy as np
for path in sys.argv[1:]:
    raw = np.frombuffer(open(path,'rb').read(), dtype=np.uint8).astype(np.float64)
    n = raw.size // 3
    w, h = ${CROP.split(':')[0]}, ${CROP.split(':')[1]}
    img = raw.reshape(h, w, 3)
    lum = (0.2126*img[:,:,0] + 0.7152*img[:,:,1] + 0.0722*img[:,:,2]) / 255.0
    lum = lum - lum.mean()
    win = np.outer(np.hanning(h), np.hanning(w))
    P = np.abs(np.fft.fftshift(np.fft.fft2(lum*win)))**2
    cy, cx = h//2, w//2
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((yy-cy)/h, (xx-cx)/w)
    # Ignore the lowest frequencies: those are the rut form and the bank, which are
    # supposed to be there. Anything from a fifteenth of the crop up is the tier the
    # corrugation lived in.
    band = (r > 0.06) & (r < 0.42)
    pk = 0.0
    for rad in np.arange(0.06, 0.42, 0.03):
        ring = band & (r >= rad) & (r < rad+0.03)
        if ring.sum() < 12: continue
        v = P[ring]
        pk = max(pk, v.max() / max(np.median(v), 1e-12))
    hf = P[band].sum() / P[r <= 0.06].sum()
    print(f"{path.split('/')[-2]:10s} peak/median {pk:8.1f}   hf/lf {hf:7.4f}")
`;

const tmpFiles = [];
for (const f of files) {
  const raw = execFileSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', f, '-vf', `crop=${CROP}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    { maxBuffer: 1 << 28 },
  );
  const t = `/tmp/gndrib_${tmpFiles.length}_${f.replace(/[^a-z0-9]/gi, '_')}.raw`;
  writeFileSync(t, raw);
  tmpFiles.push(t);
}
writeFileSync('/tmp/gndrib.py', py);
console.log(execFileSync('python3', ['/tmp/gndrib.py', ...tmpFiles]).toString().trim());
for (const t of tmpFiles) unlinkSync(t);
