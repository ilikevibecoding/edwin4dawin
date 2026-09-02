#!/usr/bin/env python3
"""Exact finite Bernstein registry for 105 mask-3 middle cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent as generic
import probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent as middle


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_middle_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    cleared = middle.build_cleared_box()
    ring, power = generic.split_power(cleared)
    degrees, lcms, controls = generic.bernstein_blocks(ring, power)
    assert degrees == (8, 5, 4) and len(controls) == 270
    rows = []
    for N in range(26, 40):
        for r in range(10, N - 15):
            values = [(index, int(polynomial(N, r))) for index, polynomial in controls.items()]
            negative = [list(index) for index, value in values if value < 0]
            rows.append({"N": N, "r": r, "m": N-r, "status": "SEALED" if not negative else "OPEN_BERNSTEIN_METHOD", "minimum_control": str(min(value for _, value in values)), "negative_indices": negative})
    assert len(rows) == 105
    open_cells = [{"N": row["N"], "r": row["r"], "m": row["m"], "negative_indices": row["negative_indices"]} for row in rows if row["status"] != "SEALED"]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-middle-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N26_39_MIDDLE" if not open_cells else "PASS_EXACT_PARTIAL_MASK3_N26_39_MIDDLE_WITH_OPEN_NO_FULL_CREDIT",
        "scope": "26<=N<=39,r>=10,m=N-r>=16; mask3 Q7-upper c8/Q6-upper d7",
        "box_degrees": [int(value) for value in degrees], "bernstein_lcms": lcms,
        "controls_per_cell": len(controls), "rows": rows, "open_cells": open_cells,
        "bernstein_sha256": generic.sparse_sha256(sorted(controls.items())),
        "counts": {"cells": len(rows), "sealed": len(rows)-len(open_cells), "open": len(open_cells)},
        "source_sha256": {"probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py": sha256(HERE / "probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py")},
        "proof_boundary": "Only SEALED cells plus independent replay receive credit; global theorem remains open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", len(rows), "SEALED", len(rows)-len(open_cells), "OPEN", len(open_cells))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
