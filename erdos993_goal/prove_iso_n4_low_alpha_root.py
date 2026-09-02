#!/usr/bin/env python3
"""Exact direct N_4 theorem for the finite alpha(W)<=5 layers.

For a marked forest (B;u,v), put W=B-{u,v}.  Bipartiteness gives
|W|<=2 alpha(W), so alpha(W)<=5 forces |B|<=12.  This verifier generates
every unlabeled forest through order twelve, checks every marked pair in the
four nontrivial layers alpha(W)=2,3,4,5, and cross-checks the closed N_4
formula against the doubled bivariate nested kernel.

This is a finite-layer theorem, not an all-order proof of N_4.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from verify_iso_compact_ordinary_allrank_split_counterexample_root import (
    graph6,
    nested2,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_low_alpha_exact_root_20260829.json"
RANK = 4
TARGETS = (2, 3, 4, 5)
EXPECTED_FOREST_COUNTS = {
    2: 2,
    3: 3,
    4: 6,
    5: 10,
    6: 20,
    7: 37,
    8: 76,
    9: 153,
    10: 329,
    11: 710,
    12: 1601,
}


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    length = max(len(left), len(right))
    row = tuple(
        (left[index] if index < len(left) else 0)
        + (right[index] if index < len(right) else 0)
        for index in range(length)
    )
    while len(row) > 1 and row[-1] == 0:
        row = row[:-1]
    return row


def shift(row: tuple[int, ...]) -> tuple[int, ...]:
    return (0, *row)


def unlabeled_forests(order: int):
    """One representative per forest type, via component multisets."""
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            tree_types.append((size, tree.copy()))

    out = []

    def extend(remaining: int, start: int, chosen: list[int]) -> None:
        if remaining == 0:
            out.append(
                nx.disjoint_union_all([tree_types[index][1] for index in chosen])
            )
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            extend(remaining - size, index, [*chosen, index])

    extend(order, 0, [])
    return out


def polynomial_engine(graph: nx.Graph):
    order = len(graph)
    neighbor_masks = tuple(
        sum(1 << x for x in graph.neighbors(vertex)) for vertex in range(order)
    )

    @lru_cache(maxsize=None)
    def polynomial(remaining: int) -> tuple[int, ...]:
        if remaining == 0:
            return (1,)
        vertex_bit = remaining & -remaining
        vertex = vertex_bit.bit_length() - 1
        without = remaining ^ vertex_bit
        return add(
            polynomial(without),
            shift(polynomial(without & ~neighbor_masks[vertex])),
        )

    return polynomial, (1 << order) - 1


def rows(polynomial, full_mask: int, u: int, v: int):
    return (
        polynomial(full_mask),
        polynomial(full_mask ^ (1 << u)),
        polynomial(full_mask ^ (1 << v)),
        polynomial(full_mask ^ (1 << u) ^ (1 << v)),
    )


def bucket() -> dict[str, object]:
    return {"checks": 0, "negative": 0, "zero": 0, "minimum": None}


def update(target: dict[str, object], value: int, witness: dict[str, object]) -> None:
    target["checks"] += 1
    target["negative"] += int(value < 0)
    target["zero"] += int(value == 0)
    if target["minimum"] is None or value < target["minimum"]["value"]:
        target["minimum"] = {"value": value, **witness}


def main() -> None:
    by_alpha = {str(alpha): bucket() for alpha in TARGETS}
    totals = {
        "forest_types": 0,
        "marked_pairs": 0,
        "closed_formula_cross_checks": 0,
    }
    by_order = {}

    for order in range(2, 13):
        forests = unlabeled_forests(order)
        assert len(forests) == EXPECTED_FOREST_COUNTS[order]
        local = {"forest_types": len(forests), "marked_pairs": 0}
        for forest in forests:
            polynomial, full_mask = polynomial_engine(forest)
            for u, v in itertools.combinations(range(order), 2):
                four = rows(polynomial, full_mask, u, v)
                alpha_w = len(four[3]) - 1
                if alpha_w not in TARGETS:
                    continue
                assert order - 2 <= 2 * alpha_w
                vector = four_minor_vector(forest, u, v)
                value = vector[RANK] if RANK < len(vector) else 0
                doubled = nested2(four, RANK, RANK)
                assert doubled == 2 * value
                witness = {
                    "B_order": order,
                    "B_graph6": graph6(forest),
                    "B_edges": list(forest.edges()),
                    "u": u,
                    "v": v,
                    "alpha_W": alpha_w,
                    "N4": value,
                    "doubled_diagonal": doubled,
                }
                update(by_alpha[str(alpha_w)], value, witness)
                assert value >= 0
                local["marked_pairs"] += 1
                totals["marked_pairs"] += 1
                totals["closed_formula_cross_checks"] += 1
            polynomial.cache_clear()
        totals["forest_types"] += len(forests)
        by_order[str(order)] = local

    assert totals["forest_types"] == sum(EXPECTED_FOREST_COUNTS.values())
    assert all(by_alpha[str(alpha)]["checks"] > 0 for alpha in TARGETS)
    assert all(by_alpha[str(alpha)]["negative"] == 0 for alpha in TARGETS)

    report = {
        "marker": "PASS_EXACT_ALL_FOREST_ISO_N4_ALPHA_W_2_TO_5",
        "theorem": (
            "For every marked forest (B;u,v) with "
            "2<=alpha(B-{u,v})<=5, N_4(B;u,v)>=0."
        ),
        "finite_reduction": {
            "bipartite_bound": "|W|<=2 alpha(W)",
            "marked_core_bound": "|B|=|W|+2<=12",
            "generation": (
                "Every unlabeled forest through order twelve is generated as "
                "a multiset of nonisomorphic tree components."
            ),
            "minor_engine": "Exact memoized independent-set leaf recurrence",
        },
        "totals": totals,
        "by_order": by_order,
        "by_alpha_W": by_alpha,
        "normalization_check": "nested2(rows,4,4)=2*N4 in every cell",
        "scope": (
            "Complete finite theorem for alpha(W)=2,3,4,5 only.  It does not "
            "prove N4 for alpha(W)>=6, FML at any new rank, forest ISO, or "
            "Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(json.dumps({key: value for key, value in report.items() if key != "by_order"}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
