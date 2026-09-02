#!/usr/bin/env python3
"""Exact bipartite/triangle-free obstruction to a universal N_4 theorem.

For K_{a,b}, mark two vertices in the a-side.  The four independence rows
are explicit binomial sums.  This verifier scans 2<=a<=60, 1<=b<=60,
proves that K_{10,26} is the first negative member by total order in this
family, and independently recomputes its four rows by an induced-mask DP.

The graph is not a forest, so this does not obstruct the forest theorem.
"""

from __future__ import annotations

from functools import lru_cache
from math import comb
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import graph6
from verify_iso_n4_simplicial_decomposition_root import direct_n4


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_complete_bipartite_counterexample_exact_root_20260829.json"
A_MAX = 60
B_MAX = 60
WITNESS_A = 10
WITNESS_B = 26


def bipartite_row(a: int, b: int) -> tuple[int, ...]:
    """I(K_{a,b}); a nonempty independent set lies in exactly one side."""
    return tuple(
        1 if rank == 0 else comb(a, rank) + comb(b, rank)
        for rank in range(max(a, b) + 1)
    )


def family_value(a: int, b: int) -> int:
    E = bipartite_row(a, b)
    U = bipartite_row(a - 1, b)
    W = bipartite_row(a - 2, b)
    return direct_n4((E, U, U, W))


def polynomial_engine(graph: nx.Graph):
    order = len(graph)
    adjacency = tuple(
        sum(1 << neighbor for neighbor in graph.neighbors(vertex))
        for vertex in range(order)
    )

    def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
        return tuple(
            (left[k] if k < len(left) else 0)
            + (right[k] if k < len(right) else 0)
            for k in range(max(len(left), len(right)))
        )

    @lru_cache(maxsize=None)
    def polynomial(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1,)
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        excluded = polynomial(mask ^ bit)
        included = (0, *polynomial((mask ^ bit) & ~adjacency[vertex]))
        return add(excluded, included)

    return polynomial


def family_scan() -> dict[str, object]:
    cells = negatives = 0
    first_total = None
    first_rows = []
    minimum = None
    for a in range(2, A_MAX + 1):
        for b in range(1, B_MAX + 1):
            value = family_value(a, b)
            cells += 1
            witness = {"a": a, "b": b, "order": a + b, "N4": value}
            if minimum is None or value < minimum["N4"]:
                minimum = witness
            if value < 0:
                negatives += 1
                if first_total is None or a + b < first_total:
                    first_total = a + b
                    first_rows = [witness]
                elif a + b == first_total:
                    first_rows.append(witness)
    assert cells == 59 * 60
    assert first_total == 36
    assert first_rows == [{"a": 10, "b": 26, "order": 36, "N4": -36102}]
    return {
        "parameter_box": {"a": [2, A_MAX], "b": [1, B_MAX]},
        "cells": cells,
        "negative": negatives,
        "first_negative_total_order": first_total,
        "first_negative_rows": first_rows,
        "minimum_in_box": minimum,
    }


def witness_replay() -> dict[str, object]:
    a, b = WITNESS_A, WITNESS_B
    graph = nx.complete_bipartite_graph(a, b)
    u, v = 0, 1
    assert nx.is_connected(graph)
    assert nx.is_bipartite(graph)
    assert sum(nx.triangles(graph).values()) == 0
    assert not nx.is_forest(graph)

    polynomial = polynomial_engine(graph)
    full_mask = (1 << len(graph)) - 1
    rows = tuple(
        polynomial(full_mask & ~deleted)
        for deleted in (0, 1 << u, 1 << v, (1 << u) | (1 << v))
    )
    expected = (
        bipartite_row(a, b),
        bipartite_row(a - 1, b),
        bipartite_row(a - 1, b),
        bipartite_row(a - 2, b),
    )
    assert rows == expected
    value = direct_n4(rows)
    assert value == family_value(a, b) == -36102
    polynomial.cache_clear()
    return {
        "graph": f"K_{{{a},{b}}}",
        "order": len(graph),
        "edges": graph.number_of_edges(),
        "graph6": graph6(graph),
        "marks": [u, v],
        "mark_location": "both in the side of size 10",
        "classes": ["connected", "bipartite", "triangle-free", "nonforest"],
        "alpha_W": b,
        "N4": value,
        "row_formula": {
            "E": "I(K_10,26)",
            "U=V": "I(K_9,26)",
            "W": "I(K_8,26)",
            "I(K_a,b)_k_for_k_positive": "binom(a,k)+binom(b,k)",
        },
        "independent_cross_check": "induced-mask independence-polynomial DP",
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_ISO_N4_COMPLETE_BIPARTITE_COUNTEREXAMPLE",
        "family_scan": family_scan(),
        "witness": witness_replay(),
        "conclusion": (
            "N4>=0 is false for arbitrary graphs, triangle-free graphs, "
            "bipartite graphs, and arbitrary independence complexes."
        ),
        "remaining_scope": (
            "The witness contains many 4-cycles and is not a forest.  It "
            "does not refute all-forest N4, forest ISO, or Erdos Problem 993."
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
