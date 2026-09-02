#!/usr/bin/env python3
"""Prove the coupled ordinary FML gap on the rank-five top collar.

At r=5=alpha(W)+2, alpha(W)=3.  Bipartiteness gives |W|<=6, hence the
support-deleted core D has at most eight vertices after restoring the two
marks.  Every such forest core, marked pair, and acyclic support attachment
is classified exactly.  Unlike r=4, the separate R-Schur piece can be
negative; only the coupled gap is used for the theorem.
"""

from __future__ import annotations

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
OUTPUT = HERE / "iso_compact_ordinary_top_collar_r5_exact_root_20260829.json"
RANK = 5


def shift(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *row)


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    length = max(len(left), len(right))
    return tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(length)
    )


def shifted_add_rows(left, right):
    return tuple(add(a, shift(b)) for a, b in zip(left, right))


def unlabeled_forests(order: int):
    """One representative per forest isomorphism type by component multisets."""
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
    """Literal independent-subset enumeration for every deletion mask."""
    order = len(graph)
    edges = tuple(graph.edges())
    table = {}
    for deleted in range(1 << order):
        row = [0] * (order + 1)
        for chosen in range(1 << order):
            if chosen & deleted:
                continue
            if any(chosen >> u & 1 and chosen >> v & 1 for u, v in edges):
                continue
            row[chosen.bit_count()] += 1
        while len(row) > 1 and row[-1] == 0:
            row.pop()
        table[deleted] = tuple(row)
    return table


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
    expected_forest_counts = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76}
    stats = {name: bucket() for name in ("A", "B", "isolate", "cross", "full_gap")}
    totals = {"D_forests": 0, "marked_cores": 0, "reconstructed_cells": 0}
    by_order = {}

    for order in range(2, 9):
        forests = unlabeled_forests(order)
        assert len(forests) == expected_forest_counts[order]
        local = {
            "D_forests": len(forests),
            "marked_cores": 0,
            "reconstructed_cells": 0,
        }
        for D in forests:
            table = polynomial_table(D)
            vertices = tuple(range(order))
            component_masks = []
            for component in nx.connected_components(D):
                mask = sum(1 << vertex for vertex in component)
                component_masks.append(mask)
            valid_support_masks = [
                mask
                for mask in range(1 << order)
                if all((mask & component).bit_count() <= 1 for component in component_masks)
            ]

            for u, v in itertools.combinations(vertices, 2):
                C = four_rows(table, 0, u, v)
                alpha_W = len(C[3]) - 1
                if alpha_W != 3:
                    continue
                assert order - 2 <= 6
                local["marked_cores"] += 1

                for support_mask in valid_support_masks:
                    H = four_rows(table, support_mask, u, v)
                    S = add_rows(C, H)
                    adjacent = 2 * nested2(C, RANK - 1, RANK)
                    nested_polar = (
                        nested2(S, RANK - 1, RANK - 1)
                        - nested2(H, RANK - 1, RANK - 1)
                        - nested2(C, RANK - 1, RANK - 1)
                    )
                    A_piece = adjacent + nested_polar
                    B_piece = 2 * (
                        rcoefficient(S, RANK - 1, RANK - 1)
                        - rcoefficient(H, RANK - 1, RANK - 1)
                        - rcoefficient(S, RANK - 2, RANK)
                        + rcoefficient(H, RANK - 2, RANK)
                    )
                    full_gap = A_piece + B_piece

                    curvature_C = 2 * (
                        rcoefficient(C, RANK - 1, RANK - 1)
                        - rcoefficient(C, RANK - 2, RANK)
                    )
                    isolate = adjacent + curvature_C
                    cross = full_gap - isolate

                    # Check the original FML difference directly from
                    # A=C+XH and Full=A+XC, without relying on the split.
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
                    support_neighbors = [
                        vertex
                        for vertex in vertices
                        if support_mask >> vertex & 1
                    ]
                    witness = {
                        "D_order": order,
                        "D_graph6": graph6(D),
                        "D_edges": list(D.edges()),
                        "u": u,
                        "v": v,
                        "support_neighbors": support_neighbors,
                        "values": values,
                    }
                    for name, value in values.items():
                        update(stats[name], value, witness)
                    assert A_piece >= 0
                    assert isolate >= 0
                    assert cross >= 0
                    assert full_gap >= 0
                    local["reconstructed_cells"] += 1

        by_order[str(order)] = local
        for name in totals:
            totals[name] += local[name]

    assert totals == {
        "D_forests": 154,
        "marked_cores": 722,
        "reconstructed_cells": 12955,
    }
    expected_minima = {
        "A": 104,
        "B": -4,
        "isolate": 50,
        "cross": 0,
        "full_gap": 108,
    }
    assert {name: item["minimum"]["value"] for name, item in stats.items()} == expected_minima
    assert stats["B"]["negative"] == 8
    assert all(stats[name]["negative"] == 0 for name in ("A", "isolate", "cross", "full_gap"))

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISO_COMPACT_ORDINARY_TOP_COLLAR_R5",
        "normalization": "All displayed gaps are in doubled diagonal units.",
        "theorem": (
            "For every ordinary unmarked leaf cell in a marked forest, if "
            "r=5=alpha(W)+2, then the coupled compact gap G_5=A_5+B_5 is "
            "at least 108, hence positive."
        ),
        "finite_reduction": {
            "top_collar": "r=5=alpha(W)+2 implies alpha(W)=3",
            "forest_bound": "|W|<=2 alpha(W)=6 by bipartiteness",
            "core_bound": "D=W plus the two marks, so |D|<=8",
            "forest_generation": (
                "Every forest is a unique multiset of unlabeled tree "
                "components; all such multisets through order eight are generated."
            ),
            "support_reconstruction": (
                "The support-neighbor set contains at most one vertex from "
                "each D component, exactly the condition that adjoining the "
                "support and its leaf preserves acyclicity."
            ),
        },
        "exhaustive_classification": {
            **totals,
            "by_D_order": by_order,
            "enumeration": (
                "Every unlabeled D forest through order eight, every marked "
                "pair with alpha(W)=3, and every acyclic support-neighbor set. "
                "All minor polynomials are obtained by literal subset enumeration."
            ),
        },
        "component_statistics": stats,
        "compensation_observed_exactly": (
            "The separate B piece is negative in 8 cells, with minimum -4, "
            "while A is at least 104 and the coupled gap is at least 108."
        ),
        "important_scope_boundary": (
            "This is an all-forest theorem for the single boundary layer "
            "r=5=alpha(W)+2. It does not cover rank five when alpha(W)>=4, "
            "any rank r>=6, or the full conjecture."
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
