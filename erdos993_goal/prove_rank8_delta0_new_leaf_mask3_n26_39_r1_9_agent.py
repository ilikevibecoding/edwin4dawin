#!/usr/bin/env python3
"""Exact finite Bernstein registry for 126 mask-3 low-r cells."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask3_13_middle_residual_agent as common
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json"
EXPECTED = {
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py":
        "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def clear_cell(base, N: int, r: int):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    X, V, T = ring.gens()
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    cap = common.choose(N - 1, 6) + common.choose(r - 1, 5)
    gap = common.gap(N, r)
    yden = xden * cap
    ynum = xnum * cap - gap * xden
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
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, {
        "gap": gap,
        "d6_edge_concentration_upper": cap,
        "t_lower": str(t0),
        "t_upper": str(t1),
    }


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    base = base_polynomial()
    rows = []
    for N in range(26, 40):
        for r in range(1, 10):
            cleared, metadata = clear_cell(base, N, r)
            result = common.sign(cleared)
            rows.append(
                {
                    "N": N,
                    "r": r,
                    "m": N - r,
                    "status": "SEALED" if result["negative"] == 0 else "OPEN_BERNSTEIN_METHOD",
                    "bernstein": result,
                    "metadata": metadata,
                }
            )
    assert len(rows) == 126
    open_cells = [(row["N"], row["r"], row["m"]) for row in rows if row["status"] != "SEALED"]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-r1-9-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N26_39_R1_9_ALL_126"
            if not open_cells
            else "PASS_EXACT_PARTIAL_MASK3_N26_39_R1_9_WITH_OPEN_NO_FULL_CREDIT"
        ),
        "scope": "26<=N<=39,1<=r<=9,m=N-r>=17; Delta0/new-leaf/mask3.",
        "exact_inputs": [
            "d5-f5>=sum_j C(m-j+1,j)C(r-j,5-j)",
            "d6<=C(N-1,6)+C(r-1,5) by edge concentration",
            "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
        ],
        "rows": rows,
        "open_cells": [list(cell) for cell in open_cells],
        "counts": {"cells": 126, "sealed": 126 - len(open_cells), "open": len(open_cells)},
        "hashes": hashes,
        "proof_boundary": (
            "Only zero-negative rows plus independent replay receive credit. This "
            "does not cover the small-m wing, tails, other masks, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 126 SEALED", 126 - len(open_cells), "OPEN", len(open_cells))
    if open_cells:
        print("OPEN_CELLS", open_cells)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
