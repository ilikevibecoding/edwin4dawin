#!/usr/bin/env python3
"""Exact finite mask-3 registry for 224 cells with 0<=m<=15."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent as generic
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent.py": "75374FA0811C2C97836DBB2C2C23BA378F879F4AC50ADACAFE5A41FDDBC6CCE3",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json": "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json": "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py": "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def common_xy(N: int, r: int, minima: list[int], ring):
    X, V = ring.gens()[:2]
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    cap = generic.choose(N - 1, 6) + generic.choose(r - 1, 5)
    gap = generic.gap(r, minima, 4)
    yden = xden * cap
    ynum = xnum * cap - gap * xden
    return V, xnum, xden, ynum, yden, gap, cap


def clear_zero(base, N: int, r: int, minima: list[int]):
    ring = fmpz_mpoly_ctx.get(["X", "V"])
    V, xnum, xden, ynum, yden, gap, cap = common_xy(N, r, minima, ring)
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        answer += term
    return answer, {"gap": gap, "d6_upper": cap}


def clear_positive(base, N: int, r: int, minima: list[int], t_upper: Fraction):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    _, V, T = ring.gens()
    _, xnum, xden, ynum, yden, gap, cap = common_xy(N, r, minima, ring)
    t0 = Fraction(6, m - 5)
    assert t0 <= t_upper
    tden = math.lcm(t0.denominator, t_upper.denominator)
    lo = t0.numerator * (tden // t0.denominator)
    hi = t_upper.numerator * (tden // t_upper.denominator)
    tnum = lo + (hi - lo) * T
    znum, zden = ynum * tden, yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, {"gap": gap, "d6_upper": cap, "t_lower": str(t0), "t_upper": str(t_upper)}


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
                cleared, metadata = clear_zero(base, N, r, generic.path_minima(m))
                result = generic.sign(cleared)
                branches.append({"branch": "f6_zero", "metadata": metadata, "bernstein": result})
                if result["negative"]:
                    open_subboxes.append((N, m, "f6_zero", result["negative_indices"]))
                subboxes += 1
            if m >= 6:
                t_upper = generic.fraction(global_rows[m]["f6_positive_maximum_f5_over_f6"])
                cleared, metadata = clear_positive(base, N, r, generic.path_minima(m), t_upper)
                result = generic.sign(cleared)
                branches.append({"branch": "f6_positive", "metadata": metadata, "bernstein": result})
                if result["negative"]:
                    open_subboxes.append((N, m, "f6_positive", result["negative_indices"]))
                subboxes += 1
            expected = ["f6_zero"] if m < 6 else (["f6_positive"] if m > 10 else ["f6_zero", "f6_positive"])
            assert [branch["branch"] for branch in branches] == expected
            rows.append({"N": N, "m": m, "r": r, "status": "SEALED" if all(branch["bernstein"]["negative"] == 0 for branch in branches) else "OPEN_GLOBAL_BERNSTEIN_METHOD", "branches": branches})
    assert len(rows) == 224 and subboxes == 294
    open_cells = sorted({(N, m, N - m) for N, m, _, _ in open_subboxes})
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-m0-15-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N26_39_M0_15_ALL_224" if not open_subboxes else "PASS_EXACT_PARTIAL_MASK3_N26_39_M0_15_GLOBAL_BOXES_WITH_OPEN",
        "scope": "26<=N<=39,0<=m<=15,r=N-m; Delta0/new-leaf/mask3.",
        "counts": {"cells": 224, "logical_f6_zero_branches": 154, "logical_f6_positive_branches": 140, "bernstein_subboxes": 294, "open_subboxes": len(open_subboxes), "open_cells": len(open_cells)},
        "rows": rows,
        "open_subboxes": open_subboxes,
        "open_cells": [list(cell) for cell in open_cells],
        "hashes": hashes,
        "proof_boundary": "Only zero-negative branches plus independent replay receive credit. Complete mask3 and Problem 993 remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 224 SUBBOXES 294 OPEN", len(open_subboxes))
    if open_subboxes:
        print("OPEN_SUBBOXES", open_subboxes)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
