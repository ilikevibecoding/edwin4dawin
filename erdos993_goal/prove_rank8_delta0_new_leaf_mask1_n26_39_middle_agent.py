#!/usr/bin/env python3
"""Exact finite Bernstein registry for mask-1 middle cells, N=26..39."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent as middle


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_n26_39_middle_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    cleared = middle.build_cleared_box()
    ring, power = middle.split_power(cleared)
    degrees, lcms, controls = middle.bernstein_blocks(ring, power)
    assert degrees == (5, 5, 4)
    assert len(controls) == 180
    rows = []
    for N in range(26, 40):
        for r in range(10, N - 15):
            m = N - r
            values = [(index, int(polynomial(N, r))) for index, polynomial in controls.items()]
            negative = [list(index) for index, value in values if value < 0]
            rows.append(
                {
                    "N": N,
                    "r": r,
                    "m": m,
                    "status": "SEALED" if not negative else "OPEN_BERNSTEIN_METHOD",
                    "minimum_control": str(min(value for _, value in values)),
                    "negative_indices": negative,
                }
            )
    assert len(rows) == sum(range(1, 15)) == 105
    open_cells = [
        {"N": row["N"], "r": row["r"], "m": row["m"], "negative_indices": row["negative_indices"]}
        for row in rows
        if row["status"] != "SEALED"
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-n26-39-middle-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N26_39_MIDDLE"
            if not open_cells
            else "PASS_EXACT_PARTIAL_MASK1_N26_39_MIDDLE_WITH_OPEN_NO_FULL_CREDIT"
        ),
        "scope": (
            "26<=N<=39, r>=10, m=N-r>=16; mask1 selected-lower d7/Q7-upper c8"
        ),
        "box": [
            "6/(N-5)<=d5/d6<=6N/(N^2-15N+10)",
            "0<=f5/d6<=d5/d6-G/binom(N,6)",
            "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
        ],
        "box_degrees": [int(value) for value in degrees],
        "bernstein_lcms": lcms,
        "controls_per_cell": len(controls),
        "rows": rows,
        "open_cells": open_cells,
        "bernstein_sha256": middle.sparse_sha256(sorted(controls.items())),
        "counts": {"cells": len(rows), "sealed": len(rows) - len(open_cells), "open": len(open_cells)},
        "source_sha256": {
            "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": sha256(
                HERE / "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py"
            )
        },
        "proof_boundary": (
            "Only finite cells marked SEALED have producer credit and require "
            "independent replay. The finite low-r and small-m blocks, masks2/3, "
            "other roots/ranks, arbitrary-leaf induction, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(rows), "SEALED", len(rows) - len(open_cells), "OPEN", len(open_cells))
    if open_cells:
        print("OPEN_CELLS", [(row["N"], row["r"], row["m"]) for row in open_cells])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
