#!/usr/bin/env python3
"""Exact marked-neighborhood constraints for the rank-six retained-isolate tail.

Let H=F-{u,v}, with m=|H|.  The neighbors of either marked vertex inside H
form independent sets because F is a forest.  If u and v are adjacent, those
two neighbor sets are disjoint and their union is independent.  If u and v
are nonadjacent, their intersection has size c in {0,1}; the graph induced by
their union has at most one edge, and has no edge when c=1.

This module exports the resulting degree-two through degree-four polynomial
inequalities in the W/A/B/Z occupation coordinates and exhaustively replays
them on every nonisomorphic forest of orders 8 through 10.
"""

from __future__ import annotations

from collections import Counter
from math import factorial
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_rank8_forest_root_deletion_attachment_floor_root import (
    nonisomorphic_forests,
    tree_catalog,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_mark_neighborhood_constraints_exact_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_MARK_NEIGHBORHOOD_CONSTRAINTS_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def falling(value: sp.Expr, rank: int) -> sp.Expr:
    answer = sp.Integer(1)
    for offset in range(rank):
        answer *= value - offset
    return sp.expand(answer)


def mark_neighborhood_constraints(
    label: str,
    names: dict[str, sp.Symbol],
    s: sp.Symbol,
) -> tuple[list[tuple[str, sp.Expr]], list[tuple[str, sp.Expr]], list[tuple[str, sp.Expr]]]:
    """Return valid quadratic, cubic, and quartic marked-forest constraints."""
    m = s + 6
    a = names["CA2"]
    b = names["CB2"]
    by_degree: dict[int, list[tuple[str, sp.Expr]]] = {2: [], 3: [], 4: []}

    def add_subset(family: str, size: sp.Expr, rank: int, suffix: str) -> None:
        # CA_{r+1} and CB_{r+1} count r-sets after forcing the
        # corresponding mark; CW_r counts r-sets avoiding both marks.
        index = rank if family == "W" else rank + 1
        expression = sp.expand(
            factorial(rank) * names[f"C{family}{index}"] - falling(size, rank)
        )
        by_degree[rank].append((f"{family}_{suffix}_r{rank}", expression))

    if label.startswith("adjacent"):
        # U=N_H(v), V=N_H(u).  A=H-U contains V and B=H-V contains U.
        # The edge uv forbids U intersect V and forbids every U--V edge.
        union_size = 2 * m - a - b
        for rank in range(2, 5):
            add_subset("W", union_size, rank, "adjacent_neighbor_union")
            add_subset("A", m - b, rank, "contains_V")
            add_subset("B", m - a, rank, "contains_U")
    else:
        z = names["CZ3"]
        c = sp.expand(m - a - b + z)
        union_size = m - z
        for rank in range(2, 5):
            # U and V separately are independent subsets of H.
            add_subset("W", m - a, rank, "contains_U")
            add_subset("W", m - b, rank, "contains_V")

            # H[U union V] has at most one edge, and none if c=1.  The
            # deliberately safe loss C(d,r-2) is valid even when d<r.
            correction = sp.Integer(rank * (rank - 1)) * (1 - c) * falling(
                union_size, rank - 2
            )
            by_degree[rank].append((
                f"W_nonadjacent_neighbor_union_r{rank}",
                sp.expand(
                    factorial(rank) * names[f"CW{rank}"]
                    - falling(union_size, rank)
                    + correction
                ),
            ))

            # A=H-U contains V-U, of size a-z; symmetrically B contains U-V.
            add_subset("A", a - z, rank, "contains_V_minus_U")
            add_subset("B", b - z, rank, "contains_U_minus_V")

    return by_degree[2], by_degree[3], by_degree[4]


def main() -> None:
    s = sp.Symbol("s", nonnegative=True)
    names = {
        name: sp.Symbol(name, integer=True, nonnegative=True)
        for family, indices in (("A", range(2, 6)), ("B", range(2, 6)),
                                ("W", range(2, 5)), ("Z", range(3, 4)))
        for name in (f"C{family}{index}" for index in indices)
    }
    systems = {}
    evaluators = {}
    for geometry in ("adjacent", "nonadjacent"):
        constraints = mark_neighborhood_constraints(geometry, names, s)
        flat = [item for group in constraints for item in group]
        systems[geometry] = {
            "quadratic": len(constraints[0]),
            "cubic": len(constraints[1]),
            "quartic": len(constraints[2]),
            "expressions": {name: str(value) for name, value in flat},
        }
        evaluators[geometry] = [
            (
                name,
                tuple(sorted(value.free_symbols, key=str)),
                sp.lambdify(tuple(sorted(value.free_symbols, key=str)), value, "math"),
            )
            for name, value in flat
        ]

    catalog = tree_catalog(10)
    counts = Counter()
    minima: dict[str, tuple[int, int, str, int, int] | None] = {
        f"{geometry}:{name}": None
        for geometry, group in evaluators.items()
        for name, _, _ in group
    }
    stream = hashlib.sha256()
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                values = {**categories(rows(graph, u, v)), "s": order - 8}
                for name, variables, evaluate in evaluators[geometry]:
                    value = int(evaluate(*(values[str(variable)] for variable in variables)))
                    key = f"{geometry}:{name}"
                    counts[f"{key}:{'negative' if value < 0 else 'nonnegative'}"] += 1
                    record = (value, order, graph6, u, v)
                    if minima[key] is None or record < minima[key]:
                        minima[key] = record
                    stream.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{key}|{value};".encode()
                    )

    negatives = sum(value for key, value in counts.items() if key.endswith(":negative"))
    marker = MARKER if negatives == 0 else "FAIL_EXACT_ISO_N6_BUNDLE_G1_MARK_NEIGHBORHOOD_CONSTRAINTS_ROOT"
    report = {
        "marker": marker,
        "systems": systems,
        "proof": {
            "adjacent": (
                "Neighbor sets U=N_H(v), V=N_H(u) are independent, disjoint, and have no cross edge; "
                "their union is an independent set of size 2m-a-b."
            ),
            "nonadjacent": (
                "U and V are independent, |U intersect V|=c in {0,1}, and two U--V edges or one "
                "such edge with c=1 would create a cycle; hence H[U union V] has at most 1-c edges."
            ),
            "subset_rule": "If a graph contains an independent d-set then i_r is at least C(d,r).",
            "safe_one_edge_rule": (
                "A d-vertex graph with at most one edge has at least C(d,r)-C(d,r-2) independent r-sets; "
                "the correction is suppressed when c=1."
            ),
        },
        "coverage": "Every nonisomorphic forest of orders 8,9,10 and every unordered marked pair.",
        "counts": dict(counts),
        "minima": {key: list(value) for key, value in minima.items()},
        "negative_cells": negatives,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "The displayed combinatorial argument is universal; the finite census is an independent "
            "implementation replay rather than the proof."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "negative_cells": negatives,
        "constraints": {geometry: sum(
            systems[geometry][degree] for degree in ("quadratic", "cubic", "quartic")
        ) for geometry in systems},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
