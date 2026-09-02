#!/usr/bin/env python3
"""Exact fixed-complement-order Bernstein partition for mask 2, m<=15."""

from __future__ import annotations

import gc
import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent as generic
from analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_m0_15_tail_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_box(base, m_value: int, positive_f6: bool):
    names = ["N", "X", "V", "T"] if positive_f6 else ["N", "X", "V"]
    ring = fmpz_mpoly_ctx.get(names)
    variables = ring.gens()
    N, X, V = variables[:3]
    T = variables[3] if positive_f6 else None
    r = N - m_value
    selected = N**2 - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    d6cap = generic.d6_upper720(N, m_value, ring)
    yden = xden * d6cap
    ynum = xnum * d6cap - generic.gap720(r, m_value, ring) * xden
    if positive_f6:
        tden = ring.constant(m_value - 5)
        tnum = ring.constant(6) + (
            generic.safe_comb(m_value, 5) * (m_value - 5) - 6
        ) * T
        znum = ynum * tden
        zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if not positive_f6 and zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (5 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        if positive_f6:
            term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def branch(base, m: int, positive_f6: bool):
    cleared = build_box(base, m, positive_f6)
    ring, power = generic.split_power(cleared)
    degrees, controls = generic.bernstein(ring, power)
    N = ring.gen(0)
    tail_start = None
    tail_minimum = None
    for candidate in range(40, 161):
        rows = [
            [int(value) for value in polynomial.compose(candidate + N).to_dict().values()]
            for polynomial in controls.values()
        ]
        if all(values and all(value >= 0 for value in values) for values in rows):
            tail_start = candidate
            tail_minimum = min(min(values) for values in rows)
            break
    finite = []
    if tail_start is not None:
        for N_value in range(40, tail_start):
            negative = [
                list(index)
                for index, polynomial in sorted(controls.items())
                if int(polynomial(N_value)) < 0
            ]
            finite.append(
                {"N": N_value, "status": "SEALED" if not negative else "OPEN_BERNSTEIN_METHOD", "negative_indices": negative}
            )
    return {
        "branch": "f6_positive" if positive_f6 else "f6_zero",
        "degrees": [int(value) for value in degrees],
        "controls": len(controls),
        "tail_start": tail_start,
        "tail_minimum_translated_coefficient": str(tail_minimum) if tail_minimum is not None else None,
        "finite_below_tail": finite,
        "open_finite": [row["N"] for row in finite if row["status"] != "SEALED"],
        "bernstein_sha256": generic.sparse_sha256(sorted(controls.items())),
    }


def main() -> None:
    base = base_polynomial()
    rows = []
    for m in range(16):
        branches = [branch(base, m, False)]
        if m >= 6:
            branches.append(branch(base, m, True))
        rows.append({"m": m, "branches": branches})
        gc.collect()
    open_cells = [
        {"m": row["m"], "branch": item["branch"], "N": N}
        for row in rows for item in row["branches"] for N in item["open_finite"]
    ]
    missing = [
        {"m": row["m"], "branch": item["branch"]}
        for row in rows for item in row["branches"] if item["tail_start"] is None
    ]
    complete = not open_cells and not missing
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-m0-15-tail-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_M0_15_COMPLETE"
            if complete else "PASS_EXACT_PARTIAL_MASK2_M0_15_WITH_OPEN_NO_FULL_CREDIT"
        ),
        "scope": "N>=40,0<=m<=15,r=N-m; mask2 selected-lower c8/Q6-upper d7",
        "inputs": [
            "d5-f5>=G",
            "d6<=C(N,6)-m C(N-2,4)+C(m,2) C(N-3,3)",
            "f6=0 branch sets z=0",
            "f6>0 branch uses 6/(m-5)<=f5/f6<=C(m,5)",
        ],
        "rows": rows,
        "open_cells": open_cells,
        "missing_tails": missing,
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent.py"
            ),
            "prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent.py": sha256(
                HERE / "prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent.py"
            ),
        },
        "proof_boundary": (
            "Only translated tails and explicit SEALED finite rows receive "
            "producer credit; complete credit requires no listed open/missing "
            "row and independent replay. Other pieces, mask3, roots/ranks, Q8, "
            "and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OPEN", len(open_cells), "MISSING_TAILS", len(missing))
    if open_cells:
        print("OPEN_CELLS", open_cells)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
