#!/usr/bin/env python3
"""Exact fixed-degree Bernstein partition for the mask-1 low-r tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent as middle
from analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_r1_9_tail_exact_agent_20260823.json"


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
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        cleared += term
    return cleared


def fixed_r_rows(bernstein, r_values, box_name):
    ring = next(iter(bernstein.values())).context()
    _, B = ring.gens()
    rows = []
    for r_value in r_values:
        open_indices = []
        minimum = None
        terms = 0
        for index, polynomial in sorted(bernstein.items()):
            translated = polynomial.compose(40 + B, ring.constant(r_value))
            values = [int(value) for value in translated.to_dict().values()]
            terms += len(values)
            if values:
                minimum = min(values) if minimum is None else min(minimum, min(values))
            if not values or any(value < 0 for value in values):
                open_indices.append(list(index))
        rows.append(
            {
                "r": r_value,
                "box": box_name,
                "status": "SEALED" if not open_indices else "OPEN_BERNSTEIN_METHOD",
                "controls": len(bernstein),
                "translated_terms": terms,
                "minimum_translated_power_coefficient": str(minimum),
                "open_indices": open_indices,
            }
        )
    return rows


def main() -> None:
    zero = build_zero_gap_box()
    zero_ring, zero_power = middle.split_power(zero)
    zero_degrees, _, zero_bernstein = middle.bernstein_blocks(zero_ring, zero_power)
    quantitative = middle.build_cleared_box()
    quant_ring, quant_power = middle.split_power(quantitative)
    quant_degrees, _, quant_bernstein = middle.bernstein_blocks(quant_ring, quant_power)
    assert zero_degrees == quant_degrees == (5, 5, 4)
    assert len(zero_bernstein) == len(quant_bernstein) == 180
    rows = fixed_r_rows(zero_bernstein, range(1, 5), "zero_gap")
    rows += fixed_r_rows(quant_bernstein, range(5, 10), "distinguished_root_gap")
    open_rows = [row for row in rows if row["status"] != "SEALED"]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-r1-9-tail-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N40_R1_9_TAIL"
            if not open_rows
            else "OPEN_EXACT_BERNSTEIN_METHOD_MASK1_N40_R1_9_TAIL_NO_SIGN_CLAIM"
        ),
        "scope": "N>=40,1<=r<=9,m=N-r; mask1 selected-lower d7/Q7-upper c8",
        "boxes": {
            "r_1_to_4": "0<=f5/d6<=d5/d6",
            "r_5_to_9": "0<=f5/d6<=d5/d6-G/binom(N,6)",
            "common": [
                "6/(N-5)<=d5/d6<=6N/(N^2-15N+10)",
                "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
            ],
        },
        "box_degrees": [5, 5, 4],
        "rows": rows,
        "open_rows": open_rows,
        "sparse_sha256": {
            "zero_gap_bernstein": middle.sparse_sha256(sorted(zero_bernstein.items())),
            "quantitative_gap_bernstein": middle.sparse_sha256(
                sorted(quant_bernstein.items())
            ),
        },
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py"
            ),
            "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": sha256(
                HERE / "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py"
            ),
        },
        "proof_boundary": (
            "Only rows marked SEALED receive producer credit; independent replay "
            "is still required. N=26..39, m<=15 at N>=40, masks2/3, other "
            "roots/ranks, arbitrary-leaf induction, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROWS", len(rows), "OPEN", len(open_rows))
    if open_rows:
        print("OPEN_R", [row["r"] for row in open_rows])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
