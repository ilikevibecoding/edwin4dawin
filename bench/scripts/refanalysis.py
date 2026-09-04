#!/usr/bin/env python3
"""Measure the composition of a frame (the reference image or a captured still) and write JSON.

    python3 bench/scripts/refanalysis.py bench/reference/reference_a.png bench/reference/reference_a.json
    python3 bench/scripts/refanalysis.py bench/out/<tag>/aerial-a/still.png out.json

Measured: resolution/aspect, horizon row, sky/water ratio, aircraft mask bbox + centroid (yellow-white
cluster in the lower-right quadrant), skyline bbox (non-sky structures above the horizon), largest island
mask + bbox, cloud masks (large bright low-saturation blobs above the horizon), waterline extents,
dominant colours per region. Everything is normalised to [0,1] of width/height so frames of different
resolution compare directly. Values that cannot be measured automatically (bridge endpoints, sun
direction, camera) come from the annotation block and are flagged as such.
"""
import json, sys, colorsys
import numpy as np
from PIL import Image

ANNOTATIONS = {
    # Reference A (1483x832), annotated by inspection. Normalised x,y.
    'bridgeStart': [0.395, 0.475],
    'bridgeEnd': [0.735, 0.325],
    'bridgeArchTop': [0.545, 0.395],
    'skylineTallest': [0.325, 0.215],
    'lagoonCentre': [0.615, 0.53],
    'nearBoatWakes': [[0.455, 0.93], [0.52, 0.935], [0.9, 0.53]],
    'sunDirection': 'high, from behind-left of the camera (afternoon, camera looking north; sun in the south-west)',
    'camera': {'altitudeM': 380, 'pitchDeg': -12, 'verticalFovDeg': 42, 'headingDeg': -6, 'note': 'inferred from horizon placement (26% from top) and island scale'},
    'aircraftPose': 'high-wing floatplane seen from behind-left-above, banking ~8-10 deg left, climbing slightly, heading away toward upper-left',
}


