#!/usr/bin/env python3
"""Exact finite Bernstein registry for 126 mask-2 low-r cells."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_n26_39_r1_9_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def gap(N: int, r: int) -> int:
    m = N - r
    return sum(choose(m - j + 1, j) * choose(r - j, 5 - j) for j in range(5))


def clear_cell(base, N: int, r: int):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    X, V, T = ring.gens()
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    d6cap = choose(N - 1, 6) + choose(r - 1, 5)
    yden = xden * d6cap
    ynum = xnum * d6cap - gap(N, r) * xden
    t0 = Fraction(6, m - 5)
    t1 = Fraction(6 * m, m * m - 15 * m + 10)
    assert t0 <= t1
    tden = math.lcm(t0.denominator, t1.denominator)
    lo = t0.numerator * (tden // t0.denominator)
    hi = t1.numerator * (tden // t1.denominator)
    tnum = lo + (hi - lo) * T
    znum = ynum * tden
    zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (5 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, {"gap": gap(N, r), "d6_edge_concentration_upper": d6cap, "t_lower": str(t0), "t_upper": str(t1)}


def bernstein(cleared):
    power = cleared.to_dict()
    degrees = tuple(max(index[axis] for index in power) for axis in range(3))
    scales = [math.lcm(*(math.comb(degree, exponent) for exponent in range(degree + 1))) for degree in degrees]
    blocks = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        total = 0
        for source, coefficient in power.items():
            if all(a <= b for a, b in zip(source, target)):
                total += int(coefficient) * math.prod(
                    math.comb(b, a) * scale // math.comb(degree, a)
                    for a, b, degree, scale in zip(source, target, degrees, scales)
                )
        blocks[target] = total
    return degrees, blocks


def main() -> None:
    base = base_polynomial()
    rows = []
    for N in range(26, 40):
        for r in range(1, 10):
            cleared, bounds = clear_cell(base, N, r)
            degrees, blocks = bernstein(cleared)
            negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
            rows.append(
                {
                    "N": N, "r": r, "m": N - r,
                    "status": "SEALED" if not negative else "OPEN_BERNSTEIN_METHOD",
                    "degrees": [int(value) for value in degrees],
                    "blocks": len(blocks), "minimum": str(min(blocks.values())),
                    "negative_indices": negative, "bounds": bounds,
                }
            )
    assert len(rows) == 126
    open_cells = [
        {"N": row["N"], "r": row["r"], "m": row["m"], "negative_indices": row["negative_indices"]}
        for row in rows if row["status"] != "SEALED"
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-n26-39-r1-9-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N26_39_R1_9_ALL_126"
            if not open_cells else "PASS_EXACT_PARTIAL_MASK2_N26_39_R1_9_WITH_OPEN_NO_FULL_CREDIT"
        ),
        "scope": "26<=N<=39,1<=r<=9,m=N-r>=17; mask2 selected-lower c8/Q6-upper d7",
        "exact_inputs": [
            "d5-f5>=sum_j C(m-j+1,j) C(r-j,5-j)",
            "d6<=C(N-1,6)+C(r-1,5) by edge concentration",
            "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
        ],
        "rows": rows,
        "open_cells": open_cells,
        "counts": {"cells": len(rows), "sealed": len(rows) - len(open_cells), "open": len(open_cells)},
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent.py"
            )
        },
        "proof_boundary": (
            "Only SEALED rows plus independent replay receive credit. The finite "
            "small-m block, mask3, other roots/ranks, full induction, Q8, and "
            "Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(rows), "SEALED", len(rows) - len(open_cells), "OPEN", len(open_cells))
    if open_cells:
        print("OPEN_CELLS", [(row["N"], row["r"], row["m"]) for row in open_cells])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
