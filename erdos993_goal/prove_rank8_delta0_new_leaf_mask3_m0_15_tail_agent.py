#!/usr/bin/env python3
"""Exact fixed-complement-order Bernstein partition for mask 3, m<=15."""

from __future__ import annotations

import gc
import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent as generic
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_m0_15_tail_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_box(base, m: int, positive: bool):
    ring = fmpz_mpoly_ctx.get(["N", "X", "V", "T"] if positive else ["N", "X", "V"])
    variables = ring.gens()
    N, X, V = variables[:3]
    T = variables[3] if positive else None
    r = N - m
    selected = N**2 - 15 * N + 10
    xden, xnum = (N - 5) * selected, 6 * selected + 60 * (N - 1) * X
    cap = generic.d6_upper720(N, m, ring)
    yden, ynum = xden * cap, xnum * cap - generic.gap720(r, m, ring) * xden
    if positive:
        tden = ring.constant(m - 5)
        tnum = ring.constant(6) + (generic.safe_comb(m, 5) * (m - 5) - 6) * T
        znum, zden = ynum * tden, yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if not positive and zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        if positive:
            term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def branch(base, m: int, positive: bool):
    cleared = build_box(base, m, positive)
    ring, power = generic.split_power(cleared)
    degrees, controls = generic.bernstein(ring, power)
    N = ring.gen(0)
    start, minimum = None, None
    for candidate in range(40, 161):
        rows = [[int(value) for value in polynomial.compose(candidate + N).to_dict().values()] for polynomial in controls.values()]
        if all(values and all(value >= 0 for value in values) for values in rows):
            start, minimum = candidate, min(min(values) for values in rows)
            break
    finite = []
    if start is not None:
        for n in range(40, start):
            negative = [list(index) for index, polynomial in sorted(controls.items()) if int(polynomial(n)) < 0]
            finite.append({"N": n, "status": "SEALED" if not negative else "OPEN_BERNSTEIN_METHOD", "negative_indices": negative})
    return {"branch": "f6_positive" if positive else "f6_zero", "degrees": [int(value) for value in degrees], "controls": len(controls), "tail_start": start, "tail_minimum_translated_coefficient": str(minimum) if minimum is not None else None, "finite_below_tail": finite, "open_finite": [row["N"] for row in finite if row["status"] != "SEALED"], "bernstein_sha256": generic.sparse_sha256(sorted(controls.items()))}


def main() -> None:
    base = base_polynomial()
    rows = []
    for m in range(16):
        branches = [branch(base, m, False)] + ([branch(base, m, True)] if m >= 6 else [])
        rows.append({"m": m, "branches": branches})
        gc.collect()
    open_cells = [{"m": row["m"], "branch": item["branch"], "N": N} for row in rows for item in row["branches"] for N in item["open_finite"]]
    missing = [{"m": row["m"], "branch": item["branch"]} for row in rows for item in row["branches"] if item["tail_start"] is None]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-m0-15-tail-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_M0_15_COMPLETE" if not open_cells and not missing else "PASS_EXACT_PARTIAL_MASK3_M0_15_WITH_OPEN_NO_FULL_CREDIT",
        "scope": "N>=40,0<=m<=15,r=N-m; mask3 Q7-upper c8/Q6-upper d7",
        "rows": rows, "open_cells": open_cells, "missing_tails": missing,
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py": sha256(HERE / "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py"),
            "prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent.py": sha256(HERE / "prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent.py"),
        },
        "proof_boundary": "Only complete translated tails plus independent replay receive credit; global theorem remains open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OPEN", len(open_cells), "MISSING_TAILS", len(missing))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
