"""Search the finite tail-Weyl equations for a branch-misaligned collision.

For fixed order and (u,v), follow the count-difference-zero solution of
m_A(y)=m_H(y) as c varies.  A zero of the remaining prefix residual is an
actual common eigenvalue on the wrong branch and is therefore a boundary
candidate for failure of adjacent-cubic compatibility.
"""

import json
from pathlib import Path
import random

import numpy as np

import probe_adjacent_cubic_tail_weyl_collision_index as tw


HERE = Path(__file__).resolve().parent


def bad_candidates(fun, parity, r, u, v, c):
    vals = [float(x) for x in fun(r, u, v, c)]
    da0, da1, da2, ba1, ba2, dh0, dh1, bh1 = vals
    na, qa = tw.poly_tail3(da0, da1, da2, ba1, ba2)
    nh, qh = tw.poly_tail2(dh0, dh1, bh1)
    eva = np.linalg.eigvalsh(tw.matrix3(da0, da1, da2, ba1, ba2))
    evh = np.linalg.eigvalsh(tw.matrix2(dh0, dh1, bh1))
    pd, pb, coupling = tw.classical_prefix_data(parity, r)
    output = []
    for root in np.roots(na * qh - nh * qa):
        if abs(root.imag) > 2e-7 or not (1e-10 < root.real < 1 - 1e-10):
            continue
        y = float(root.real)
        if min(abs(y - eva)) < 1e-7 or min(abs(y - evh)) < 1e-7:
            continue
        diff = int(np.sum(eva < y) - np.sum(evh < y))
        if diff != 0:
            continue
        pm, pm1 = tw.prefix_continuants(y, pd, pb)
        left = float(qh(y)) * pm
        right = coupling * float(nh(y)) * pm1
        scale = abs(left) + abs(right)
        residual = (left - right) / scale if scale else 0.0
        output.append((y, residual))
    return sorted(output)


def matrices(fun, parity, r, u, v, c):
    vals = [float(x) for x in fun(r, u, v, c)]
    da0, da1, da2, ba1, ba2, dh0, dh1, bh1 = vals
    pd, pb, coupling = tw.classical_prefix_data(parity, r)
    m = len(pd)
    aa = np.zeros((m + 3, m + 3))
    hh = np.zeros((m + 2, m + 2))
    for out in (aa, hh):
        out[np.arange(m), np.arange(m)] = pd
        for k in range(1, m):
            out[k - 1, k] = out[k, k - 1] = pb[k] ** 0.5
        out[m - 1, m] = out[m, m - 1] = coupling ** 0.5
    aa[m:, m:] = tw.matrix3(da0, da1, da2, ba1, ba2)
    hh[m:, m:] = tw.matrix2(dh0, dh1, bh1)
    return aa, hh


def bisect(fun, parity, r, u, v, lo, hi):
    def point(c, target_y=None):
        candidates = bad_candidates(fun, parity, r, u, v, c)
        if not candidates:
            return None
        if target_y is None:
            return candidates[0]
        return min(candidates, key=lambda item: abs(item[0] - target_y))

    plo, phi = point(lo), point(hi)
    if plo is None or phi is None or plo[1] * phi[1] > 0:
        return None
    for _ in range(70):
        mid = (lo * hi) ** 0.5
        target = (plo[0] + phi[0]) / 2
        pmid = point(mid, target)
        if pmid is None:
            return None
        if plo[1] * pmid[1] <= 0:
            hi, phi = mid, pmid
        else:
            lo, plo = mid, pmid
    c = (lo * hi) ** 0.5
    y, residual = point(c, (plo[0] + phi[0]) / 2)
    aa, hh = matrices(fun, parity, r, u, v, c)
    ra, rh = np.linalg.eigvalsh(aa), np.linalg.eigvalsh(hh)
    ia, ih = int(np.argmin(abs(ra - y))), int(np.argmin(abs(rh - y)))
    return {
        "parity": parity, "r": r, "u": u, "v": v, "c": c, "y": y,
        "normalized_residual": residual,
        "current_index_zero_based": ia, "adjacent_index_zero_based": ih,
        "current_root_error": float(ra[ia] - y),
        "adjacent_root_error": float(rh[ih] - y),
        "minimum_overlap_margin": float(min(rh[i] - ra[i] for i in range(len(rh)))),
    }


def main():
    rng = random.Random(993_20260806)
    functions = {p: tw.load(p) for p in ("odd", "even")}
    c_grid = np.logspace(-6, 6, 121)
    scanned_tracks = 0
    brackets = []
    collision = None
    for parity, fun in functions.items():
        for r in list(range(0, 31)) + [40, 60, 80, 100, 125, 150, 200, 300]:
            uv_samples = [(0.72, 0.55), (0.01, 0.99), (0.5, 0.5)]
            uv_samples += [(rng.random(), rng.random()) for _ in range(12)]
            for u, v in uv_samples:
                previous = None
                for c in c_grid:
                    candidates = bad_candidates(fun, parity, r, u, v, float(c))
                    if not candidates:
                        previous = None
                        continue
                    point = candidates[0] if previous is None else min(candidates, key=lambda z: abs(z[0] - previous[1]))
                    if previous is not None and previous[2] * point[1] < 0 and abs(point[0] - previous[1]) < 0.15:
                        brackets.append({"parity": parity, "r": r, "u": u, "v": v, "c_lo": previous[0], "c_hi": float(c)})
                        collision = bisect(fun, parity, r, u, v, previous[0], float(c))
                        if collision is not None and max(abs(collision["current_root_error"]), abs(collision["adjacent_root_error"])) < 1e-7:
                            break
                    previous = (float(c), point[0], point[1])
                scanned_tracks += 1
                if collision is not None and max(abs(collision["current_root_error"]), abs(collision["adjacent_root_error"])) < 1e-7:
                    break
            if collision is not None and max(abs(collision["current_root_error"]), abs(collision["adjacent_root_error"])) < 1e-7:
                break
        if collision is not None and max(abs(collision["current_root_error"]), abs(collision["adjacent_root_error"])) < 1e-7:
            break
    report = {
        "status": "bad_collision_found" if collision else "no_bad_collision_found",
        "scanned_tracks": scanned_tracks,
        "bracket_count": len(brackets),
        "first_brackets": brackets[:10],
        "collision": collision,
    }
    out = HERE / "bad_adjacent_cubic_tail_collision_search_20260806.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
