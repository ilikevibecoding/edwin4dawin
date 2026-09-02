#!/usr/bin/env python3
"""Assemble the live rooted-C7 middle residual after the 2026-08-20 advances."""

from __future__ import annotations

from collections import Counter
import hashlib
import json
from pathlib import Path

import probe_rank7_rooted_c7_degree_partition_cone as cone


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_rooted_c7_middle_residual_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    old_path = HERE / "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json"
    n23_path = HERE / "rank7_rooted_cross_order23_exact_20260820.json"
    n24_path = HERE / "rank7_rooted_cross_order24_exact_20260820.json"
    b25_path = HERE / "rank7_rooted_c7_b2_5_subdivision_exact_20260820.json"
    degree_path = HERE / "rank7_rooted_c7_degree_partition_reduction_exact_20260820.json"
    prerequisites = {
        path.name: json.loads(path.read_text(encoding="utf-8"))
        for path in (old_path, n23_path, n24_path, b25_path, degree_path)
    }
    assert prerequisites[n23_path.name]["status"].startswith("PASS")
    assert prerequisites[n24_path.name]["status"].startswith("PASS")
    assert prerequisites[b25_path.name]["status"] == "PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_B2_5_ORDERS_23_THROUGH_26"

    old = prerequisites[old_path.name]
    cells = []
    shifted_b2_5_levels = 0
    for cell in old["residual"]["cells"]:
        if cell["order"] < 25:
            continue
        copied = dict(cell)
        if copied["order"] in (25, 26) and copied["B2_min"] == 5:
            copied["B2_min"] = 6
            copied["integer_levels"] -= 1
            shifted_b2_5_levels += 1
        cells.append(copied)
    assert len(cells) == 69
    assert shifted_b2_5_levels == 8
    integer_levels = sum(cell["integer_levels"] for cell in cells)
    assert integer_levels == 16_282

    lookup = {
        (cell["order"], cell["root_degree"]): (cell["B2_min"], cell["B2_max"])
        for cell in cells
    }
    total_profiles = passed_profiles = 0
    residual = []
    histogram: Counter[int] = Counter()
    by_order = []
    for n in range(25, 39):
        order_total = order_passed = order_remaining = 0
        partitions = list(cone.parts(n - 2))
        for (order, root_degree), (lower, upper) in lookup.items():
            if order != n:
                continue
            for partition in partitions:
                b2 = cone.stats(partition)[0]
                if not lower <= b2 <= upper or not cone.root_degree_possible(n, root_degree, partition):
                    continue
                total_profiles += 1
                order_total += 1
                value = cone.scalar(n, root_degree, partition)
                if value > 0:
                    passed_profiles += 1
                    order_passed += 1
                else:
                    item = (n, root_degree, partition)
                    residual.append(item)
                    histogram[b2] += 1
                    order_remaining += 1
        by_order.append({
            "order": n,
            "coarse_residual_partition_profiles": order_total,
            "certified_by_degree_partition_scalar": order_passed,
            "remaining_partition_profiles": order_remaining,
        })
    assert total_profiles == 210_654
    assert passed_profiles == 110_455
    assert len(residual) == 100_199
    assert (min(histogram), max(histogram)) == (5, 196)
    canonical = json.dumps(residual, separators=(",", ":"))
    digest = hashlib.sha256(canonical.encode("ascii")).hexdigest().upper()

    report = {
        "status": "PASS_EXACT_ROOTED_C7_MIDDLE_RESIDUAL_AFTER_ORDER24_AND_B2_5_N26",
        "proved": [
            "all rooted trees through order 24",
            "all rooted trees of order at least 39",
            "all B2<=4 trees in the middle band",
            "all B2=5 trees through order 26",
            "all degree-partition profiles certified by the 2026-08-20 scalar",
        ],
        "live_coarse_cut": {
            "orders": "25 through 38",
            "order_root_degree_cells": len(cells),
            "integer_order_root_degree_B2_levels": integer_levels,
            "cells": cells,
        },
        "live_degree_partition_cut": {
            "coarse_residual_partition_profiles": total_profiles,
            "certified_by_degree_partition_scalar": passed_profiles,
            "remaining_partition_profiles": len(residual),
            "remaining_B2_min": min(histogram),
            "remaining_B2_max": max(histogram),
            "canonical_encoding": "JSON tuples [n,root_degree,[positive excess parts descending]]",
            "canonical_remaining_sha256": digest,
            "by_order": by_order,
            "B2_histogram": {str(k): histogram[k] for k in sorted(histogram)},
        },
        "prerequisite_hashes": {
            path.name: sha256(path)
            for path in (old_path, n23_path, n24_path, b25_path, degree_path)
        },
        "scope_warning": (
            "The 100,199 remaining degree-partition/root profiles require literal "
            "root-neighborhood placement coupling. This is not a universal C7 proof."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"coarse levels={integer_levels}; partition profiles={len(residual)}")
    print(f"residual digest={digest}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
