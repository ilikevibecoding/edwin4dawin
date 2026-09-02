#!/usr/bin/env python3
"""Search the exact D/F order split cutoff for low Delta1 mask-3 orders."""

from __future__ import annotations

import contextlib
import io
import json
from pathlib import Path

import probe_rank8_delta1_mask3_low_order_F_split_path_floor_root as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta1_mask3_F_split_path_floor_cutoff_search_probe_root_20260825.json"
ORDERS = tuple(range(52, 25, -1))


def main() -> None:
    cached_endpoint = probe.corner.new_leaf_corner(1, 3)
    probe.corner.new_leaf_corner = lambda rank, mask: cached_endpoint
    order_rows = []
    for order in ORDERS:
        center = 7 * order // 10
        candidates = sorted(
            range(max(17, center - 20), min(order - 1, center + 12) + 1),
            key=lambda value: (abs(value - center), value),
        )
        trials = []
        first_pass = None
        for cutoff in candidates:
            probe.N_VALUE = order
            probe.SMALL_F_MAX_ORDER = cutoff
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    probe.main()
                report = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
            except AssertionError as error:
                trials.append(
                    {
                        "small_F_max_order": cutoff,
                        "status": "INVALID_BOUND_CONFIGURATION",
                        "error": str(error),
                    }
                )
                continue
            negative = sum(row["negative"] for row in report["rows"])
            negative_vertices = sum(row["negative_vertices"] for row in report["rows"])
            trial = {
                "small_F_max_order": cutoff,
                "status": "PASS" if negative == 0 else "FAIL",
                "negative": negative,
                "negative_vertices": negative_vertices,
                "regions": len(report["rows"]),
            }
            trials.append(trial)
            print(
                "N", order, "M0", cutoff, "NEG", negative,
                "VERTEX_NEG", negative_vertices, flush=True,
            )
            if negative == 0:
                first_pass = cutoff
                break
        order_rows.append(
            {
                "D_order": order,
                "first_passing_small_F_max_order": first_pass,
                "trials": trials,
            }
        )
    payload = {
        "schema": "rank8-delta1-mask3-F-split-path-floor-cutoff-search-probe-v1",
        "status": "DIAGNOSTIC_NO_THEOREM_CLAIM",
        "orders": list(ORDERS),
        "results": order_rows,
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()


