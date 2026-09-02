#!/usr/bin/env python3
"""Prove ordinary FML at r=5 on the alpha(W)=4 collar layer.

For alpha(W)=4, bipartiteness bounds |W| by eight and the support-deleted
core D by ten vertices.  All forest cores, marks, and acyclic support
attachments are therefore exactly classifiable.  This is the layer one
rank below the top collar: r=5=alpha(W)+1.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from verify_iso_compact_ordinary_allrank_split_counterexample_root import (
    add_rows,
    graph6,
    nested2,
    rcoefficient,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_r5_alpha4_exact_root_20260829.json"
RANK = 5
TARGET_ALPHA = 4


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    length = max(len(left), len(right))
    row = [
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(length)
    ]
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return tuple(row)


def shift(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *row)


def shifted_add_rows(left, right):
    return tuple(add(a, shift(b)) for a, b in zip(left, right))


def unlabeled_forests(order: int):
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else list(nx.nonisomorphic_trees(size))
        for tree in trees:
            tree_types.append((size, tree.copy()))
    out = []

    def extend(remaining: int, start: int, chosen: list[int]) -> None:
        if remaining == 0:
            out.append(nx.disjoint_union_all([tree_types[index][1] for index in chosen]))
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            extend(remaining - size, index, [*chosen, index])

    extend(order, 0, [])
    return out


def polynomial_table(graph: nx.Graph):
    """Exact bitmask leaf recurrence for every induced subgraph."""
    order = len(graph)
    neighbor_masks = []
    for vertex in range(order):
        neighbor_masks.append(sum(1 << x for x in graph.neighbors(vertex)))

    @lru_cache(maxsize=None)
    def polynomial(remaining: int) -> tuple[int, ...]:
        if remaining == 0:
            return (1,)
        vertex_bit = remaining & -remaining
        vertex = vertex_bit.bit_length() - 1
        without_vertex = remaining ^ vertex_bit
        without_closed_neighborhood = without_vertex & ~neighbor_masks[vertex]
        return add(
            polynomial(without_vertex),
            shift(polynomial(without_closed_neighborhood)),
        )

    all_vertices = (1 << order) - 1
    return {
        deleted: polynomial(all_vertices ^ deleted)
        for deleted in range(1 << order)
    }


def four_rows(table, base: int, u: int, v: int):
    return (
        table[base],
        table[base | 1 << u],
        table[base | 1 << v],
        table[base | 1 << u | 1 << v],
    )


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
    expected_forest_counts = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76, 9: 153, 10: 329}
    stats = {name: bucket() for name in ("A", "B", "isolate", "cross", "full_gap")}
    totals = {"D_forests": 0, "marked_cores": 0, "reconstructed_cells": 0}
    by_order = {}

    for order in range(2, 11):
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
                        nested2(S, 4, 4) - nested2(H, 4, 4) - nested2(C, 4, 4)
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
                        nested2(full_rows, 5, 5)
                        - nested2(deleted_rows, 5, 5)
                        - nested2(C, 4, 4)
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
                    assert A_piece >= 0
                    assert B_piece >= 0
                    assert isolate >= 0
                    assert full_gap >= 0
                    local["reconstructed_cells"] += 1

        by_order[str(order)] = local
        for name in totals:
            totals[name] += local[name]

    assert totals == {
        "D_forests": 636,
        "marked_cores": 3888,
        "reconstructed_cells": 102347,
    }
    expected_minima = {
        "A": 744,
        "B": 32,
        "isolate": 548,
        "cross": -488,
        "full_gap": 784,
    }
    assert {name: item["minimum"]["value"] for name, item in stats.items()} == expected_minima
    assert stats["cross"]["negative"] == 802
    assert all(stats[name]["negative"] == 0 for name in ("A", "B", "isolate", "full_gap"))

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_R5_ALPHA4",
        "normalization": "All displayed gaps are in doubled diagonal units.",
        "theorem": (
            "For every ordinary unmarked leaf cell in a marked forest, if "
            "r=5 and alpha(W)=4, then G_5=A_5+B_5>=784>0."
        ),
        "rank_position": "r=5=alpha(W)+1, one rank below the top collar",
        "finite_reduction": {
            "forest_bound": "|W|<=2 alpha(W)=8 by bipartiteness",
            "core_bound": "D=W plus the two marks, so |D|<=10",
            "forest_generation": "Unique multisets of nonisomorphic tree components",
            "minor_engine": "Exact memoized bitmask leaf recurrence on every induced subgraph",
        },
        "exhaustive_classification": {
            **totals,
            "by_D_order": by_order,
            "enumeration": (
                "Every unlabeled D forest through order ten, every marked pair "
                "with alpha(W)=4, and every acyclic support-neighbor set."
            ),
        },
        "component_statistics": stats,
        "subsplit_warning": (
            "The source-paired X-cross term is negative in 802 cells, minimum "
            "-488, although the isolate reserve and full gap stay positive."
        ),
        "important_scope_boundary": (
            "This closes only ordinary r=5 cells with alpha(W)=4. Together "
            "with the top-collar alpha(W)=3 theorem it leaves alpha(W)>=5, "
            "other FML modes, higher ranks, and the full conjecture open."
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
