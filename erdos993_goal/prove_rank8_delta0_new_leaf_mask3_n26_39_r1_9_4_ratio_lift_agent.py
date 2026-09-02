#!/usr/bin/env python3
"""Deletion-ratio refinement of four open finite low-r mask-3 cells."""

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
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_ratio_lift_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_r1_9_agent.py":
        "A3B4DE472F60284DE15FF2F56BDA50AE614A310CF3DDC4769305740EA8C4A89A",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json":
        "275EB56A82B6CD020C8D79E64415E21BE970BD883EB23A7CCF658A6363A262BB",
    "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json":
        "5BA9C59574724EDE6DE9954DF675BD8F4EB23404A6E3CA884B14F457260884FA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ratio_cap(m: int) -> Fraction:
    return {17: Fraction(11, 7), 18: Fraction(132, 91), 19: Fraction(858, 637)}[m]


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
    t0, t1 = Fraction(6, m - 5), ratio_cap(m)
    assert t0 <= t1
    tden = math.lcm(t0.denominator, t1.denominator)
    lo = t0.numerator * (tden // t0.denominator)
    hi = t1.numerator * (tden // t1.denominator)
    tnum = lo + (hi - lo) * T
    znum, zden = ynum * tden, yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, {"gap": gap, "d6_upper": cap, "t_lower": str(t0), "t_upper_lifted": str(t1)}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = json.loads((HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_exact_agent_20260823.json").read_text(encoding="utf-8"))
    cells = [tuple(row) for row in prior["open_cells"]]
    assert cells == [(26, 7, 19), (26, 8, 18), (26, 9, 17), (27, 9, 18)]
    base = base_polynomial()
    rows = []
    for N, r, m in cells:
        cleared, metadata = clear_cell(base, N, r)
        result = common.sign(cleared)
        rows.append({"N": N, "r": r, "m": m, "status": "SEALED" if result["negative"] == 0 else "OPEN_RATIO_LIFT_BERNSTEIN_METHOD", "bernstein": result, "metadata": metadata})
    open_cells = [(row["N"], row["r"], row["m"]) for row in rows if row["status"] != "SEALED"]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-r1-9-4-ratio-lift-v1",
        "status": "PASS_EXACT_MASK3_N26_39_R1_9_ALL_4_RATIO_LIFT" if not open_cells else "PASS_EXACT_PARTIAL_MASK3_R1_9_4_RATIO_LIFT_WITH_OPEN",
        "ratio_ladder": [
            "order16: 12 f6 >= 7 f5",
            "order17 by deletion averaging: f5/f6<=11/7",
            "order18 by deletion averaging: f5/f6<=132/91",
            "order19 by deletion averaging: f5/f6<=858/637",
        ],
        "rows": rows,
        "open_cells": [list(cell) for cell in open_cells],
        "counts": {"cells": 4, "sealed": 4 - len(open_cells), "open": len(open_cells)},
        "hashes": hashes,
        "proof_boundary": "Only these four rows plus independent replay are in scope; the 126-cell low-r assembler is separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 4 SEALED", 4 - len(open_cells), "OPEN", len(open_cells))
    if open_cells:
        print("OPEN_CELLS", open_cells)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
