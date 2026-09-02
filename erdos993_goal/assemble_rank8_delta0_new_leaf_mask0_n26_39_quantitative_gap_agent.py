#!/usr/bin/env python3
"""Exact finite registry for mask 0, 26<=N<=39, r>=10, m>=16."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import prove_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent as tail


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_n26_39_quantitative_gap_registry_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py": "72EC9021601A3AA83F72619DB7F101A710CBB3CA2704253D7CBE83C93019B8B8",
    "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_exact_agent_20260823.json": "F819957E6ED732FF5BF1E571C7256D60BF6D9F6AAB493C1C787FABA8F5D745E2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED, (actual_hashes, EXPECTED)
    cleared, _ = tail.build_cleared_box()
    ring, power = tail.power_coefficients(cleared)
    bernstein = tail.bernstein_coefficients(ring, power)
    assert len(bernstein) == 125

    rows = []
    for N in range(26, 40):
        for r in range(10, N - 15):
            values = [int(polynomial(N, r)) for polynomial in bernstein.values()]
            negative_indices = [
                list(index)
                for index, polynomial in sorted(bernstein.items())
                if int(polynomial(N, r)) < 0
            ]
            rows.append(
                {
                    "N": N,
                    "r": r,
                    "m": N - r,
                    "status": "SEALED_MASK0" if not negative_indices else "OPEN_BERNSTEIN_NEGATIVE",
                    "negative": len(negative_indices),
                    "zero": sum(value == 0 for value in values),
                    "positive": sum(value > 0 for value in values),
                    "minimum": str(min(values)),
                    "negative_indices": negative_indices,
                }
            )
    assert len(rows) == sum(N - 25 for N in range(26, 40)) == 105
    sealed = [row for row in rows if row["status"] == "SEALED_MASK0"]
    open_rows = [row for row in rows if row["status"] != "SEALED_MASK0"]
    assert len(sealed) == 86 and len(open_rows) == 19
    assert all(row["negative_indices"] == [[4, 4, 4]] for row in open_rows)
    expected_open = [
        (26, 10), (27, 11), (28, 12), (29, 13), (30, 14),
        (31, 14), (31, 15), (32, 15), (32, 16),
        (33, 16), (33, 17), (34, 17), (34, 18),
        (35, 18), (35, 19), (36, 20), (37, 21),
        (38, 22), (39, 23),
    ]
    assert [(row["N"], row["r"]) for row in open_rows] == expected_open
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-n26-39-quantitative-gap-registry-v1",
        "status": "PASS_EXACT_PARTIAL_MASK0_FINITE_REGISTRY_86_SEALED_19_OPEN",
        "scope": "26<=N<=39, r>=10, m=N-r>=16, selected-lower c8/d7 mask0",
        "counts": {"total": len(rows), "sealed": len(sealed), "open": len(open_rows)},
        "open_cells": expected_open,
        "open_boundary": (
            "Every open cell has exactly one negative Bernstein control, index "
            "[4,4,4], the simultaneous selected/root-gap boundary.  These are "
            "method obstructions, not counterexamples."
        ),
        "rows": rows,
        "sparse_sha256": {
            "bernstein_coefficient_blocks_scaled_by_12_cubed": tail.sparse_sha256(
                sorted(bernstein.items())
            )
        },
        "hashes": actual_hashes,
        "proof_boundary": (
            "Only the 86 SEALED_MASK0 cells receive credit.  The listed 19 cells, "
            "r<=9, m<=15, masks1..3, q=v, Delta1..3, connected Q8, and "
            "Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTAL", len(rows), "SEALED", len(sealed), "OPEN", len(open_rows))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
