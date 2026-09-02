#!/usr/bin/env python3
"""Exact finite mask-1 registry for 224 cells with 0<=m<=15."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_n26_39_m0_15_exact_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"

EXPECTED = {
    "prove_rank8_forest6_15_component_jet_bounds_agent.py": "D0E0E18E2E2D3BB6BEEF080BB360FC61EA8129EE415E447DAEF5A448A80519E5",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json": "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "audit_rank8_forest6_15_component_jet_bounds_agent.py": "1D896071A729A8614B32518344006F588E05A0C3D50D212990BB625A8DDF4F08",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json": "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py": "64B9399A1C9C6A9DA3AE569AC57080E8D3A8FEFCA0B474AA490370E2D569DE52",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def fraction(value: str) -> Fraction:
    numerator, slash, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if slash else 1)


def path_minima(m: int) -> list[int]:
    return [choose(m - j + 1, j) for j in range(5)]


def gap(r: int, minima: list[int], components: int = 4) -> int:
    return sum(
        minima[j] * choose(r - min(j, components), 5 - j) for j in range(5)
    )


def common_xy(N: int, r: int, minima: list[int], components: int, ring):
    X, V = ring.gens()[:2]
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    d6cap = choose(N - 1, 6) + choose(r - 1, 5)
    yden = xden * d6cap
    ynum = xnum * d6cap - gap(r, minima, components) * xden
    return V, xnum, xden, ynum, yden, d6cap


def clear_zero(base, N: int, r: int, minima: list[int], components: int = 4):
    ring = fmpz_mpoly_ctx.get(["X", "V"])
    V, xnum, xden, ynum, yden, d6cap = common_xy(
        N, r, minima, components, ring
    )
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        answer += term
    return answer, {"gap": gap(r, minima, components), "d6_upper": d6cap}


def clear_positive(
    base, N: int, r: int, minima: list[int], components: int, t_upper: Fraction
):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    _, V, T = ring.gens()
    _, xnum, xden, ynum, yden, d6cap = common_xy(
        N, r, minima, components, ring
    )
    t_lower = Fraction(6, m - 5)
    assert t_lower <= t_upper
    tden = math.lcm(t_lower.denominator, t_upper.denominator)
    lo = t_lower.numerator * (tden // t_lower.denominator)
    hi = t_upper.numerator * (tden // t_upper.denominator)
    tnum = lo + (hi - lo) * T
    znum = ynum * tden
    zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, {
        "gap": gap(r, minima, components),
        "d6_upper": d6cap,
        "t_lower": str(t_lower),
        "t_upper": str(t_upper),
    }


def sign(cleared):
    power = cleared.to_dict()
    axes = len(next(iter(power)))
    degrees = tuple(max(index[axis] for index in power) for axis in range(axes))
    scales = [
        math.lcm(*(math.comb(degree, exponent) for exponent in range(degree + 1)))
        for degree in degrees
    ]
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
    negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
    return {
        "degrees": [int(value) for value in degrees],
        "blocks": len(blocks),
        "negative": len(negative),
        "zero": sum(value == 0 for value in blocks.values()),
        "positive": sum(value > 0 for value in blocks.values()),
        "minimum": str(min(blocks.values())),
        "negative_indices": negative,
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    global_rows = {row["order"]: row for row in catalog["global_order_rows"]}
    base = base_polynomial()
    rows = []
    open_subboxes = []
    subboxes = 0
    for N in range(26, 40):
        for m in range(16):
            r = N - m
            branches = []
            if m <= 10:
                cleared, metadata = clear_zero(base, N, r, path_minima(m))
                result = sign(cleared)
                branches.append(
                    {"branch": "f6_zero", "route": "GLOBAL_PATH_GAP_EDGE_CONCENTRATION", "metadata": metadata, "bernstein": result}
                )
                if result["negative"]:
                    open_subboxes.append((N, m, "f6_zero"))
                subboxes += 1
            if m >= 6:
                t_upper = fraction(global_rows[m]["f6_positive_maximum_f5_over_f6"])
                cleared, metadata = clear_positive(base, N, r, path_minima(m), 4, t_upper)
                result = sign(cleared)
                branches.append(
                    {"branch": "f6_positive", "route": "GLOBAL_FINITE_RATIO_PATH_GAP_EDGE_CONCENTRATION", "metadata": metadata, "bernstein": result}
                )
                if result["negative"]:
                    open_subboxes.append((N, m, "f6_positive"))
                subboxes += 1
            expected = ["f6_zero"] if m < 6 else (["f6_positive"] if m > 10 else ["f6_zero", "f6_positive"])
            assert [branch["branch"] for branch in branches] == expected
            rows.append(
                {
                    "N": N,
                    "m": m,
                    "r": r,
                    "status": "SEALED" if all(branch["bernstein"]["negative"] == 0 for branch in branches) else "OPEN_GLOBAL_BERNSTEIN_METHOD",
                    "branches": branches,
                }
            )
    assert len(rows) == 224 and subboxes == 294
    open_cells = sorted({(N, m, N - m) for N, m, _ in open_subboxes})
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-n26-39-m0-15-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_M0_15_ALL_224"
            if not open_subboxes
            else "PASS_EXACT_PARTIAL_MASK1_N26_39_M0_15_GLOBAL_BOXES_WITH_OPEN"
        ),
        "scope": "26<=N<=39,0<=m<=15,r=N-m; mask1 selected-lower d7/Q7-upper c8",
        "counts": {
            "cells": len(rows),
            "logical_f6_zero_branches": 154,
            "logical_f6_positive_branches": 140,
            "bernstein_subboxes": subboxes,
            "open_subboxes": len(open_subboxes),
            "open_cells": len(open_cells),
        },
        "exact_inputs": [
            "d6<=C(N-1,6)+C(r-1,5) by edge concentration",
            "path lower bounds for f0..f4",
            "exact global maximum f5/f6 from the independently audited forest-order catalog",
        ],
        "rows": rows,
        "open_subboxes": [list(row) for row in open_subboxes],
        "open_cells": [list(row) for row in open_cells],
        "hashes": hashes,
        "proof_boundary": (
            "Only branches with zero negative Bernstein controls receive producer "
            "credit; independent replay is required. Listed open branches are "
            "method obstructions, not counterexamples. Masks2/3, other roots/ranks, "
            "arbitrary-leaf induction, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(rows), "SUBBOXES", subboxes, "OPEN", len(open_subboxes))
    if open_subboxes:
        print("OPEN_SUBBOXES", open_subboxes)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
