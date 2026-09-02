#!/usr/bin/env python3
"""Classify ordinary FML at r=5 on the alpha(W)=5 layer.

For alpha(W)=5, bipartiteness bounds |W| by ten and the support-deleted
core D by twelve vertices.  Every forest core, marked pair, and acyclic
support attachment is generated exactly.  The full coupled gap, not either
source subsplit, is the theorem target.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from prove_iso_compact_ordinary_r5_alpha4_root import (
    add_rows,
    four_rows,
    graph6,
    nested2,
    polynomial_table,
    rcoefficient,
    shifted_add_rows,
    unlabeled_forests,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_r5_alpha5_exact_root_20260829.json"
RANK = 5
TARGET_ALPHA = 5


def bucket() -> dict:
    return {"minimum": None, "zero": 0, "negative": 0}


def update(target: dict, value: int, witness: dict) -> None:
    if value == 0:
        target["zero"] += 1
    if value < 0:
        target["negative"] += 1
    if target["minimum"] is None or value < target["minimum"]["value"]:
        target["minimum"] = {"value": value, **witness}


def main() -> None:
    expected_forest_counts = {
        2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37,
        8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
    }
    stats = {name: bucket() for name in ("A", "B", "isolate", "cross", "full_gap")}
    totals = {"D_forests": 0, "marked_cores": 0, "reconstructed_cells": 0}
    by_order = {}

    for order in range(2, 13):
        forests = unlabeled_forests(order)
        assert len(forests) == expected_forest_counts[order]
        local = {"D_forests": len(forests), "marked_cores": 0, "reconstructed_cells": 0}

        for D in forests:
            table = polynomial_table(D)
            vertices = tuple(range(order))
            component_masks = [
                sum(1 << vertex for vertex in component)
                for component in nx.connected_components(D)
            ]
            valid_support_masks = [
                mask
                for mask in range(1 << order)
                if all((mask & component).bit_count() <= 1 for component in component_masks)
            ]

            for u, v in itertools.combinations(vertices, 2):
                C = four_rows(table, 0, u, v)
                if len(C[3]) - 1 != TARGET_ALPHA:
                    continue
                assert order - 2 <= 2 * TARGET_ALPHA
                local["marked_cores"] += 1

                for support_mask in valid_support_masks:
                    H = four_rows(table, support_mask, u, v)
                    S = add_rows(C, H)
                    adjacent = 2 * nested2(C, 4, 5)
                    nested_polar = (
                        nested2(S, 4, 4)
                        - nested2(H, 4, 4)
                        - nested2(C, 4, 4)
                    )
                    A_piece = adjacent + nested_polar
                    B_piece = 2 * (
                        rcoefficient(S, 4, 4)
                        - rcoefficient(H, 4, 4)
                        - rcoefficient(S, 3, 5)
                        + rcoefficient(H, 3, 5)
                    )
                    full_gap = A_piece + B_piece
                    curvature_C = 2 * (
                        rcoefficient(C, 4, 4) - rcoefficient(C, 3, 5)
                    )
                    isolate = adjacent + curvature_C
                    cross = full_gap - isolate

                    deleted_rows = shifted_add_rows(C, H)
                    full_rows = shifted_add_rows(deleted_rows, C)
                    direct_gap = (
                        nested2(full_rows, RANK, RANK)
                        - nested2(deleted_rows, RANK, RANK)
                        - nested2(C, RANK - 1, RANK - 1)
                    )
                    assert direct_gap == full_gap

                    values = {
                        "A": A_piece,
                        "B": B_piece,
                        "isolate": isolate,
                        "cross": cross,
                        "full_gap": full_gap,
                    }
                    witness = {
                        "D_order": order,
                        "D_graph6": graph6(D),
                        "D_edges": list(D.edges()),
                        "u": u,
                        "v": v,
                        "support_neighbors": [
                            vertex for vertex in vertices if support_mask >> vertex & 1
                        ],
                        "values": values,
                    }
                    for name, value in values.items():
                        update(stats[name], value, witness)
                    assert full_gap >= 0
                    local["reconstructed_cells"] += 1

        by_order[str(order)] = local
        for name in totals:
            totals[name] += local[name]

    # Freeze the complete classification.  These guards make a future replay
    # fail closed if forest generation, marked-core coverage, or the support
    # attachment universe is accidentally reduced.
    assert totals == {
        "D_forests": 2947,
        "marked_cores": 21158,
        "reconstructed_cells": 749890,
    }
    assert {
        order: (
            values["D_forests"],
            values["marked_cores"],
            values["reconstructed_cells"],
        )
        for order, values in by_order.items()
    } == {
        "2": (2, 0, 0),
        "3": (3, 0, 0),
        "4": (6, 0, 0),
        "5": (10, 0, 0),
        "6": (20, 0, 0),
        "7": (37, 90, 5528),
        "8": (76, 697, 29299),
        "9": (153, 2743, 103284),
        "10": (329, 6316, 227125),
        "11": (710, 7505, 255414),
        "12": (1601, 3807, 129240),
    }
    assert {
        name: (
            entry["minimum"]["value"],
            entry["zero"],
            entry["negative"],
        )
        for name, entry in stats.items()
    } == {
        "A": (3380, 0, 0),
        "B": (252, 0, 0),
        "isolate": (2562, 0, 0),
        "cross": (-2008, 122, 2212),
        "full_gap": (3650, 0, 0),
    }

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_R5_ALPHA5",
        "normalization": "All displayed gaps are in doubled diagonal units.",
        "theorem": (
            "For every ordinary unmarked leaf cell in a marked forest, if "
            "r=5 and alpha(W)=5, then the coupled FML gap is nonnegative."
        ),
        "rank_position": "r=5=alpha(W)",
        "finite_reduction": {
            "forest_bound": "|W|<=2 alpha(W)=10 by bipartiteness",
            "core_bound": "D=W plus the two marks, so |D|<=12",
            "forest_generation": "Unique multisets of nonisomorphic tree components",
            "minor_engine": "Exact memoized bitmask leaf recurrence on every induced subgraph",
        },
        "exhaustive_classification": {
            **totals,
            "by_D_order": by_order,
            "enumeration": (
                "Every unlabeled D forest through order twelve, every marked "
                "pair with alpha(W)=5, and every acyclic support-neighbor set."
            ),
        },
        "component_statistics": stats,
        "scope_boundary": (
            "This covers only ordinary r=5 cells with alpha(W)=5. It does "
            "not cover alpha(W)>=6, isolate/collision, higher ranks, full "
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
