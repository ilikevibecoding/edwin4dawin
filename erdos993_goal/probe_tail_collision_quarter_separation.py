"""Stress-test the proposed quarter-separation lemma for tail collisions.

For the finite Weyl collision equation between the current 3x3 tail and
the adjacent 2x2 tail, classify every real solution by the difference in
the two tail eigenvalue counts.  The conjectural exact lemma is that each
count-difference-zero solution lies below 1/4, while the shared classical
Jacobi prefix has its least eigenvalue above 1/4 (apart from finitely many
small reserves to be handled separately).

This file is only a numerical falsification audit; it does not claim a
proof.  It deliberately includes parameter faces and very wide scales.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
import random

import numpy as np
from scipy.linalg import eigh_tridiagonal

import probe_adjacent_cubic_tail_weyl_collision_index as tw
from adjacent_cubic_tail_numeric import tail_values


HERE = Path(__file__).resolve().parent


def prefix_minimum(parity: str, r: int) -> float:
    diagonal, squared_subdiagonal, _ = tw.classical_prefix_data(parity, r)
    offdiagonal = np.sqrt(np.asarray(squared_subdiagonal[1:], dtype=float))
    return float(
        eigh_tridiagonal(
            np.asarray(diagonal, dtype=float),
            offdiagonal,
            select="i",
            select_range=(0, 0),
            check_finite=False,
        )[0][0]
    )


def collision_points_from_values(values):
    values = np.asarray(values, dtype=float).reshape(-1)
    if len(values) != 8 or not np.all(np.isfinite(values)):
        return []
    da0, da1, da2, ba1, ba2, dh0, dh1, bh1 = values
    if min(ba1, ba2, bh1) < -1e-10:
        return []
    ba1, ba2, bh1 = max(0.0, ba1), max(0.0, ba2), max(0.0, bh1)
    na, qa = tw.poly_tail3(da0, da1, da2, ba1, ba2)
    nh, qh = tw.poly_tail2(dh0, dh1, bh1)
    polynomial = na * qh - nh * qa
    roots = np.roots(polynomial)
    eva = np.linalg.eigvalsh(tw.matrix3(da0, da1, da2, ba1, ba2))
    evh = np.linalg.eigvalsh(tw.matrix2(dh0, dh1, bh1))
    output = []
    for root in roots:
        scale = max(1.0, abs(root.real))
        if abs(root.imag) > 2e-7 * scale:
            continue
        y = float(root.real)
        if not (-1e-8 < y < 1 + 1e-8):
            continue
        pole_gap = min(np.min(abs(eva - y)), np.min(abs(evh - y)))
        if pole_gap < 2e-7:
            continue
        ca = int(np.sum(eva < y))
        ch = int(np.sum(evh < y))
        output.append((y, ca, ch, ca - ch, pole_gap))
    return output


def main():
    rng = random.Random(993_20260806_1)
    functions = {
        parity: (lambda r, u, v, c, parity=parity: tail_values(parity, r, u, v, c))
        for parity in ("odd", "even")
    }
    reserve_values = (
        list(range(0, 21))
        + [25, 32, 40, 50, 64, 80, 100, 128, 160, 200, 256, 400, 640,
           1000, 1600, 2500, 4000, 6400, 10000, 25000, 100000]
    )
    fixed_uv = [
        (0.0, 0.0), (0.0, 1.0), (1.0, 0.0), (1.0, 1.0),
        (0.5, 0.5), (0.0, 0.5), (0.5, 0.0), (1.0, 0.5), (0.5, 1.0),
        (1e-10, 1e-10), (1e-10, 1 - 1e-10),
        (0.01, 0.99), (0.1, 0.9), (0.25, 0.75),
    ]
    c_values = [10.0**x for x in (-12, -9, -6, -4, -2, -1, 0, 1, 2, 4, 6, 9, 12)]
    counts = {}
    pair_counts = {}
    samples = 0
    finite_samples = 0
    diff0_count = 0
    violations = []
    closest_quarter = None
    closest_prefix = None
    prefix_records = {}

    for parity, fun in functions.items():
        for r in reserve_values:
            pmin = prefix_minimum(parity, r)
            prefix_records[f"{parity}_{r}"] = pmin
            uv_values = list(fixed_uv)
            uv_values.extend((rng.random(), rng.random()) for _ in range(8))
            # Add reserve-adapted small faces, where previous sufficient
            # certificates were weakest.
            eps = 1.0 / (r + 2.0)
            uv_values.extend([(eps, eps), (0.0, eps), (eps, 0.0), (eps, 1 - eps)])
            scaled_c = [x / (4.0 * (r + 1.0)) for x in (1e-6, 0.01, 0.1, 0.5, 0.8, 1, 2, 10, 1e3)]
            parameter_points = [
                (u, v, c) for u, v in uv_values for c in c_values + scaled_c
            ]
            us = np.asarray([point[0] for point in parameter_points])
            vs = np.asarray([point[1] for point in parameter_points])
            cs = np.asarray([point[2] for point in parameter_points])
            raw_values = fun(r, us, vs, cs)
            evaluated = [
                np.broadcast_to(np.asarray(value, dtype=float), us.shape)
                for value in raw_values
            ]
            for index, (u, v, c) in enumerate(parameter_points):
                    samples += 1
                    points = collision_points_from_values(
                        [value[index] for value in evaluated]
                    )
                    if points:
                        finite_samples += 1
                    for y, ca, ch, diff, pole_gap in points:
                        counts[str(diff)] = counts.get(str(diff), 0) + 1
                        pair = f"{ca},{ch}"
                        pair_counts[pair] = pair_counts.get(pair, 0) + 1
                        if diff != 0:
                            continue
                        diff0_count += 1
                        record = {
                            "parity": parity, "r": r, "u": u, "v": v, "c": c,
                            "y": y, "quarter_gap": 0.25 - y,
                            "prefix_minimum": pmin, "prefix_gap": pmin - y,
                            "tail_counts": [ca, ch], "pole_gap": pole_gap,
                        }
                        if closest_quarter is None or record["quarter_gap"] < closest_quarter["quarter_gap"]:
                            closest_quarter = record
                        if closest_prefix is None or record["prefix_gap"] < closest_prefix["prefix_gap"]:
                            closest_prefix = record
                        if y >= 0.25 + 2e-8 or y >= pmin + 2e-8:
                            violations.append(record)

    min_prefix_record = min(prefix_records.items(), key=lambda item: item[1])
    first_prefix_above_quarter = {}
    for parity in ("odd", "even"):
        eligible = [(r, prefix_records[f"{parity}_{r}"]) for r in reserve_values]
        first_prefix_above_quarter[parity] = next(
            ({"r": r, "minimum": value} for r, value in eligible if value > 0.25),
            None,
        )
    report = {
        "status": "quarter_separation_survived" if not violations else "candidate_violation",
        "samples": samples,
        "samples_with_real_collision": finite_samples,
        "diff0_collision_count": diff0_count,
        "count_difference_histogram": counts,
        "tail_count_pair_histogram": pair_counts,
        "closest_diff0_to_quarter": closest_quarter,
        "closest_diff0_to_prefix_minimum": closest_prefix,
        "minimum_prefix_record": {"key": min_prefix_record[0], "minimum": min_prefix_record[1]},
        "first_sampled_reserve_with_prefix_minimum_above_quarter": first_prefix_above_quarter,
        "violations": violations[:20],
        "reserve_values": reserve_values,
        "note": "Numerical falsification audit only; roots within 2e-7 of a tail pole were excluded.",
    }
    out = HERE / "tail_collision_quarter_separation_probe_20260806.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
