#!/usr/bin/env python3
"""Refine nine mask-3 residual cells by lifted order-16 ratio bounds."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask3_13_middle_residual_agent as first
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_9_ratio_lift_residual_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_13_middle_residual_agent.py": "1484464582B475072E126563CDF9A31E274A03E39609E0F11E6C1FE1337C6246",
    "rank8_delta0_new_leaf_mask3_13_middle_residual_exact_agent_20260823.json": "881507ADD1A7A96E95C8D24A0D1C6E7092E567F8C27AB8A84082F6F34F862957",
    "rank8_forest16_f5_f6_ratio_exact_agent_20260823.json": "91E071946534CA6AF36ED4F121639F895F2A9E3F3D405E048EB64858D692D196",
    "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json": "5BA9C59574724EDE6DE9954DF675BD8F4EB23404A6E3CA884B14F457260884FA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ratio_cap(m: int) -> Fraction:
    return {16: Fraction(12, 7), 17: Fraction(11, 7), 18: Fraction(132, 91)}[m]


def clear_cell(base, N: int, r: int):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    X, V, T = ring.gens()
    selected = N * N - 15 * N + 10
    xden, xnum = (N - 5) * selected, 6 * selected + 60 * (N - 1) * X
    cap = first.choose(N - 1, 6) + first.choose(r - 1, 5)
    yden, ynum = xden * cap, xnum * cap - first.gap(N, r) * xden
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
    return answer, {"d6_edge_concentration_upper": cap, "gap": first.gap(N, r), "t_lower": str(t0), "t_upper_lifted": str(t1)}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = json.loads((HERE / "rank8_delta0_new_leaf_mask3_13_middle_residual_exact_agent_20260823.json").read_text(encoding="utf-8"))
    cells = [tuple(row) for row in prior["open_cells"]]
    assert len(cells) == 9
    base = base_polynomial()
    rows = []
    for N, r, m in cells:
        cleared, metadata = clear_cell(base, N, r)
        result = first.sign(cleared)
        rows.append({"N": N, "r": r, "m": m, "status": "SEALED" if result["negative"] == 0 else "OPEN_LIFTED_RATIO_BERNSTEIN_METHOD", "bernstein": result, "metadata": metadata})
    open_cells = [(row["N"], row["r"], row["m"]) for row in rows if row["status"] != "SEALED"]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-9-ratio-lift-residual-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_ALL_9_RATIO_LIFT_RESIDUAL" if not open_cells else "PASS_EXACT_PARTIAL_MASK3_9_RATIO_LIFT_RESIDUAL_WITH_OPEN",
        "ratio_lift": [
            "order16: 12 f6 >= 7 f5",
            "sum over v in an order17 forest: 12(17-6)f6 >= 7(17-5)f5, hence f5/f6<=11/7",
            "sum 11 f6>=7 f5 over deletions of an order18 forest: 11(18-6)f6 >= 7(18-5)f5, hence f5/f6<=132/91",
            "identity sum_v i_k(F-v)=(m-k)i_k(F)",
        ],
        "rows": rows, "open_cells": [list(cell) for cell in open_cells],
        "counts": {"total": len(rows), "sealed": len(rows)-len(open_cells), "open": len(open_cells)},
        "hashes": hashes,
        "proof_boundary": "Only zero-negative rows plus independent replay receive credit; mask3 remains incomplete while any row is open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTAL", len(rows), "SEALED", len(rows)-len(open_cells), "OPEN", len(open_cells))
    if open_cells:
        print("OPEN_CELLS", open_cells)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