def rgb_to_hsv_arr(a):
    r, g, b = a[..., 0] / 255.0, a[..., 1] / 255.0, a[..., 2] / 255.0
    mx = np.max(a, axis=-1) / 255.0
    mn = np.min(a, axis=-1) / 255.0
    v = mx
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(mx)
    mask = d > 1e-6
    rc = np.where(mask, (mx - r) / np.maximum(d, 1e-6), 0)
    gc = np.where(mask, (mx - g) / np.maximum(d, 1e-6), 0)
    bc = np.where(mask, (mx - b) / np.maximum(d, 1e-6), 0)
    h = np.where(r == mx, bc - gc, np.where(g == mx, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    h = np.where(mask, h, 0)
    return h * 360, s, v


def components(mask):
    """Connected components (4-neighbour) on a boolean array; returns label array and sizes."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes = []
    cur = 0
    stack = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and labels[y, x] == 0:
                cur += 1
                labels[y, x] = cur
                stack.append((y, x))
                n = 0
                while stack:
                    cy, cx = stack.pop()
                    n += 1
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and labels[ny, nx] == 0:
                            labels[ny, nx] = cur
                            stack.append((ny, nx))
                sizes.append(n)
    return labels, sizes


def bbox(mask):
    ys, xs = np.where(mask)
    if len(xs) == 0:
        return None
    return [float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())]


def norm_box(b, w, h):
    return None if b is None else [b[0] / w, b[1] / h, b[2] / w, b[3] / h]


def dominant(a, mask, k=1):
    px = a[mask]
    if len(px) == 0:
        return None
    med = np.median(px, axis=0)
    return [int(v) for v in med]


def analyse(path):
    img = Image.open(path).convert('RGB')
    W, H = img.size
    # analysis resolution
    aw = 400
    ah = int(round(H * aw / W))
    small = np.asarray(img.resize((aw, ah), Image.LANCZOS), dtype=np.float32)
    hue, sat, val = rgb_to_hsv_arr(small)
    # ---- horizon: first row (from the top) where the median saturation over the middle columns jumps (sky -> water/land)
    col_lo, col_hi = int(aw * 0.15), int(aw * 0.85)
    row_sat = np.median(sat[:, col_lo:col_hi], axis=1)
    row_val = np.median(val[:, col_lo:col_hi], axis=1)
    horizon = None
    for y in range(int(ah * 0.08), int(ah * 0.7)):
        win_above = row_sat[max(0, y - 6):y].mean()
        win_below = row_sat[y:y + 6].mean()
        if win_below - win_above > 0.12 and row_val[y:y + 6].mean() < row_val[max(0, y - 6):y].mean() + 0.2:
            horizon = y
            break
    if horizon is None:
        horizon = int(np.argmax(np.diff(row_sat[int(ah * 0.08):int(ah * 0.7)])) + ah * 0.08)
    horizon_n = horizon / ah
    # ---- aircraft: yellow (hue 35-60, sat>0.45) cluster in the right/lower part + neighbouring white
    yellow = (hue > 30) & (hue < 62) & (sat > 0.45) & (val > 0.5)
    yellow[: int(ah * 0.3), :] = False
    yellow[:, : int(aw * 0.3)] = False
    labels, sizes = components(yellow)
    aircraft_box = None
    aircraft_centroid = None
    if sizes:
        big = int(np.argmax(sizes)) + 1
        ys, xs = np.where(labels == big)
        cx, cy = xs.mean(), ys.mean()
        # grow to include white/light-grey wing pixels near the yellow cluster
        r = max(aw * 0.14, (xs.max() - xs.min()) * 1.2)
        yy, xx = np.mgrid[0:ah, 0:aw]
        near = (np.hypot(xx - cx, yy - cy) < r)
        white = (sat < 0.22) & (val > 0.72) & near
        # exclude sky/cloud whites by requiring them to be below the horizon
        white[:horizon + 4, :] = False
        plane = (labels == big) | white
        # restrict to the component connected to the yellow cluster
        l2, s2 = components(plane)
        lab = l2[int(cy), int(cx)]
        plane = l2 == lab if lab > 0 else plane
        b = bbox(plane)
        aircraft_box = norm_box(b, aw, ah)
        ys2, xs2 = np.where(plane)
        aircraft_centroid = [float(xs2.mean() / aw), float(ys2.mean() / ah)]
    # ---- skyline: above the horizon, pixels darker/greyer than the sky in the band 0..horizon
    band = slice(max(0, horizon - int(ah * 0.12)), horizon + 1)
    sky_ref = np.median(small[max(0, horizon - int(ah * 0.25)):max(1, horizon - int(ah * 0.15)), :, :].reshape(-1, 3), axis=0)
    diff = np.linalg.norm(small[band] - sky_ref, axis=-1)
    structure = (diff > 30) & (sat[band] < 0.4)
    struct_full = np.zeros((ah, aw), dtype=bool)
    struct_full[band] = structure
    # ignore clouds (very bright) and vegetation/land (green-brown hues); keep blue-grey built structures
    struct_full &= ~((val > 0.85) & (sat < 0.2))
    struct_full &= ~((hue > 40) & (hue < 175) & (sat > 0.12))
    struct_full &= (val > 0.35) & (val < 0.9)
    labels_s, sizes_s = components(struct_full)
    skyline_box = None
    if sizes_s:
        # take the union of components taller than 3 rows in the left-centre half
        keep = np.zeros_like(struct_full)
        for i, sz in enumerate(sizes_s, start=1):
            m = labels_s == i
            b = bbox(m)
            if b and (b[3] - b[1]) >= 3 and sz > 6 and b[0] < aw * 0.7:
                keep |= m
        skyline_box = norm_box(bbox(keep), aw, ah)
    # ---- islands / vegetation: green mask below the horizon
    green = (hue > 42) & (hue < 170) & (sat > 0.14) & (val < 0.72)
    green[:horizon, :] = False
    # close small gaps (trees have bright/dark speckle) with a 3x3 dilation then erosion
    def dilate(m):
        out = m.copy()
        out[1:, :] |= m[:-1, :]; out[:-1, :] |= m[1:, :]; out[:, 1:] |= m[:, :-1]; out[:, :-1] |= m[:, 1:]
        return out
    def erode(m):
        out = m.copy()
        out[1:, :] &= m[:-1, :]; out[:-1, :] &= m[1:, :]; out[:, 1:] &= m[:, :-1]; out[:, :-1] &= m[:, 1:]
        return out
    green = erode(dilate(dilate(green)))
    labels_g, sizes_g = components(green)
    island_box, island_area = None, 0.0
    island_mask = None
    if sizes_g:
        big = int(np.argmax(sizes_g)) + 1
        island_mask = labels_g == big
        island_box = norm_box(bbox(island_mask), aw, ah)
        island_area = float(island_mask.sum() / (aw * ah))
    # ---- clouds: bright, low-saturation blobs above the horizon
    cloud = (val > 0.8) & (sat < 0.18)
    cloud[horizon:, :] = False
    labels_c, sizes_c = components(cloud)
    clouds = []
    for i, sz in enumerate(sizes_c, start=1):
        if sz > aw * ah * 0.002:
            m = labels_c == i
            ys, xs = np.where(m)
            clouds.append({'bbox': norm_box(bbox(m), aw, ah), 'centroid': [float(xs.mean() / aw), float(ys.mean() / ah)], 'area': float(sz / (aw * ah))})
    clouds.sort(key=lambda c: -c['area'])
    cloud_cover_above_horizon = float(cloud.sum() / max(1, horizon * aw))
    # ---- water: cyan/blue below the horizon
    water = (hue > 170) & (hue < 230) & (sat > 0.25) & (val > 0.35)
    water[:horizon, :] = False
    water_area = float(water.sum() / (aw * ah))
    near_water = water.copy(); near_water[: int(ah * 0.7), :] = False
    far_water = water.copy(); far_water[int(ah * 0.45):, :] = False
    # ---- sand / beach: light warm below the horizon
    sand = (hue > 20) & (hue < 60) & (sat > 0.08) & (sat < 0.45) & (val > 0.6)
    sand[:horizon, :] = False
    # dominant colours
    regions = {
        'skyTop': np.zeros((ah, aw), dtype=bool), 'skyHorizon': np.zeros((ah, aw), dtype=bool),
    }
    regions['skyTop'][: int(ah * 0.08), :] = True
    regions['skyHorizon'][max(0, horizon - int(ah * 0.05)):horizon, :] = True
    regions['skyHorizon'] &= ~struct_full & ~cloud
    colors = {
        'skyTop': dominant(small, regions['skyTop']),
        'skyHorizon': dominant(small, regions['skyHorizon']),
        'waterNear': dominant(small, near_water),
        'waterFar': dominant(small, far_water),
        'vegetation': dominant(small, island_mask) if island_mask is not None else None,
        'sand': dominant(small, sand),
        'clouds': dominant(small, cloud),
        'aircraftYellow': dominant(small, yellow),
    }
    return {
        'source': path,
        'resolution': [W, H],
        'aspect': W / H,
        'analysisResolution': [aw, ah],
        'horizonY': horizon_n,
        'skyToWaterRatio': horizon_n / max(1e-6, 1 - horizon_n),
        'aircraft': {'bbox': aircraft_box, 'centroid': aircraft_centroid, 'widthFraction': (aircraft_box[2] - aircraft_box[0]) if aircraft_box else None},
        'skyline': {'bbox': skyline_box},
        'largestIsland': {'bbox': island_box, 'areaFraction': island_area},
        'clouds': clouds[:8],
        'cloudCoverAboveHorizon': cloud_cover_above_horizon,
        'waterAreaFraction': water_area,
        'sandAreaFraction': float(sand.sum() / (aw * ah)),
        'dominantColors': colors,
    }


def main():
    src, dst = sys.argv[1], sys.argv[2]
    res = analyse(src)
    if 'reference_a' in src:
        res['annotations'] = ANNOTATIONS
        res['role'] = 'Reference A — visual reference only; never loaded by the game; copyrighted screenshot used for composition measurement.'
    json.dump(res, open(dst, 'w'), indent=2)
    print(json.dumps({k: v for k, v in res.items() if k not in ('clouds',)}, indent=1)[:3000])


if __name__ == '__main__':
    main()
