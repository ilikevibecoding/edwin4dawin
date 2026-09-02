#!/usr/bin/env python3
"""Prove isolate and collision FML at r=5 when alpha(W)=4.

Bipartiteness gives |W|<=8 and hence |B|<=10.  Every unlabeled forest B
through order ten, every ordered marked pair with alpha(B-{u,v})=4, and
every eligible isolate or marked-support leaf are checked exactly using a
memoized independent-set recurrence on all induced subgraphs.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

from prove_iso_compact_ordinary_r5_alpha4_root import (
    four_rows,
    graph6,
    nested2,
    polynomial_table,
    unlabeled_forests,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_isolate_collision_r5_alpha4_exact_root_20260829.json"
RANK = 5
TARGET_ALPHA = 4


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["cells"] += 1
    if value == 0:
        bucket["zero"] += 1
    if value < 0:
        bucket["negative"] += 1
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def main() -> None:
    expected_forest_counts = {
        2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
        7: 37, 8: 76, 9: 153, 10: 329,
    }
    stats = {
        "isolate": {"cells": 0, "zero": 0, "negative": 0, "minimum": None},
        "collision": {"cells": 0, "zero": 0, "negative": 0, "minimum": None},
    }
    totals = {
        "B_forests": 0,
        "ordered_marked_pairs": 0,
        "alpha4_marked_pairs": 0,
        "direct_minor_evaluations": 0,
    }
    by_order = {}

    for order in range(2, 11):
        forests = unlabeled_forests(order)
        assert len(forests) == expected_forest_counts[order]
        local = {
            "B_forests": len(forests),
            "ordered_marked_pairs": 0,
            "alpha4_marked_pairs": 0,
            "isolate_cells": 0,
            "collision_cells": 0,
        }
        totals["B_forests"] += len(forests)

        for B in forests:
            table = polynomial_table(B)
            vertices = tuple(range(order))
            for u, v in itertools.permutations(vertices, 2):
                local["ordered_marked_pairs"] += 1
                totals["ordered_marked_pairs"] += 1
                full_rows = four_rows(table, 0, u, v)
                if len(full_rows[3]) - 1 != TARGET_ALPHA:
                    continue
                assert order - 2 <= 2 * TARGET_ALPHA
                local["alpha4_marked_pairs"] += 1
                totals["alpha4_marked_pairs"] += 1
                full_N5 = nested2(full_rows, RANK, RANK)
                totals["direct_minor_evaluations"] += 1

                for z in vertices:
                    if z in (u, v):
                        continue
                    degree = B.degree(z)
                    if degree == 0:
                        deleted_rows = four_rows(table, 1 << z, u, v)
                        deleted_N5 = nested2(deleted_rows, RANK, RANK)
                        lower_N4 = nested2(deleted_rows, RANK - 1, RANK - 1)
                        totals["direct_minor_evaluations"] += 2
                        value = full_N5 - deleted_N5 - lower_N4
                        witness = {
                            "B_order": order,
                            "B_graph6": graph6(B),
                            "B_edges": list(B.edges()),
                            "u": u,
                            "v": v,
                            "z": z,
                            "full_N5": full_N5,
                            "deleted_N5": deleted_N5,
                            "lower_N4": lower_N4,
                        }
                        update(stats["isolate"], value, witness)
                        local["isolate_cells"] += 1
                    elif degree == 1:
                        support = next(iter(B.neighbors(z)))
                        if support not in (u, v):
                            continue
                        deleted_rows = four_rows(table, 1 << z, u, v)
                        deleted_N5 = nested2(deleted_rows, RANK, RANK)
                        totals["direct_minor_evaluations"] += 1
                        value = full_N5 - deleted_N5
                        witness = {
                            "B_order": order,
                            "B_graph6": graph6(B),
                            "B_edges": list(B.edges()),
                            "u": u,
                            "v": v,
                            "z": z,
                            "support": support,
                            "full_N5": full_N5,
                            "deleted_N5": deleted_N5,
                        }
                        update(stats["collision"], value, witness)
                        local["collision_cells"] += 1

        by_order[str(order)] = local

    expected_totals = {
        "B_forests": 636,
        "ordered_marked_pairs": 47330,
        "alpha4_marked_pairs": 7776,
        "direct_minor_evaluations": 15490,
    }
    expected_cells = {"isolate": 2270, "collision": 3174}
    expected_minima = {"isolate": 50, "collision": 118}
    assert totals == expected_totals, (totals, expected_totals)
    assert {name: item["cells"] for name, item in stats.items()} == expected_cells
    assert {name: item["minimum"]["value"] for name, item in stats.items()} == expected_minima
    assert all(item["zero"] == 0 for item in stats.values())
    assert all(item["negative"] == 0 for item in stats.values()), stats

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISO_ISOLATE_COLLISION_R5_ALPHA4",
        "normalization": "All displayed gaps are doubled diagonal coefficients of N.",
        "theorem": (
            "For every isolate or marked-support collision FML cell in a "
            "marked forest, if r=5 and alpha(W)=4, the FML gap is nonnegative."
        ),
        "finite_reduction": {
            "forest_bound": "W is bipartite, so |W|<=2 alpha(W)=8",
            "ambient_bound": "B is W plus the two marks, so |B|<=10",
            "forest_generation": "Every forest through order ten as a multiset of unlabeled tree components",
            "minor_engine": "Exact memoized bitmask leaf recurrence on every induced subgraph",
        },
        "totals": totals,
        "by_order": by_order,
        "gap_statistics": stats,
        "scope_boundary": (
            "This proves only isolate and collision at r=5, alpha(W)=4. It "
            "does not cover alpha(W)>=5, ordinary cells, higher ranks, full "
            "FML, forest ISO, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
