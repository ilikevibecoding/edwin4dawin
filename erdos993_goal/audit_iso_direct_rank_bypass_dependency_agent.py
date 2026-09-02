#!/usr/bin/env python3
"""Audit whether direct Q_4/Q_5/Q_6 theorems truncate Q-D-N-FML recursion.

They do not truncate the current nonnegative-term proof skeleton.  This file
checks the exact two-leaf identity on literal forests, freezes the dependency
DAG for a target Q_6 cell, and tests the most immediate attempted coupling of
the direct Q_5 lower term with the adjacent D_5 term.

Scope: dependency audit only.  It proves no new positivity theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import graph6, iso, poly_forest


def at(values: list[int], index: int) -> int:
    return values[index] if 0 <= index < len(values) else 0


def leaf_remainder(graph: nx.Graph, leaf: int, rank: int) -> int:
    support = next(iter(graph.neighbors(leaf)))
    deleted = graph.copy()
    deleted.remove_node(leaf)
    linked = graph.copy()
    linked.remove_nodes_from((leaf, support))
    return (
        iso(poly_forest(graph), rank)
        - iso(poly_forest(deleted), rank)
        - iso(poly_forest(linked), rank - 1)
    )


def two_leaf_cell(
    graph: nx.Graph, first: int, second: int, rank: int
) -> dict[str, int]:
    u = next(iter(graph.neighbors(first)))
    v = next(iter(graph.neighbors(second)))
    assert u != v and first != v and second != u

    base = graph.copy()
    base.remove_nodes_from((first, second))
    same = graph.copy()
    same.remove_node(second)
    lower = graph.copy()
    lower.remove_nodes_from((second, v))
    nested = at(four_minor_vector(base, u, v), rank)

    full_d = leaf_remainder(graph, first, rank)
    same_d = leaf_remainder(same, first, rank)
    lower_d = leaf_remainder(lower, first, rank - 1)
    assert full_d == same_d + lower_d + nested

    # In the first Q_r leaf identity, the lower Q_(r-1) graph is obtained by
    # deleting first and its support.  It is not the graph carrying lower_d.
    q_lower_graph = graph.copy()
    q_lower_graph.remove_nodes_from((first, u))
    q_lower = iso(poly_forest(q_lower_graph), rank - 1)
    immediate_coupling = q_lower + lower_d
    return {
        "D_r": full_d,
        "same_rank_D_r": same_d,
        "lower_D_rminus1": lower_d,
        "N_r": nested,
        "Q_rminus1_other_orientation": q_lower,
        "immediate_Q_plus_D_coupling": immediate_coupling,
    }


def literal_identity_census(max_order: int = 11) -> dict[str, object]:
    checks = 0
    minimum_coupling = None
    negative_couplings = 0
    for order in range(4, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            leaves = [vertex for vertex in tree if tree.degree(vertex) == 1]
            for first, second in itertools.permutations(leaves, 2):
                u = next(iter(tree.neighbors(first)))
                v = next(iter(tree.neighbors(second)))
                if u == v:
                    continue
                for rank in range(3, len(poly_forest(tree)) + 2):
                    cell = two_leaf_cell(tree, first, second, rank)
                    value = cell["immediate_Q_plus_D_coupling"]
                    witness = {
                        "value": value,
                        "order": order,
                        "rank": rank,
                        "first_leaf": first,
                        "second_leaf": second,
                        "graph6": graph6(tree),
                        **cell,
                    }
                    if minimum_coupling is None or value < minimum_coupling["value"]:
                        minimum_coupling = witness
                    if value < 0:
                        negative_couplings += 1
                    checks += 1
    return {
        "tree_orders": [4, max_order],
        "exact_two_leaf_identity_checks": checks,
        "immediate_coupling_negative_count": negative_couplings,
        "immediate_coupling_minimum": minimum_coupling,
        "scope": (
            "finite diagnostic for the simplest Q_(r-1)+D_(r-1) coupling; "
            "regardless of its sign, no all-forest coupling theorem is supplied"
        ),
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_DIRECT_Q456_DO_NOT_TRUNCATE_STANDARD_DN_DEPENDENCY",
        "status": "dependency theorem only; no positivity conclusion",
        "exact_identities": {
            "Q_leaf": "Q_r(F)=Q_r(F-a)+Q_(r-1)(F-{a,u})+D_r(F,a)",
            "D_two_leaf": (
                "D_r(F,a)=D_r(F-b,a)+D_(r-1)(F-{b,v},a)+N_r(B;u,v), "
                "B=F-{a,b}"
            ),
            "N_ordinary": (
                "N_r(B)=N_r(B-z)+N_(r-1)(B-{z,s})+G_r(B,z)"
            ),
        },
        "target_Q7_dependency_dag": {
            "Q7": ["Q7(smaller)", "direct Q6", "D7"],
            "D7": ["D7(smaller)", "D6", "N7"],
            "N7": ["N7(smaller)", "N6", "FML gap at rank 7"],
            "Q6": ["Q6(smaller)", "direct Q5", "D6"],
            "D6": ["D6(smaller)", "D5", "N6"],
            "N6": ["N6(smaller)", "N5", "FML gap at rank 6"],
            "D5": ["D5(smaller)", "D4", "N5"],
            "N5": ["N5(smaller)", "N4", "FML gap at rank 5"],
            "D4": ["D4(smaller)", "D3", "N4"],
            "N4": ["N4(smaller)", "N3", "FML gap at rank 4"],
        },
        "orientation_obstruction": (
            "The direct Q_(r-1) term is on F-{a,u}, whereas the lower "
            "D_(r-1) term is on F-{b,v} with leaf a.  They are opposite "
            "marked orientations, so the existing Q theorem does not absorb "
            "the D term by the leaf identity."
        ),
        "logical_boundary": (
            "Direct Q4,Q5,Q6 prove those target ranks but do not assert "
            "D4,D5,D6,N4,N5,or N6.  Under the current termwise-nonnegative "
            "recurrences, proving Q7 still requires the internal rank-four "
            "through rank-six auxiliaries and hence FML beginning at rank 4.  A "
            "new proved cross-rank coupling could change this; none is part "
            "of the current skeleton."
        ),
        "finite_identity_and_coupling_census": literal_identity_census(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
