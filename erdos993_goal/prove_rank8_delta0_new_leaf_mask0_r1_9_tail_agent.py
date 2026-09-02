#!/usr/bin/env python3
"""Exact Bernstein seal of mask 0 for N>=40 and 1<=r<=9."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent as quantitative
from analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_r1_9_tail_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_zero_gap_box():
    base = base_polynomial()
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    dden = N**2 - 15 * N + 10
    xden = (N - 5) * dden
    xnum = 6 * dden + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for offset in range(6):
        n6 *= N - offset
    yden = xden * n6
    ynum = xnum * n6
    fden = m**2 - 15 * m + 10
    tden = (m - 5) * fden
    tnum = 6 * fden + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum
    cleared = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        cleared += term
    return cleared


def fixed_r_tail_rows(bernstein, r_values):
    ring = next(iter(bernstein.values())).context()
    _, B = ring.gens()
    rows = []
    for r in r_values:
        minima = []
        total_terms = 0
        for index, coefficient in sorted(bernstein.items()):
            translated = coefficient.compose(40 + B, ring.constant(r))
            values = [int(value) for value in translated.to_dict().values()]
            assert values and all(value >= 0 for value in values), (r, index)
            minima.append(min(values))
            total_terms += len(values)
        rows.append(
            {
                "r": r,
                "m_lower_bound": 40 - r,
                "bernstein_coefficients": len(bernstein),
                "translated_terms": total_terms,
                "minimum_translated_power_coefficient": str(min(minima)),
                "status": "PASS",
            }
        )
    return rows


def main() -> None:
    zero_cleared = build_zero_gap_box()
    zero_ring, zero_power = quantitative.power_coefficients(zero_cleared)
    zero_bernstein = quantitative.bernstein_coefficients(zero_ring, zero_power)
    quant_cleared, _ = quantitative.build_cleared_box()
    quant_ring, quant_power = quantitative.power_coefficients(quant_cleared)
    quant_bernstein = quantitative.bernstein_coefficients(quant_ring, quant_power)
    assert len(zero_bernstein) == len(quant_bernstein) == 125

    rows = fixed_r_tail_rows(zero_bernstein, range(1, 5))
    rows += fixed_r_tail_rows(quant_bernstein, range(5, 10))
    assert [row["r"] for row in rows] == list(range(1, 10))
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-r1-9-tail-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N40_R1_9_TAIL",
        "scope": "N=|D|>=40, 1<=r=deg_A(v)<=9, m=N-r>=31, selected-lower c8/d7 mask0",
        "boxes": {
            "r_1_to_4": "use only containment 0<=f5/d6<=d5/d6 (zero gap relaxation)",
            "r_5_to_9": "use the quantitative distinguished-root gap G",
            "common": [
                "6/(N-5)<=d5/d6<=6N/(N^2-15N+10)",
                "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
            ],
        },
        "rows": rows,
        "counts": {"r_values": 9, "bernstein_checks": 9 * 125},
        "sparse_sha256": {
            "zero_gap_bernstein": quantitative.sparse_sha256(sorted(zero_bernstein.items())),
            "quantitative_gap_bernstein": quantitative.sparse_sha256(
                sorted(quant_bernstein.items())
            ),
        },
        "source_sha256": {
            "prove_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py": sha256(
                HERE / "prove_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py"
            ),
        },
        "proof_boundary": (
            "This seals only mask0 for N>=40 and r<=9.  The m<=15 tail, "
            "the 19 finite diagonal cells, masks1..3, q=v, Delta1..3, "
            "connected Q8, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("R_VALUES 9 BERNSTEIN_CHECKS 1125")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
